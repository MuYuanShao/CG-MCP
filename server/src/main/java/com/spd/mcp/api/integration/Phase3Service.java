package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.spd.mcp.api.auth.AuthContext;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/** Owns versioned hospital documents, atomic large uploads and supplier-scoped collaboration. */
@Service
public class Phase3Service {
    private final JdbcTemplate db;private final IntegrationRepository repo;private final TenantContext tenant;private final AuthContext auth;
    public Phase3Service(JdbcTemplate db,IntegrationRepository repo,TenantContext tenant,AuthContext auth){this.db=db;this.repo=repo;this.tenant=tenant;this.auth=auth;}
    private long t(){return tenant.currentTenantId();}
    private void check(boolean ok,String code,String message){if(!ok)throw new BusinessException(code,message);}
    private void conflict(boolean ok,String code,String message){if(!ok)throw new BusinessException(code,message,HttpStatus.CONFLICT);}
    private void active(String instance,boolean lock){check(repo.instance(t(),instance,lock).enabled(),"INSTANCE_DISABLED","对接实例已停用");}
    public static String kind(String route){return switch(route){case "purchase-plans"->"purchase_plan";case "settlements"->"settlement";default->throw new BusinessException("KIND_INVALID","第三期对象类型不合法");};}
    private String text(JsonNode node,String field,int length){String value=node.path(field).asText();check(!value.isBlank()&&value.length()<=length,"FIELD_INVALID","字段缺失或过长："+field);return value;}
    private String id(JsonNode node,String field){String value=text(node,field,19);try{check(value.matches("[1-9][0-9]{0,18}")&&Long.parseLong(value)>0,"ID_INVALID","来源身份不合法："+field);}catch(NumberFormatException error){throw new BusinessException("ID_INVALID","来源身份超出范围");}return value;}
    private long revision(JsonNode wire){try{long revision=Long.parseLong(text(wire,"revision",19));check(revision>0,"REVISION_INVALID","来源版本必须为正整数");return revision;}catch(NumberFormatException error){throw new BusinessException("REVISION_INVALID","来源版本不合法");}}
    private void envelope(String instance,String key,JsonNode wire,String kind){
        try{UUID.fromString(key);}catch(Exception error){throw new BusinessException("MESSAGE_INVALID","消息编号不合法");}
        check(key.equals(wire.path("messageId").asText())&&"3.0".equals(wire.path("schemaVersion").asText())&&"SPD-PR".equals(wire.path("sourceSystem").asText()),"MESSAGE_INVALID","消息身份或协议不合法");
        check(kind.equals(wire.path("documentType").asText())&&Set.of("purchase_plan","settlement").contains(kind),"KIND_INVALID","消息与接口类型不一致");
        check(repo.instance(t(),instance,false).organization().equals(wire.path("organization").asText()),"ORG_INVALID","来源机构不匹配");
        id(wire,"sourceId");revision(wire);try{Instant.parse(text(wire,"sourceUpdatedAt",40));}catch(Exception error){throw new BusinessException("TIME_INVALID","来源时间必须包含时区");}
        check(Set.of("UPSERT","CANCEL").contains(wire.path("operation").asText())&&wire.path("payload").isObject(),"MESSAGE_INVALID","操作或载荷不合法");
    }

    @Transactional public Map<String,Object> upload(String instance,String key,JsonNode wire,String kind){
        active(instance,true);envelope(instance,key,wire,kind);return publish(instance,key,wire,kind);
    }
    private Map<String,Object> publish(String instance,String key,JsonNode wire,String kind){
        String hash=Phase3Json.hash(wire);var receipt=db.queryForList("SELECT payload_hash,result_json FROM spd_phase3_receipt WHERE tenant_id=? AND instance_id=? AND message_id=?",t(),instance,key);
        if(!receipt.isEmpty()){conflict(hash.equals(receipt.get(0).get("payload_hash")),"IDEMPOTENCY_CONFLICT","相同消息编号不能用于不同内容");return result(receipt.get(0).get("result_json"));}
        String source=id(wire,"sourceId");long version=revision(wire);JsonNode payload=wire.path("payload");
        ObjectNode semantic=wire.deepCopy();semantic.remove("messageId");String versionHash=Phase3Json.hash(semantic);
        var current=db.queryForList("SELECT * FROM spd_phase3_document WHERE tenant_id=? AND instance_id=? AND document_type=? AND source_id=? FOR UPDATE",t(),instance,kind,source);
        long stored=current.isEmpty()?0:((Number)current.get(0).get("revision")).longValue();
        if(version<stored)return saveReceipt(instance,key,hash,source,stored,"ignored");
        if(version==stored){conflict(versionHash.equals(current.get(0).get("payload_hash")),"REVISION_CONFLICT","相同来源版本的内容不一致");return saveReceipt(instance,key,hash,source,stored,"processed");}
        if(!current.isEmpty()) {
            conflict(!"CANCEL".equals(current.get(0).get("operation")) || ("CANCEL".equals(wire.path("operation").asText()) && current.get(0).get("supplier_code").equals(payload.path("supplierCode").asText()) && current.get(0).get("document_no").equals(payload.path("documentNo").asText())),"SOURCE_CANCELLED","已撤销来源不能以相同身份恢复");
            if("settlement".equals(kind)&&"confirmed".equals(current.get(0).get("source_status"))) {
                conflict("UPSERT".equals(wire.path("operation").asText())&&"confirmed".equals(payload.path("sourceStatus").asText()),"CONFIRMED_IMMUTABLE","已确认结算不能远端撤销或降级");
                var prior=db.queryForList("SELECT envelope FROM spd_phase3_history WHERE tenant_id=? AND instance_id=? AND document_type=? AND source_id=? AND revision=?",t(),instance,kind,source,stored);
                conflict(!prior.isEmpty()&&financial(Phase3Json.parse(prior.get(0).get("envelope").toString()).path("payload")).equals(financial(payload)),"CONFIRMED_IMMUTABLE","已确认结算财务事实不可改写");
            }
        }
        validate(instance,wire,kind,source);
        String supplier=payload.path("supplierCode").asText();boolean settlement=kind.equals("settlement");
        String operation=wire.path("operation").asText();ObjectNode header=payload.deepCopy();header.remove("items");
        db.update("""
                INSERT INTO spd_phase3_document(tenant_id,instance_id,document_type,source_id,revision,operation,document_no,supplier_code,source_status,source_updated_at,payload_hash,total_amount,currency,tax_included,payload)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON))
                ON DUPLICATE KEY UPDATE revision=VALUES(revision),operation=VALUES(operation),document_no=VALUES(document_no),supplier_code=VALUES(supplier_code),source_status=VALUES(source_status),source_updated_at=VALUES(source_updated_at),payload_hash=VALUES(payload_hash),total_amount=VALUES(total_amount),currency=VALUES(currency),tax_included=VALUES(tax_included),payload=VALUES(payload),updated_at=NOW(6)
                """,t(),instance,kind,source,version,operation,payload.path("documentNo").asText(),supplier,payload.path("sourceStatus").asText(),wire.path("sourceUpdatedAt").asText(),versionHash,
                settlement?decimal(payload,"totalAmount",false):null,settlement?payload.path("currency").asText():null,settlement?payload.path("taxIncluded").asBoolean():null,Phase3Json.json(header));
        db.update("DELETE FROM spd_phase3_item WHERE tenant_id=? AND instance_id=? AND document_type=? AND source_id=?",t(),instance,kind,source);
        if(settlement)db.update("DELETE FROM spd_phase3_source_claim WHERE tenant_id=? AND instance_id=? AND settlement_id=?",t(),instance,source);
        if(operation.equals("UPSERT")) {
            var batch=new ArrayList<Object[]>();var claims=new ArrayList<Object[]>();
            for(var item:payload.path("items")) {
                batch.add(new Object[]{t(),instance,kind,source,item.path("sourceLineId").asText(),Phase3Json.json(item)});
                if(settlement)claims.add(new Object[]{t(),instance,item.path("sourceBizType").asText(),item.path("sourceBizId").asText(),source});
            }
            db.batchUpdate("INSERT INTO spd_phase3_item(tenant_id,instance_id,document_type,source_id,line_id,payload) VALUES(?,?,?,?,?,CAST(? AS JSON))",batch);
            if(settlement)db.batchUpdate("INSERT INTO spd_phase3_source_claim(tenant_id,instance_id,source_biz_type,source_biz_id,settlement_id) VALUES(?,?,?,?,?)",claims);
        }
        db.update("INSERT INTO spd_phase3_history(tenant_id,instance_id,document_type,source_id,revision,payload_hash,envelope) VALUES(?,?,?,?,?,?,CAST(? AS JSON))",t(),instance,kind,source,version,versionHash,Phase3Json.json(wire));
        return saveReceipt(instance,key,hash,source,version,"processed");
    }

    private void validate(String instance,JsonNode wire,String kind,String source){
        JsonNode payload=wire.path("payload");String supplier=text(payload,"supplierCode",100);text(payload,"documentNo",100);
        check(repo.record(t(),instance,"supplier",supplier).isPresent(),"SUPPLIER_UNMAPPED","来源供应商尚未上传");
        boolean cancel="CANCEL".equals(wire.path("operation").asText());JsonNode items=payload.path("items");
        check(items.isArray()&&items.size()<=100000&&(cancel?items.isEmpty():!items.isEmpty()),"ITEMS_INVALID","明细数量或取消载荷不合法");
        String status=text(payload,"sourceStatus",30);
        if(kind.equals("purchase_plan"))check(Set.of("draft","approved","executed","rejected").contains(status),"STATUS_INVALID","来源计划状态不合法");
        else {
            check(Set.of("pending_confirm","confirmed").contains(status),"STATUS_INVALID","来源结算状态不合法");
            check(!cancel||status.equals("pending_confirm"),"CONFIRMED_IMMUTABLE","已确认结算不能取消");
            check(payload.path("currency").asText().matches("[A-Z]{3}")&&payload.path("taxIncluded").isBoolean()&&payload.path("moneyScale").asInt()==4,"MONEY_BASIS_INVALID","必须明确币种、税口径及四位金额精度");
            check(Set.of("purchase_in","department_consumption","actual_sale").contains(payload.path("settlementMode").asText()),"MODE_INVALID","结算点不合法");
        }
        var ids=new HashSet<String>();var sources=new HashSet<String>();var units=new HashMap<String,String>();BigDecimal total=BigDecimal.ZERO;
        for(var item:items){
            check(ids.add(id(item,"sourceLineId")),"LINE_DUPLICATED","来源明细身份重复");String product=text(item,"productCode",100),unit=text(item,"unit",30);
            if(!units.containsKey(product)) {
                long mapped=repo.mappedProduct(t(),instance,product).orElseThrow(()->new BusinessException("PRODUCT_UNMAPPED","来源商品尚未匹配："+product));
                var found=db.queryForList("SELECT unit FROM biz_product WHERE tenant_id=? AND id=? AND deleted=0",String.class,t(),mapped);
                check(found.size()==1,"PRODUCT_UNMAPPED","来源商品不存在");units.put(product,found.get(0));
            }
            check(unit.equals(units.get(product)),"UNIT_MISMATCH","来源基本单位与商品映射不一致");
            BigDecimal quantity=decimal(item,kind.equals("settlement")?"quantity":"plannedQuantity",true);
            check(quantity.stripTrailingZeros().scale()<=0,"QUANTITY_INVALID","来源数量必须为基本单位整数");
            if(kind.equals("settlement")) {
                String type=text(item,"sourceBizType",50),biz=id(item,"sourceBizId");check(Set.of("receiving_order_item","department_consumption_item","high_value_charge").contains(type),"SOURCE_TYPE_INVALID","结算来源类型不支持");
                check(sources.add(type+":"+biz),"SOURCE_DUPLICATED","同一来源业务明细重复结算");
                var owner=db.queryForList("SELECT settlement_id FROM spd_phase3_source_claim WHERE tenant_id=? AND instance_id=? AND source_biz_type=? AND source_biz_id=?",String.class,t(),instance,type,biz);
                conflict(owner.isEmpty()||owner.get(0).equals(source),"SOURCE_ALREADY_CLAIMED","来源业务已在其他有效结算单中");
                decimal(item,"unitPrice",false);total=total.add(decimal(item,"amount",false));
                if(item.hasNonNull("traceCodeId"))id(item,"traceCodeId");
            } else {
                String basis=text(item,"priceBasis",40);check(Set.of("not_recorded","catalog_at_plan_creation").contains(basis),"PRICE_BASIS_INVALID","计划估价依据不合法");
                if(basis.equals("not_recorded"))check(item.path("estimatedUnitPrice").isNull()&&item.path("estimatedAmount").isNull(),"PRICE_BASIS_INVALID","未记录估价不能伪造金额");
                else check(decimal(item,"estimatedUnitPrice",false).multiply(quantity).setScale(4,java.math.RoundingMode.HALF_UP).compareTo(decimal(item,"estimatedAmount",false))==0,"AMOUNT_INVALID","计划估价数量金额不一致");
            }
        }
        if(kind.equals("settlement"))check(total.compareTo(decimal(payload,"totalAmount",false))==0,"AMOUNT_INVALID","结算总额与明细四位精确合计不一致");
    }
    private BigDecimal decimal(JsonNode node,String field,boolean positive){
        try{JsonNode value=node.path(field);check(value.isTextual()&&value.asText().length()<=30,"DECIMAL_INVALID","金额数量须为十进制字符串："+field);
            BigDecimal number=new BigDecimal(value.asText()).setScale(4,java.math.RoundingMode.UNNECESSARY);
            check(number.precision()<=18&&(positive?number.signum()>0:number.signum()>=0),"DECIMAL_INVALID","金额数量超出范围："+field);return number;
        }catch(ArithmeticException|NumberFormatException error){throw new BusinessException("DECIMAL_INVALID","金额数量格式不合法："+field);}
    }
    private String financial(JsonNode payload){ObjectNode value=payload.deepCopy();value.remove(List.of("origin","catalogDisplayOrigin"));return Phase3Json.json(value);}
    private Map<String,Object> saveReceipt(String instance,String key,String hash,String source,long revision,String state){
        var result=Map.<String,Object>of("state",state,"messageId",key,"sourceId",source,"storedRevision",Long.toString(revision),"payloadHash",hash);
        db.update("INSERT INTO spd_phase3_receipt(tenant_id,instance_id,message_id,payload_hash,result_json) VALUES(?,?,?,?,CAST(? AS JSON))",t(),instance,key,hash,Phase3Json.json(result));return result;
    }
    @SuppressWarnings("unchecked") private Map<String,Object> result(Object value){return Phase3Json.MAPPER.convertValue(Phase3Json.parse(value.toString()),Map.class);}

    @Transactional public Map<String,Object> begin(String instance,String key,JsonNode manifest){
        active(instance,true);JsonNode header=manifest.path("envelope");String kind=header.path("documentType").asText();envelope(instance,key,header,kind);
        check(manifest.path("payloadHash").asText().matches("[a-f0-9]{64}"),"HASH_INVALID","完整消息摘要不合法");
        int lines=manifest.path("totalLines").asInt(),parts=manifest.path("totalParts").asInt();
        check(lines>1000&&lines<=100000&&parts==(lines+999)/1000,"PARTS_INVALID","大单行数或分片数不合法");
        var receipts=db.queryForList("SELECT payload_hash,result_json FROM spd_phase3_receipt WHERE tenant_id=? AND instance_id=? AND message_id=?",t(),instance,key);
        if(!receipts.isEmpty()){conflict(manifest.path("payloadHash").asText().equals(receipts.get(0).get("payload_hash")),"IDEMPOTENCY_CONFLICT","消息摘要冲突");return result(receipts.get(0).get("result_json"));}
        db.update("DELETE FROM spd_phase3_session WHERE tenant_id=? AND instance_id=? AND (expires_at<NOW(6) OR (document_type=? AND source_id=? AND revision<?))",t(),instance,kind,id(header,"sourceId"),revision(header));
        var old=db.queryForList("SELECT * FROM spd_phase3_session WHERE tenant_id=? AND instance_id=? AND message_id=? FOR UPDATE",t(),instance,key);
        String session;
        if(!old.isEmpty()){conflict(Phase3Json.hash(manifest).equals(old.get(0).get("manifest_hash")),"IDEMPOTENCY_CONFLICT","大单清单已改变");session=old.get(0).get("id").toString();}
        else {
            Long count=db.queryForObject("SELECT COUNT(*) FROM spd_phase3_session WHERE tenant_id=? AND instance_id=?",Long.class,t(),instance);
            check(count==null||count<5,"SESSION_LIMIT","同一实例最多五个大单暂存会话");session=UUID.randomUUID().toString();
            db.update("INSERT INTO spd_phase3_session(id,tenant_id,instance_id,message_id,document_type,source_id,revision,manifest_hash,manifest,total_lines,total_parts,expires_at) VALUES(?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?,DATE_ADD(NOW(6),INTERVAL 1 HOUR))",session,t(),instance,key,kind,id(header,"sourceId"),revision(header),Phase3Json.hash(manifest),Phase3Json.json(manifest),lines,parts);
        }
        return Map.of("state","staging","sessionId",session,"uploadedParts",db.queryForList("SELECT part_no FROM spd_phase3_part WHERE session_id=? ORDER BY part_no",Integer.class,session));
    }
    private Map<String,Object> session(String instance,String session){
        var rows=db.queryForList("SELECT * FROM spd_phase3_session WHERE id=? AND tenant_id=? AND instance_id=? AND expires_at>=NOW(6) FOR UPDATE",session,t(),instance);
        if(rows.isEmpty())throw new BusinessException("SESSION_NOT_FOUND","大单暂存已失效或不属于当前实例",HttpStatus.NOT_FOUND);return rows.get(0);
    }
    @Transactional public Object part(String instance,String sessionId,int part,JsonNode payload){
        active(instance,true);var session=session(instance,sessionId);int lines=((Number)session.get("total_lines")).intValue();
        check(part>=0&&part<((Number)session.get("total_parts")).intValue()&&payload.path("items").isArray()&&payload.path("items").size()==Math.min(1000,lines-part*1000),"PARTS_INVALID","分片编号或行数不合法");
        String hash=Phase3Json.hash(payload.path("items"));check(hash.equals(payload.path("payloadHash").asText()),"HASH_INVALID","分片摘要不一致");
        var old=db.queryForList("SELECT payload_hash FROM spd_phase3_part WHERE session_id=? AND part_no=?",String.class,sessionId,part);
        if(!old.isEmpty())conflict(hash.equals(old.get(0)),"PART_CONFLICT","同一分片内容已改变");
        else db.update("INSERT INTO spd_phase3_part(session_id,part_no,payload_hash,items) VALUES(?,?,?,CAST(? AS JSON))",sessionId,part,hash,Phase3Json.json(payload.path("items")));
        return Map.of("state","staged","partNo",part);
    }
    @Transactional public Object commit(String instance,String sessionId){
        active(instance,true);var session=session(instance,sessionId);JsonNode manifest=Phase3Json.parse(session.get("manifest").toString());
        var parts=db.queryForList("SELECT items FROM spd_phase3_part WHERE session_id=? ORDER BY part_no",String.class,sessionId);
        check(parts.size()==((Number)session.get("total_parts")).intValue(),"PARTS_MISSING","大单分片尚未完整");
        ObjectNode wire=manifest.path("envelope").deepCopy();var items=((ObjectNode)wire.path("payload")).putArray("items");
        parts.forEach(part->Phase3Json.parse(part).forEach(items::add));
        check(items.size()==((Number)session.get("total_lines")).intValue()&&Phase3Json.hash(wire).equals(manifest.path("payloadHash").asText()),"HASH_INVALID","完整大单行数或摘要不一致");
        Object result=publish(instance,session.get("message_id").toString(),wire,wire.path("documentType").asText());
        db.update("DELETE FROM spd_phase3_session WHERE id=?",sessionId);return result;
    }

    private long userId(){var user=auth.currentUser().orElseThrow(()->new BusinessException("UNAUTHORIZED","请重新登录",HttpStatus.UNAUTHORIZED));
        var ids=db.queryForList("SELECT id FROM sys_user WHERE tenant_id=? AND username=? AND deleted=0 AND status=1",Long.class,t(),user.username());check(ids.size()==1,"USER_INVALID","账户已停用");return ids.get(0);}
    private boolean manages(){return auth.currentUser().map(user->user.permissions().contains("integration:manage")).orElse(false);}
    private void scope(StringBuilder where,List<Object> args,String alias){if(!manages()){where.append(" AND EXISTS(SELECT 1 FROM spd_phase3_supplier_access access WHERE access.tenant_id=").append(alias).append(".tenant_id AND access.instance_id=").append(alias).append(".instance_id AND access.supplier_code=").append(alias).append(".supplier_code AND access.user_id=?)");args.add(userId());}}
    public Object instances(){
        long user=userId();return repo.instances(t()).stream().filter(instance->manages()||!db.queryForList("SELECT supplier_code FROM spd_phase3_supplier_access WHERE tenant_id=? AND instance_id=? AND user_id=?",String.class,t(),instance.id(),user).isEmpty()).toList();
    }
    public Object receipt(String instance,String message){
        active(instance,false);var rows=db.queryForList("SELECT result_json FROM spd_phase3_receipt WHERE tenant_id=? AND instance_id=? AND message_id=?",t(),instance,message);
        if(rows.isEmpty())throw new BusinessException("RECEIPT_NOT_FOUND","消息尚未提交",HttpStatus.NOT_FOUND);
        return result(rows.get(0).get("result_json"));
    }
    public Object list(String instance,String kind,int page,int size,String query){
        active(instance,false);check(page>0&&size>0&&size<=200,"PAGE_INVALID","分页参数不合法");
        var args=new ArrayList<Object>(List.of(t(),instance,kind));var where=new StringBuilder(" WHERE doc.tenant_id=? AND doc.instance_id=? AND doc.document_type=?");scope(where,args,"doc");
        if(query!=null&&!query.isBlank()){where.append(" AND (doc.document_no LIKE ? OR doc.supplier_code LIKE ?)");args.add("%"+query.trim()+"%");args.add("%"+query.trim()+"%");}
        Long total=db.queryForObject("SELECT COUNT(*) FROM spd_phase3_document doc"+where,Long.class,args.toArray());args.add(size);args.add((long)(page-1)*size);
        var rows=db.queryForList("SELECT doc.source_id AS sourceId,doc.document_no AS documentNo,doc.supplier_code AS supplierCode,doc.revision,doc.operation,doc.source_status AS sourceStatus,doc.total_amount AS totalAmount,doc.currency,doc.payload FROM spd_phase3_document doc"+where+" ORDER BY doc.updated_at DESC,doc.source_id LIMIT ? OFFSET ?",args.toArray());
        for(var row:rows){row.put("sourceId",row.get("sourceId").toString());row.put("revision",row.get("revision").toString());if(row.get("totalAmount")!=null)row.put("totalAmount",row.get("totalAmount").toString());row.put("payload",Phase3Json.parse(row.get("payload").toString()));}
        return Map.of("rows",rows,"total",total==null?0:total,"page",page,"size",size);
    }
    private Map<String,Object> accessible(String instance,String kind,String source,boolean supplierOnly){
        active(instance,false);var args=new ArrayList<Object>(List.of(t(),instance,kind,source));var where=new StringBuilder(" WHERE doc.tenant_id=? AND doc.instance_id=? AND doc.document_type=? AND doc.source_id=?");
        if(supplierOnly){where.append(" AND EXISTS(SELECT 1 FROM spd_phase3_supplier_access access WHERE access.tenant_id=doc.tenant_id AND access.instance_id=doc.instance_id AND access.supplier_code=doc.supplier_code AND access.user_id=?)");args.add(userId());}else scope(where,args,"doc");
        var rows=db.queryForList("SELECT doc.* FROM spd_phase3_document doc"+where,args.toArray());if(rows.isEmpty())throw new BusinessException("DOCUMENT_NOT_FOUND","来源单据不存在或无权访问",HttpStatus.NOT_FOUND);return rows.get(0);
    }
    public Object items(String instance,String kind,String source,int page,int size){
        accessible(instance,kind,source,false);check(page>0&&size>0&&size<=200,"PAGE_INVALID","分页参数不合法");
        Long total=db.queryForObject("SELECT COUNT(*) FROM spd_phase3_item WHERE tenant_id=? AND instance_id=? AND document_type=? AND source_id=?",Long.class,t(),instance,kind,source);
        var rows=db.queryForList("SELECT payload FROM spd_phase3_item WHERE tenant_id=? AND instance_id=? AND document_type=? AND source_id=? ORDER BY LENGTH(line_id),line_id LIMIT ? OFFSET ?",String.class,t(),instance,kind,source,size,(long)(page-1)*size).stream().map(Phase3Json::parse).toList();
        return Map.of("rows",rows,"total",total==null?0:total,"page",page,"size",size);
    }
    @Transactional public Object supplierAccess(String instance,JsonNode body){
        active(instance,true);String username=text(body,"username",50),supplier=text(body,"supplierCode",100);
        var users=db.queryForList("SELECT id FROM sys_user WHERE tenant_id=? AND username=? AND deleted=0 AND status=1",Long.class,t(),username);check(users.size()==1&&repo.record(t(),instance,"supplier",supplier).isPresent(),"RELATION_INVALID","有效账户或来源供应商不存在");
        if(body.path("remove").asBoolean())db.update("DELETE FROM spd_phase3_supplier_access WHERE tenant_id=? AND instance_id=? AND user_id=? AND supplier_code=?",t(),instance,users.get(0),supplier);
        else db.update("INSERT IGNORE INTO spd_phase3_supplier_access(tenant_id,instance_id,user_id,supplier_code) VALUES(?,?,?,?)",t(),instance,users.get(0),supplier);
        return Map.of("username",username,"supplierCode",supplier);
    }
    @Transactional public Object feedback(String instance,String source,String key,JsonNode request){
        active(instance,true);
        try{UUID.fromString(key);}catch(Exception error){throw new BusinessException("MESSAGE_INVALID","反馈编号不合法");}
        var doc=accessible(instance,"settlement",source,true);check(!"CANCEL".equals(doc.get("operation")),"SOURCE_CANCELLED","原结算已撤销");
        String type=text(request,"feedbackType",20),reason=request.path("reason").asText();check(Set.of("received","disputed","withdrawn").contains(type)&&reason.length()<=1000&&(!type.equals("disputed")||!reason.isBlank()),"FEEDBACK_INVALID","反馈类型或原因不合法");
        long user=userId();String requestHash=Phase3Json.hash(Map.of("request",request,"sourceId",source,"instance",instance));
        var old=db.queryForList("SELECT * FROM spd_phase3_feedback WHERE message_id=? FOR UPDATE",key);
        if(!old.isEmpty()){conflict(((Number)old.get(0).get("tenant_id")).longValue()==t()&&old.get(0).get("instance_id").equals(instance)&&((Number)old.get(0).get("user_id")).longValue()==user&&requestHash.equals(old.get(0).get("request_hash")),"IDEMPOTENCY_CONFLICT","反馈编号已用于其他内容");return Map.of("messageId",key,"state",old.get(0).get("state"));}
        conflict(request.path("revision").asText().equals(doc.get("revision").toString()),"REVISION_CONFLICT","结算版本已变化，请刷新后反馈");
        var previous=db.queryForList("SELECT message_id,payload FROM spd_phase3_feedback WHERE tenant_id=? AND instance_id=? AND source_id=? AND user_id=? ORDER BY created_at DESC,message_id DESC LIMIT 1 FOR UPDATE",t(),instance,source,user);
        if(type.equals("withdrawn"))check(!previous.isEmpty()&&!Phase3Json.parse(previous.get(0).get("payload").toString()).path("payload").path("feedbackType").asText().equals("withdrawn"),"FEEDBACK_INVALID","没有可撤回的本人反馈");
        var wire=Phase3Json.MAPPER.createObjectNode();wire.put("schemaVersion","3.0");wire.put("messageId",key);wire.put("sourceSystem","MCP-UI");wire.put("organization",repo.instance(t(),instance,false).organization());
        var payload=wire.putObject("payload");payload.put("settlementId",source);payload.put("settlementRevision",doc.get("revision").toString());payload.put("supplierCode",doc.get("supplier_code").toString());payload.put("feedbackType",type);payload.put("reason",reason);payload.put("externalOperator",auth.currentUser().orElseThrow().username());
        payload.put("externalOperatorId",Long.toString(user));
        if(type.equals("withdrawn"))payload.put("withdrawsMessageId",previous.get(0).get("message_id").toString());
        db.update("INSERT INTO spd_phase3_feedback(message_id,tenant_id,instance_id,source_id,revision,supplier_code,user_id,request_hash,payload) VALUES(?,?,?,?,?,?,?,?,CAST(? AS JSON))",key,t(),instance,source,doc.get("revision"),doc.get("supplier_code"),user,requestHash,Phase3Json.json(wire));return Map.of("messageId",key,"state","pending");
    }
    public Object feedbacks(String instance,String source){accessible(instance,"settlement",source,false);return db.queryForList("SELECT message_id AS messageId,state,message,payload,created_at AS createdAt FROM spd_phase3_feedback WHERE tenant_id=? AND instance_id=? AND source_id=? ORDER BY created_at DESC LIMIT 100",t(),instance,source);}
}
