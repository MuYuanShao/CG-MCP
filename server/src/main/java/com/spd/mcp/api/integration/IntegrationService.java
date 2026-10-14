package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.product.ProductRepository;
import com.spd.mcp.api.tenant.TenantContext;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

@Service
public class IntegrationService {
  private final IntegrationRepository repo;
  private final TenantContext tenant;
  private final ProductRepository products;
  private final JdbcTemplate db;
  private final ObjectMapper mapper;
  private final SpdTransport transport;
  private final Path licenseRoot;
  private final TransactionTemplate transactions;
  private final Phase2Service phase2;
  public IntegrationService(IntegrationRepository repo,TenantContext tenant,ProductRepository products,JdbcTemplate db,ObjectMapper mapper,SpdTransport transport,
      @Value("${app.upload.license-dir:uploads/licenses}") String licenseRoot, PlatformTransactionManager transactionManager,Phase2Service phase2) {
    this.repo=repo;this.tenant=tenant;this.products=products;this.db=db;this.mapper=mapper;this.transport=transport;this.licenseRoot=Path.of(licenseRoot).toAbsolutePath().normalize();
    this.transactions=new TransactionTemplate(transactionManager);
    this.phase2=phase2;
  }
  private long tenantId() { return tenant.currentTenantId(); }
  public List<Instance> instances() { return repo.instances(tenantId()); }
  @Transactional
  public Instance saveInstance(String id,InstanceRequest request) {
    SpdTransport.validateEndpoint(request.endpoint());
    boolean create=id==null;
    if(create) id=UUID.randomUUID().toString();
    else if(!repo.instance(tenantId(),id,true).organization().equals(request.organization()))
      throw new BusinessException("ORG_IMMUTABLE","机构标识不能修改，请新建实例");
    repo.saveInstance(tenantId(),id,request,create);
    return repo.instance(tenantId(),id,false);
  }
  private Instance active(String id,boolean lock) {
    var i=repo.instance(tenantId(),id,lock);
    if(!i.enabled()) throw new BusinessException("INSTANCE_DISABLED","对接实例已停用");
    return i;
  }
  public List<StoredRecord> records(String id,String kind) { repo.instance(tenantId(),id,false); checkKind(kind); return repo.records(tenantId(),id,kind); }
  private void checkKind(String kind) { if(!Set.of("supplier","manufacturer","order").contains(kind) && !Phase2Service.KINDS.contains(kind)) throw new BusinessException("KIND_INVALID","数据类型不合法"); }
  public List<SyncLog> logs(String id) { repo.instance(tenantId(),id,false);return repo.logs(tenantId(),id); }
  @Transactional
  public SyncLog uploadMaster(String id,String kind,MasterRequest request) {
    active(id,true);
    if(!Set.of("supplier","manufacturer").contains(kind)) throw new BusinessException("KIND_INVALID","基础资料类型不合法");
    return store(id,kind,request.sourceCode(),request.sourceUpdatedAt(),request,()->{});
  }
  @Transactional
  public SyncLog uploadOrder(String id,OrderRequest request) {
    active(id,true);
    return store(id,"order",request.orderNo(),request.sourceUpdatedAt(),request,()->validateOrder(id,request));
  }
  private SyncLog store(String id,String kind,String code,Instant timestamp,Object payload,Runnable validation) {
    String state="processed",message="处理成功";
    var old=repo.record(tenantId(),id,kind,code);
    if(old.isPresent() && !IntegrationRules.isNewer(timestamp,Instant.parse(old.get().sourceUpdatedAt()))) {
      state="ignored";message="重复或旧版本，未覆盖已保存数据";
    } else {
      try { validation.run(); }
      catch (BusinessException e) { return repo.log(tenantId(),id,UUID.randomUUID().toString(),"upload",kind,code,"failed",e.getMessage(),payload); }
      repo.saveRecord(tenantId(),id,kind,code,timestamp.toString(),payload);
    }
    return repo.log(tenantId(),id,UUID.randomUUID().toString(),"upload",kind,code,state,message,payload);
  }
  private void validateOrder(String id,OrderRequest order) {
    IntegrationRules.validateOrder(order);
    phase2.validateOrderAmendment(id,order);
    if(repo.record(tenantId(),id,"supplier",order.supplierCode()).isEmpty()) throw new BusinessException("SUPPLIER_UNMAPPED","供应商不存在: "+order.supplierCode());
    for(var item:order.items()) {
      long product=repo.mappedProduct(tenantId(),id,item.productCode()).orElseThrow(()->new BusinessException("PRODUCT_UNMAPPED","商品未匹配: "+item.productCode()));
      var p=products.findById(tenantId(),product).orElseThrow(()->new BusinessException("PRODUCT_NOT_FOUND","商品不存在: "+item.productCode()));
      if(!Objects.equals(p.unit(),item.unit())) throw new BusinessException("UNIT_MISMATCH","商品单位不一致: "+item.productCode());
    }
  }
  public List<SyncLog> dispatch(String id,DispatchRequest request) {
    var instance=active(id,false);
    String batch=UUID.randomUUID().toString();
    var results=new ArrayList<SyncLog>();
    var dispatchIds=new LinkedHashSet<>(request.productIds());
    var cleanupIds=new LinkedHashSet<Long>();
    for(long selected:request.productIds()) {
      var selectedProduct=products.findById(tenantId(),selected);
      if(selectedProduct.isEmpty()) continue;
      var related=db.queryForList("SELECT id FROM biz_license WHERE tenant_id=? AND deleted=0 AND (product_id=? OR (product_id IS NULL AND related_product=?))",Long.class,tenantId(),selected,selectedProduct.get().name());
      for(long license:related) cleanupIds.addAll(db.queryForList("SELECT product_id FROM spd_license_binding WHERE tenant_id=? AND instance_id=? AND license_id=? AND product_id<>?",Long.class,tenantId(),id,license,selected));
    }
    cleanupIds.removeAll(dispatchIds);
    dispatchIds.addAll(cleanupIds);
    for(long product:dispatchIds) {
      boolean licensesOnly=request.licensesOnly() || cleanupIds.contains(product);
      String kind=licensesOnly?"licenses":"product";
      var log=transactions.execute(status -> {
        active(id,true);
        try {
          var payload=outboundPayload(id,product,licensesOnly);
          return repo.log(tenantId(),id,batch,"dispatch",kind,Long.toString(product),"pending","等待发送",payload);
        } catch(BusinessException e) {
          return repo.log(tenantId(),id,batch,"dispatch",kind,Long.toString(product),"failed",e.getMessage(),Map.of("productId",product,"licensesOnly",licensesOnly));
        }
      });
      if(log.state().equals("pending")) send(instance,log,repo.logPayload(tenantId(),log.id()));
      results.add(repo.logRow(tenantId(),log.id()));
    }
    return results;
  }
  private Map<String,Object> outboundPayload(String id,long product,boolean licensesOnly) {
    var p=products.findById(tenantId(),product).orElseThrow(()->new BusinessException("PRODUCT_NOT_FOUND","商品不存在: "+product));
    var errors=new ArrayList<String>();
    if(blank(p.code())) errors.add("商品编码"); if(blank(p.name())) errors.add("商品名称"); if(blank(p.unit())) errors.add("单位");
    if(blank(p.manufacturer())) errors.add("厂家"); if(blank(p.spec()) && blank(p.model())) errors.add("规格型号");
    if(!errors.isEmpty()) throw new BusinessException("PRODUCT_REQUIRED","商品 "+p.code()+" 缺少字段: "+String.join("、",errors));
    var manufacturers=repo.records(tenantId(),id,"manufacturer").stream().filter(r->r.payload().path("name").asText().equals(p.manufacturer())).toList();
    if(manufacturers.size()!=1) throw new BusinessException("MANUFACTURER_UNMAPPED","商品 "+p.code()+" 的厂家尚未上传或名称不唯一");
    if(licensesOnly && repo.mappedProduct(tenantId(),id,repo.targetCode(tenantId(),id,product,p.code())).isEmpty())
      throw new BusinessException("PRODUCT_UNMAPPED","请先成功下发商品，再独立下发证照");
    String code=repo.targetCode(tenantId(),id,product,p.code());
    var productData=new LinkedHashMap<String,Object>();
    productData.put("productCode",code);productData.put("productName",p.name());
    productData.put("specModel",String.join(" / ",java.util.stream.Stream.of(p.spec(),p.model()).filter(s->!blank(s)).distinct().toList()));
    productData.put("unit",p.unit());productData.put("purchaseUnit",p.unit());productData.put("purchasePrice",p.unitPrice());
    productData.put("brand",p.brand());productData.put("manufacturerName",p.manufacturer());
    productData.put("supplierName",p.distributor());
    productData.put("manufacturerCode",manufacturers.get(0).sourceCode());productData.put("firstCategory",p.category());
    productData.put("udiCode",p.udi());productData.put("registrationNo",p.registrationNo());productData.put("contractCode",p.hospitalContractCode());
    productData.put("status",p.status());
    Map<String,Integer> lengths=Map.of("productCode",50,"productName",100,"specModel",100,"brand",50,"manufacturerName",100,"supplierName",100,"udiCode",100,"contractCode",80,"firstCategory",80);
    lengths.forEach((field,max)->{Object value=productData.get(field);if(value!=null && value.toString().length()>max) throw new BusinessException("SPD_FIELD_TOO_LONG","商品 "+p.code()+" 的 "+field+" 超过 SPD-PR 字段长度 "+max);});
    var licenseRows=db.queryForList("SELECT * FROM biz_license WHERE tenant_id=? AND (product_id=? OR (product_id IS NULL AND related_product=?))",tenantId(),product,p.name());
    if(licenseRows.stream().anyMatch(l->l.get("product_id")==null)) {
      Integer count=db.queryForObject("SELECT COUNT(*) FROM biz_product WHERE tenant_id=? AND product_name=? AND deleted=0",Integer.class,tenantId(),p.name());
      if(count!=null && count>1) throw new BusinessException("LICENSE_AMBIGUOUS","同名商品证照关联不明确，请设置证照 product_id");
    }
    var licenses=new ArrayList<Map<String,Object>>();
    if(licenseRows.size()>10) throw new BusinessException("LICENSE_LIMIT","商品 "+p.code()+" 最多同时下发10个证照");
    long attachmentBytes=0;
    for(var row:licenseRows) {
      var l=new LinkedHashMap<String,Object>();
      l.put("sourceLicenseId",row.get("id").toString());l.put("licenseCode",row.get("license_code"));l.put("licenseType",row.get("license_type"));l.put("productCode",code);
      l.put("issueDate",Objects.toString(row.get("issue_date"),null));l.put("expiryDate",Objects.toString(row.get("expiry_date"),null));
      boolean revoked=((Number)row.get("deleted")).intValue()!=0 || ((Number)row.get("status")).intValue()==2;
      l.put("status",revoked?"revoked":((Number)row.get("status")).intValue()==3 || java.time.LocalDate.parse(row.get("expiry_date").toString()).isBefore(java.time.LocalDate.now())?"expired":((Number)row.get("status")).intValue()==0?"pending":"active");
      if(!revoked) {
        String url=Objects.toString(row.get("file_url"),"");
        if(!url.startsWith("/uploads/licenses/")) throw new BusinessException("LICENSE_FILE_INVALID","证照 "+row.get("license_code")+" 缺少可下发的本地附件");
        try {
          var path=licenseRoot.resolve(url.substring("/uploads/licenses/".length())).normalize();
          if(!path.startsWith(licenseRoot) || !path.toRealPath().startsWith(licenseRoot.toRealPath()) || !Files.isRegularFile(path) || Files.size(path)>10*1024*1024)
            throw new IllegalArgumentException();
          attachmentBytes+=Files.size(path);
          if(attachmentBytes>18*1024*1024) throw new IllegalArgumentException();
          l.put("fileName",path.getFileName().toString());l.put("attachmentBase64",Base64.getEncoder().encodeToString(Files.readAllBytes(path)));
        } catch(Exception e) { throw new BusinessException("LICENSE_FILE_INVALID","证照 "+row.get("license_code")+" 附件不可读取、单文件超过10MB或商品附件合计超过18MB"); }
      }
      licenses.add(l);
      if(Objects.equals(row.get("license_code"),p.registrationNo()) && !revoked)
        productData.put("registrationExpireDate",Objects.toString(row.get("expiry_date"),null));
    }
    var payload=new LinkedHashMap<String,Object>();payload.put("productId",product);payload.put("licensesOnly",licensesOnly);
    payload.put("product",productData);payload.put("licenses",licenses);payload.put("licensesComplete",true);payload.put("sourceUpdatedAt",Instant.now().toString());
    return payload;
  }
  private boolean blank(String value) { return value==null || value.isBlank(); }
  private void send(Instance instance,SyncLog log,Object payload) {
    try {
      Receipt response=transport.send(instance,log.id(),payload);
      transactions.executeWithoutResult(status -> { repo.instance(tenantId(),instance.id(),true);applyReceipt(instance.id(),log,response); });
    } catch(BusinessException e) { transactions.executeWithoutResult(status -> repo.result(tenantId(),log.id(),"failed",e.getMessage())); }
  }
  private void applyReceipt(String instance,SyncLog log,Receipt receipt) {
    if(receipt.state().equals("processed")) {
      var payload=repo.logPayload(tenantId(),log.id());
      long product=Long.parseLong(log.sourceCode());String version=payload.path("sourceUpdatedAt").asText();
      var newer=db.queryForList("SELECT source_updated_at FROM spd_license_binding WHERE tenant_id=? AND instance_id=? AND product_id=?",String.class,tenantId(),instance,product);
      if(newer.stream().noneMatch(v->Instant.parse(v).isAfter(Instant.parse(version)))) {
        db.update("DELETE FROM spd_license_binding WHERE tenant_id=? AND instance_id=? AND product_id=?",tenantId(),instance,product);
        db.update("INSERT INTO spd_license_binding(tenant_id,instance_id,license_id,product_id,source_updated_at) VALUES(?,?,0,?,?)",tenantId(),instance,product,version);
        for(var license:payload.path("licenses")) if(!license.path("sourceLicenseId").asText().isBlank() && !license.path("status").asText().equals("revoked"))
          db.update("INSERT INTO spd_license_binding(tenant_id,instance_id,license_id,product_id,source_updated_at) VALUES(?,?,?,?,?)",tenantId(),instance,Long.parseLong(license.path("sourceLicenseId").asText()),product,version);
      }
    }
    if(receipt.state().equals("processed") && log.kind().equals("product")) {
      var payload=repo.logPayload(tenantId(),log.id());
      String code=blank(receipt.productCode())?payload.path("product").path("productCode").asText():receipt.productCode();
      var collision=repo.mappedProduct(tenantId(),instance,code);
      long product=Long.parseLong(log.sourceCode());
      String version=payload.path("sourceUpdatedAt").asText();
      var storedVersion=repo.mappingVersion(tenantId(),instance,product);
      if(storedVersion.isPresent() && Instant.parse(version).isBefore(Instant.parse(storedVersion.get()))) {
        repo.result(tenantId(),log.id(),"ignored","旧版本回执，未覆盖商品映射");return;
      }
      if(collision.isPresent() && collision.get()!=product) throw new BusinessException("MAPPING_CONFLICT","SPD-PR 商品编码已关联其他商品");
      repo.mapProduct(tenantId(),instance,product,code,version);
    }
    repo.result(tenantId(),log.id(),receipt.state(),blank(receipt.message())?switch(receipt.state()) { case "processed"->"处理成功";case "accepted"->"接口已接收，等待处理回执";default->"SPD-PR 处理失败"; }:receipt.message().substring(0,Math.min(receipt.message().length(),1000)));
  }
  @Transactional
  public SyncLog receipt(String instance,String logId,Receipt receipt) {
    active(instance,true);var log=repo.logRow(tenantId(),logId);
    if(!log.instanceId().equals(instance) || !log.direction().equals("dispatch")) throw new BusinessException("RECEIPT_INVALID","回执与实例或方向不匹配");
    if(log.state().equals("processed")) return log;
    if(!log.state().equals("accepted")) throw new BusinessException("RECEIPT_INVALID","仅已接收的下发记录可提交回执");
    applyReceipt(instance,log,receipt);return repo.logRow(tenantId(),logId);
  }
  public SyncLog retry(String logId) {
    var original=repo.logRow(tenantId(),logId);
    if(original.direction().equals("upload") && Phase2Service.KINDS.contains(original.kind())) return phase2.retry(logId);
    if(original.direction().equals("upload")) return transactions.execute(status -> retryUpload(logId));
    var attempt=transactions.execute(status -> {
      active(original.instanceId(),true);
      var log=repo.logRow(tenantId(),logId);
      if(!log.state().equals("failed")) throw new BusinessException("RETRY_INVALID","仅失败记录可重试");
      var payload=repo.logPayload(tenantId(),logId);
      if(payload.has("product")) return log;
      try {
        var rebuilt=outboundPayload(log.instanceId(),Long.parseLong(log.sourceCode()),log.kind().equals("licenses"));
        var next=repo.log(tenantId(),log.instanceId(),log.batchId(),"dispatch",log.kind(),log.sourceCode(),"pending","重试下发",rebuilt);
        repo.result(tenantId(),logId,"retried","已创建重试记录: "+next.id());return next;
      } catch(BusinessException e) {repo.result(tenantId(),logId,"failed",e.getMessage());return null;}
    });
    if(attempt==null) return repo.logRow(tenantId(),logId);
    send(active(attempt.instanceId(),false),attempt,repo.logPayload(tenantId(),attempt.id()));
    return repo.logRow(tenantId(),attempt.id());
  }
  private SyncLog retryUpload(String logId) {
    var log=repo.logRow(tenantId(),logId);var instance=active(log.instanceId(),true);
    log=repo.logRow(tenantId(),logId);
    if(!log.state().equals("failed")) throw new BusinessException("RETRY_INVALID","仅失败记录可重试");
    JsonNode payload=repo.logPayload(tenantId(),logId);
    try {
      SyncLog result;
      if(log.kind().equals("order")) { var r=mapper.treeToValue(payload,OrderRequest.class);result=store(instance.id(),"order",r.orderNo(),r.sourceUpdatedAt(),r,()->validateOrder(instance.id(),r)); }
      else { var r=mapper.treeToValue(payload,MasterRequest.class);result=store(instance.id(),log.kind(),r.sourceCode(),r.sourceUpdatedAt(),r,()->{}); }
      repo.result(tenantId(),logId,"retried","已创建重试记录: "+result.id());return result;
    } catch(com.fasterxml.jackson.core.JsonProcessingException e) { throw new BusinessException("PAYLOAD_INVALID","重试数据无法解析"); }
  }
}
