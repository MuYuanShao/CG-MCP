package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.spd.mcp.api.auth.AuthContext;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.tenant.TenantContext;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;

/** Supplier-scoped fulfilment of uploaded hospital orders, with immutable retryable draft-receipt delivery. */
@Service
public class HospitalSupplyService {
    private final JdbcTemplate db;private final IntegrationRepository repo;private final TenantContext tenant;private final AuthContext auth;private final Environment env;private final TransactionTemplate tx;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
    public HospitalSupplyService(JdbcTemplate db,IntegrationRepository repo,TenantContext tenant,AuthContext auth,Environment env,PlatformTransactionManager manager){this.db=db;this.repo=repo;this.tenant=tenant;this.auth=auth;this.env=env;tx=new TransactionTemplate(manager);}
    public boolean enabled(){return env.getProperty("APP_PHASE3_ENABLED",Boolean.class,false)&&env.getProperty("APP_PHASE3_SUPPLY_ENABLED",Boolean.class,false);}
    private void requireEnabled(){check(enabled(),"SUPPLY_DISABLED","医院订单供货回传尚未启用");}
    private long t(){return tenant.currentTenantId();}
    private void check(boolean ok,String code,String message){if(!ok)throw new BusinessException(code,message);}
    private void conflict(boolean ok,String code,String message){if(!ok)throw new BusinessException(code,message,HttpStatus.CONFLICT);}
    private String text(JsonNode n,String field,int limit){String value=n.path(field).asText().trim();check(!value.isBlank()&&value.length()<=limit,"FIELD_INVALID","供货字段缺失或过长："+field);return value;}
    private long user(){var current=auth.currentUser().orElseThrow(()->new BusinessException("UNAUTHORIZED","请重新登录",HttpStatus.UNAUTHORIZED));var ids=db.queryForList("SELECT id FROM sys_user WHERE tenant_id=? AND username=? AND deleted=0 AND status=1",Long.class,t(),current.username());check(ids.size()==1,"USER_INVALID","当前账户不可用");return ids.get(0);}
    private boolean manages(){return auth.currentUser().map(u->u.permissions().contains("integration:manage")).orElse(false);}
    private IntegrationTypes.Instance active(String id,boolean lock){requireEnabled();var instance=repo.instance(t(),id,lock);check(instance.enabled(),"INSTANCE_DISABLED","医院实例已停用");return instance;}
    private void scope(StringBuilder sql,List<Object> args,boolean supplierOnly) {
        if(supplierOnly||!manages()){
            sql.append(" AND EXISTS(SELECT 1 FROM spd_phase3_supplier_access access WHERE access.tenant_id=doc.tenant_id AND access.instance_id=doc.instance_id AND access.supplier_code=JSON_UNQUOTE(JSON_EXTRACT(doc.payload,'$.supplierCode')) AND access.user_id=?)");args.add(user());
        }
    }
    private JsonNode order(String instance,String no,boolean supplierOnly) {
        active(instance,false);var args=new ArrayList<Object>(List.of(t(),instance,no));var sql=new StringBuilder("SELECT COALESCE(doc.payload_exact,CAST(doc.payload AS CHAR)) FROM spd_record doc WHERE doc.tenant_id=? AND doc.instance_id=? AND doc.kind='order' AND doc.source_code=?");scope(sql,args,supplierOnly);
        var rows=db.queryForList(sql.toString(),String.class,args.toArray());
        if(rows.size()!=1)throw new BusinessException("ORDER_NOT_FOUND","医院订单不存在或未绑定该供应商",HttpStatus.NOT_FOUND);return repo.parse(rows.get(0));
    }
    public Object orders(String instance,int page,int size,String query) {
        active(instance,false);check(page>0&&size>0&&size<=200,"PAGE_INVALID","分页参数不合法");
        var args=new ArrayList<Object>(List.of(t(),instance));var where=new StringBuilder(" WHERE doc.tenant_id=? AND doc.instance_id=? AND doc.kind='order'");scope(where,args,false);
        if(query!=null&&!query.isBlank()){where.append(" AND doc.source_code LIKE ?");args.add("%"+query.trim()+"%");}
        long total=db.queryForObject("SELECT COUNT(*) FROM spd_record doc"+where,Long.class,args.toArray());args.add(size);args.add((long)(page-1)*size);
        var rows=db.queryForList("SELECT COALESCE(doc.payload_exact,CAST(doc.payload AS CHAR)) FROM spd_record doc"+where+" ORDER BY doc.source_code LIMIT ? OFFSET ?",String.class,args.toArray()).stream().map(repo::parse).toList();
        return Map.of("rows",rows,"total",total,"page",page,"size",size);
    }
    public Object options(String instance,String no) {
        JsonNode order=order(instance,no,true);var target=active(instance,false);return request(target,null,"GET","/supply-options?organization="+encode(target.organization())+"&orderNo="+encode(no)+"&supplierCode="+encode(order.path("supplierCode").asText()),null,Duration.ofSeconds(15));
    }
    public record Draft(String draftId,String instanceId,String orderNo,String supplierCode,String hospital,JsonNode body) {}

    public Object supplyOrders(int page,int size) {
        requireEnabled();
        check(page>0&&size>0&&size<=100,"PAGE_INVALID","分页参数不合法");
        long owner=user();
        String scope = """
            FROM spd_supply_outbox s JOIN spd_instance i ON i.id=s.instance_id AND i.tenant_id=s.tenant_id
            WHERE s.tenant_id=? AND s.user_id=?
              AND EXISTS(SELECT 1 FROM spd_phase3_supplier_access a WHERE a.tenant_id=s.tenant_id AND a.instance_id=s.instance_id AND a.user_id=s.user_id AND a.supplier_code=s.supplier_code)
            """;
        Long total=db.queryForObject("SELECT COUNT(*) "+scope,Long.class,t(),owner);
        var rows=db.queryForList("""
            SELECT s.message_id AS messageId,s.instance_id AS instanceId,s.order_no AS orderNo,
              s.supply_no AS supplyNo,s.supplier_code AS supplierCode,i.name AS hospital,
              s.state,s.message,s.result,s.created_at AS createdAt
            """+scope+" ORDER BY s.created_at DESC,s.message_id DESC LIMIT ? OFFSET ?",t(),owner,size,(long)(page-1)*size);
        rows.forEach(row->{if(row.get("result")!=null)row.put("result",Phase3Json.parse(row.get("result").toString()));});
        return Map.of("rows",rows,"total",total==null?0:total,"page",page,"size",size);
    }

    public List<Draft> drafts() {
        requireEnabled();
        return db.query("""
            SELECT d.draft_id,d.instance_id,d.order_no,d.supplier_code,i.name,d.payload
            FROM spd_supply_draft d JOIN spd_instance i ON i.id=d.instance_id AND i.tenant_id=d.tenant_id AND i.enabled=1
            JOIN spd_record o ON o.tenant_id=d.tenant_id AND o.instance_id=d.instance_id AND o.kind='order' AND o.source_code=d.order_no
            WHERE d.tenant_id=? AND d.user_id=? AND d.supplier_code=JSON_UNQUOTE(JSON_EXTRACT(o.payload,'$.supplierCode'))
              AND EXISTS(SELECT 1 FROM spd_phase3_supplier_access a WHERE a.tenant_id=d.tenant_id AND a.instance_id=d.instance_id AND a.user_id=d.user_id AND a.supplier_code=d.supplier_code)
            ORDER BY d.updated_at DESC,d.draft_id
            """,(rs,n)->new Draft(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),Phase3Json.parse(rs.getString(6))),t(),user());
    }

    @Transactional
    public Draft openDraft(String instance,String no) {
        var target=active(instance,true);
        var order=order(instance,no,true);
        check(Set.of("approved","sent").contains(order.path("status").asText()),"ORDER_STATUS_INVALID","当前医院订单不允许供货");
        String supplier=order.path("supplierCode").asText();
        long owner=user();
        String id=UUID.randomUUID().toString();
        String initial=Phase3Json.json(Map.of("supplyNo","GH-"+id,"warehouseCode","","remark","","items",List.of()));
        db.update("""
            INSERT INTO spd_supply_draft(draft_id,tenant_id,instance_id,order_no,supplier_code,user_id,payload)
            VALUES(?,?,?,?,?,?,CAST(? AS JSON)) ON DUPLICATE KEY UPDATE draft_id=spd_supply_draft.draft_id
            """,id,t(),instance,no,supplier,owner,initial);
        return db.queryForObject("""
            SELECT draft_id,payload FROM spd_supply_draft WHERE tenant_id=? AND instance_id=? AND order_no=? AND supplier_code=? AND user_id=?
            """,(rs,n)->new Draft(rs.getString(1),instance,no,supplier,target.name(),Phase3Json.parse(rs.getString(2))),t(),instance,no,supplier,owner);
    }

    @Transactional
    public Draft saveDraft(String instance,String no,String draftId,JsonNode body) {
        var target=active(instance,true);
        var order=order(instance,no,true);
        check(Set.of("approved","sent").contains(order.path("status").asText()),"ORDER_STATUS_INVALID","当前医院订单不允许供货");
        check(body.path("items").isArray()&&body.path("items").size()<=1000,"ITEMS_INVALID","供货明细最多1000条");
        var draftBody=Phase3Json.MAPPER.createObjectNode();
        copyDraftText(body,draftBody,Map.of("supplyNo",100,"warehouseCode",100,"remark",500));
        var draftLines=draftBody.putArray("items");
        var identities=new HashSet<String>();
        for (var line : body.path("items")) {
            String identity=text(line,"supplyLineId",100);
            check(identities.add(identity),"DUPLICATE_LINE","供货草稿批次身份重复");
            text(line,"orderLineId",19);
            copyDraftText(line,draftLines.addObject(),Map.of("supplyLineId",100,"orderLineId",19,
                "productCode",100,"unit",20,"quantity",14,"productionBatchNo",100,
                "productionDate",10,"expireDate",10,"udiCode",120));
        }
        String supplier=order.path("supplierCode").asText();
        int changed=db.update("""
            UPDATE spd_supply_draft SET payload=CAST(? AS JSON)
            WHERE tenant_id=? AND instance_id=? AND order_no=? AND supplier_code=? AND user_id=? AND draft_id=?
            """,Phase3Json.json(draftBody),t(),instance,no,supplier,user(),draftId);
        conflict(changed==1,"DRAFT_CHANGED","供货草稿已提交或不可用，请重新打开");
        return new Draft(draftId,instance,no,supplier,target.name(),draftBody);
    }

    private void copyDraftText(JsonNode source,ObjectNode target,Map<String,Integer> limits) {
        limits.forEach((field,limit)->{
            var value=source.path(field);
            check(value.isTextual()&&value.textValue().length()<=limit,"DRAFT_FIELD_INVALID","草稿字段格式或长度不合法："+field);
            target.put(field,value.textValue());
        });
    }
    @Transactional public Object submit(String instance,String no,String key,JsonNode body) {
        var target=active(instance,true);UUID.fromString(key);JsonNode order=order(instance,no,true);long user=user();
        String hash=Phase3Json.hash(Map.of("orderNo",no,"body",body));var old=db.queryForList("SELECT * FROM spd_supply_outbox WHERE message_id=? FOR UPDATE",key);
        if(!old.isEmpty()) {
            var row=old.get(0);conflict(((Number)row.get("tenant_id")).longValue()==t()&&row.get("instance_id").equals(instance)&&((Number)row.get("user_id")).longValue()==user&&hash.equals(row.get("request_hash")),"IDEMPOTENCY_CONFLICT","供货消息编号已用于不同内容");return Map.of("messageId",key,"state",row.get("state"));
        }
        check(Set.of("approved","sent").contains(order.path("status").asText()),"ORDER_STATUS_INVALID","当前医院订单不允许供货");
        String supplyNo=text(body,"supplyNo",100),warehouse=text(body,"warehouseCode",100),remark=body.path("remark").asText("");check(remark.length()<=500,"FIELD_INVALID","供货备注过长");
        var available=new HashMap<String,JsonNode>();order.path("items").forEach(i->available.put(i.path("lineId").asText(),i));
        check(body.path("items").isArray()&&!body.path("items").isEmpty()&&body.path("items").size()<=1000,"ITEMS_INVALID","需填写1至1000条供货明细");
        ObjectNode wire=Phase3Json.MAPPER.createObjectNode();wire.put("messageId",key);wire.put("schemaVersion","3.0");wire.put("documentType","supply");wire.put("sourceSystem","MCP-UI");wire.put("organization",target.organization());
        var payload=wire.putObject("payload");payload.put("supplyNo",supplyNo);payload.put("orderNo",no);payload.put("supplierCode",order.path("supplierCode").asText());payload.put("warehouseCode",warehouse);payload.put("remark",remark);
        payload.put("externalOperatorId",Long.toString(user));payload.put("externalOperator",auth.currentUser().orElseThrow().username());
        var items=payload.putArray("items");var totals=new HashMap<String,BigDecimal>();var ids=new HashSet<String>();
        for(var line:body.path("items")) {
            String id=text(line,"orderLineId",19),identity=text(line,"supplyLineId",100),qty=text(line,"quantity",14);JsonNode original=available.get(id);
            check(line.path("quantity").isTextual()&&qty.matches("[1-9][0-9]{0,13}")&&ids.add(identity),"QUANTITY_INVALID","供货数量须为正整数，明细身份不能重复");
            check(original!=null&&original.path("productCode").asText().equals(line.path("productCode").asText())&&original.path("unit").asText().equals(line.path("unit").asText()),"LINE_INVALID","来源采购明细、商品或单位不一致");
            check(totals.merge(id,new BigDecimal(qty),BigDecimal::add).compareTo(new BigDecimal(original.path("quantity").asText()))<=0,"QUANTITY_INVALID","供货数量超过来源订单数量");
            var item=items.addObject();item.put("orderLineId",id);item.put("supplyLineId",identity);item.put("productCode",original.path("productCode").asText());item.put("unit",original.path("unit").asText());item.put("quantity",qty);
            for(String field:List.of("productionBatchNo","productionDate","expireDate"))item.put(field,text(line,field,field.endsWith("Date")?10:100));
            String udi=line.path("udiCode").asText("");check(udi.length()<=120,"FIELD_INVALID","UDI最多120字符");item.put("udiCode",udi);
            try {LocalDate production=LocalDate.parse(item.path("productionDate").asText()),expiry=LocalDate.parse(item.path("expireDate").asText());check(!production.isAfter(LocalDate.now())&&!expiry.isBefore(LocalDate.now())&&!production.isAfter(expiry),"DATE_INVALID","生产日期或有效期不合法");}
            catch(java.time.DateTimeException error){throw new BusinessException("DATE_INVALID","日期格式不合法");}
        }
        String json=Phase3Json.json(wire);check(json.getBytes(StandardCharsets.UTF_8).length<=2*1024*1024,"BODY_TOO_LARGE","供货消息超过2MB");
        conflict(db.queryForList("SELECT message_id FROM spd_supply_outbox WHERE tenant_id=? AND instance_id=? AND order_no=? AND supplier_code=? AND active_supply_no=? FOR UPDATE",t(),instance,no,order.path("supplierCode").asText(),supplyNo).isEmpty(),"SUPPLY_NO_CONFLICT","此订单的供货单号已提交，请查看原回传记录");
        db.update("INSERT INTO spd_supply_outbox(message_id,tenant_id,instance_id,order_no,supplier_code,supply_no,user_id,request_hash,payload,target_endpoint) VALUES(?,?,?,?,?,?,?,?,CAST(? AS JSON),?)",key,t(),instance,no,order.path("supplierCode").asText(),supplyNo,user,hash,json,target.endpoint());
        db.update("DELETE FROM spd_supply_draft WHERE tenant_id=? AND instance_id=? AND order_no=? AND supplier_code=? AND user_id=? AND draft_id=?",
            t(),instance,no,order.path("supplierCode").asText(),user,key);
        return Map.of("messageId",key,"state","pending");
    }
    public Object supplies(String instance,String no,int page,int size) {
        order(instance,no,false);check(page>0&&size>0&&size<=100,"PAGE_INVALID","分页参数不合法");
        long total=db.queryForObject("SELECT COUNT(*) FROM spd_supply_outbox WHERE tenant_id=? AND instance_id=? AND order_no=?",Long.class,t(),instance,no);
        var rows=db.queryForList("SELECT message_id AS messageId,supply_no AS supplyNo,state,attempts,message,result,created_at AS createdAt FROM spd_supply_outbox WHERE tenant_id=? AND instance_id=? AND order_no=? ORDER BY created_at DESC,message_id LIMIT ? OFFSET ?",t(),instance,no,size,(long)(page-1)*size);
        rows.forEach(r->{if(r.get("result")!=null)r.put("result",Phase3Json.parse(r.get("result").toString()));});return Map.of("rows",rows,"total",total,"page",page,"size",size);
    }
    private Map<String,Object> supply(String instance,String key) {
        var rows=db.queryForList("SELECT * FROM spd_supply_outbox WHERE tenant_id=? AND instance_id=? AND message_id=?",t(),instance,key);check(rows.size()==1,"SUPPLY_NOT_FOUND","供货记录不存在");var row=rows.get(0);order(instance,row.get("order_no").toString(),true);return row;
    }
    public Object items(String instance,String key,int page,int size) {
        check(page>0&&size>0&&size<=100,"PAGE_INVALID","分页参数不合法");var row=supply(instance,key);var items=Phase3Json.parse(row.get("payload").toString()).path("payload").path("items");
        var selected=new ArrayList<JsonNode>();long offset=(long)(page-1)*size;
        for(long index=offset;index<items.size()&&index<offset+size;index++)selected.add(items.get((int)index));
        return Map.of("rows",selected,"total",items.size(),"page",page,"size",size);
    }
    public Object refresh(String instance,String key) {
        var row=supply(instance,key);check("processed".equals(row.get("state")),"STATE_INVALID","供货尚未被SPD接收");
        var target=active(instance,false);check(target.endpoint().equals(row.get("target_endpoint")),"TARGET_CHANGED","医院接收地址已变化，请联系管理员核对");
        var result=request(target,null,"GET","/supplies/"+key+"?organization="+encode(target.organization())+"&supplierCode="+encode(row.get("supplier_code").toString()),null,Duration.ofSeconds(15));validateReceipt(result,key,row.get("order_no").toString(),row.get("supply_no").toString());
        db.update("UPDATE spd_supply_outbox SET result=CAST(? AS JSON),message='SPD收货状态已刷新' WHERE message_id=? AND tenant_id=? AND instance_id=? AND state='processed'",Phase3Json.json(result),key,t(),instance);return result;
    }
    @Transactional public Object retry(String instance,String key) {
        active(instance,true);supply(instance,key);check(db.update("UPDATE spd_supply_outbox SET state='pending',next_attempt=NOW(6),lease_id=NULL,lease_until=NULL WHERE message_id=? AND state='failed'",key)==1,"STATE_INVALID","仅失败回传可重试");return Map.of("messageId",key);
    }
    @Scheduled(fixedDelayString="${app.phase3.supply-delay-ms:5000}") public synchronized void deliver() {
        if(!enabled())return;long end=System.nanoTime()+Duration.ofSeconds(30).toNanos();
        for(int count=0;count<20&&System.nanoTime()<end;count++) {
            String lease=UUID.randomUUID().toString();var row=tx.execute(status->{
                var ids=db.queryForList("SELECT message_id FROM spd_supply_outbox WHERE (state IN ('pending','failed') AND next_attempt<=NOW(6)) OR (state='sending' AND lease_until<NOW(6)) ORDER BY created_at,message_id LIMIT 1 FOR UPDATE SKIP LOCKED",String.class);
                if(ids.isEmpty())return null;var current=db.queryForMap("SELECT * FROM spd_supply_outbox WHERE message_id=? FOR UPDATE",ids.get(0));
                db.update("UPDATE spd_supply_outbox SET state='sending',attempts=attempts+1,lease_id=?,lease_until=DATE_ADD(NOW(6),INTERVAL 60 SECOND) WHERE message_id=?",lease,ids.get(0));return current;
            });if(row==null)return;
            String key=row.get("message_id").toString();
            try {
                var instance=repo.instance(((Number)row.get("tenant_id")).longValue(),row.get("instance_id").toString(),false);
                check(instance.enabled()&&instance.endpoint().equals(row.get("target_endpoint")),"TARGET_CHANGED","实例停用或接收地址变化，请联系管理员核对");
                var wire=Phase3Json.parse(row.get("payload").toString());check(instance.organization().equals(wire.path("organization").asText()),"ORG_INVALID","医院机构配置不一致");
                var result=request(instance,key,"POST","/supplies",wire,Duration.ofMillis(Math.max(1,Math.min(15000,(end-System.nanoTime())/1_000_000))));validateReceipt(result,key,row.get("order_no").toString(),row.get("supply_no").toString());
                String note=switch(result.path("receivingStatus").asText()){case "approved"->"SPD已验收此供货单";case "rejected"->"SPD已拒收此供货单";default->"SPD已生成待收货单，需院方验收";};
                db.update("UPDATE spd_supply_outbox SET state='processed',result=CAST(? AS JSON),message=?,lease_id=NULL,lease_until=NULL WHERE message_id=? AND lease_id=?",Phase3Json.json(result),note,key,lease);
            }catch(Exception error) {
                boolean rejected=error instanceof RemoteValidation;int delay=Math.min(900,1<<Math.min(9,((Number)row.get("attempts")).intValue()+1));
                String message=error instanceof BusinessException || error instanceof RemoteValidation?Objects.toString(error.getMessage(),"回传失败"):"供货网络异常，将按原消息重试";
                db.update("UPDATE spd_supply_outbox SET state=?,message=?,next_attempt=DATE_ADD(NOW(6),INTERVAL ? SECOND),lease_id=NULL,lease_until=NULL WHERE message_id=? AND lease_id=?",rejected?"rejected":"failed",message.substring(0,Math.min(1000,message.length())),delay,key,lease);
                if(Thread.currentThread().isInterrupted())return;
            }
        }
    }
    private static String encode(String value){return URLEncoder.encode(value,StandardCharsets.UTF_8);}
    private void validateReceipt(JsonNode result,String key,String no,String supply) {
        check("processed".equals(result.path("state").asText())&&key.equals(result.path("messageId").asText())&&no.equals(result.path("orderNo").asText())&&supply.equals(result.path("supplyNo").asText())&&!result.path("receivingNo").asText().isBlank()&&Set.of("draft","approved","rejected").contains(result.path("receivingStatus").asText()),"RECEIPT_INVALID","SPD未确认有效的收货回执");
    }
    private JsonNode request(IntegrationTypes.Instance instance,String key,String method,String suffix,Object body,Duration timeout) {
        try {
            SpdTransport.validateEndpoint(instance.endpoint());var base=URI.create(instance.endpoint());String path=base.getPath();check(path.endsWith("/mcp/receive"),"ENDPOINT_INVALID","供货回传要求标准MCP接收路径");
            String target=instance.endpoint().substring(0,instance.endpoint().length()-"/mcp/receive".length())+"/mcp/phase3"+suffix;
            String secret=env.getProperty(instance.tokenEnv(),"");check(!secret.isBlank(),"TOKEN_MISSING","医院回传密钥未配置");
            var builder=HttpRequest.newBuilder(URI.create(target)).header("Authorization","Bearer "+secret).header("Content-Type","application/json");if(key!=null)builder.header("Idempotency-Key",key);
            var response=BoundedHttpClient.send(client,builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(Phase3Json.json(body))).build(),2*1024*1024,timeout);
            JsonNode result=Phase3Json.parse(new String(response.body(),StandardCharsets.UTF_8));
            if(response.statusCode()==400 || response.statusCode()==409)throw new RemoteValidation(result.path("message").asText("SPD供货校验未通过"));
            check(response.statusCode()==200&&"processed".equals(result.path("state").asText()),"SPD_UNAVAILABLE",result.path("message").asText("SPD暂未确认接收"));return result;
        }catch(BusinessException error){throw error;}catch(Exception error){if(error instanceof InterruptedException)Thread.currentThread().interrupt();throw new BusinessException("SPD_CONNECTION_FAILED","SPD连接暂不可用，请稍后重试");}
    }
    private static final class RemoteValidation extends BusinessException {RemoteValidation(String message){super("SPD_SUPPLY_REJECTED",message);}}
}
