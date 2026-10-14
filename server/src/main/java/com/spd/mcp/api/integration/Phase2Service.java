package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.*;
import com.spd.mcp.api.common.BusinessException;
import com.spd.mcp.api.tenant.TenantContext;
import com.spd.mcp.api.product.ProductRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.spd.mcp.api.integration.Phase2Types.*;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

/** Validates complete fulfillment documents and atomically replaces the current inventory snapshot. */
@Service
public class Phase2Service {
  public static final Set<String> KINDS=Set.of("receiving","inbound","return","inventory");
  private final IntegrationRepository repo;
  private final TenantContext tenant;
  private final ProductRepository products;
  private final ObjectMapper mapper;
  public Phase2Service(IntegrationRepository repo,TenantContext tenant,ProductRepository products,ObjectMapper mapper) {this.repo=repo;this.tenant=tenant;this.products=products;this.mapper=mapper;}
  private long t(){return tenant.currentTenantId();}
  public <T> T decode(JsonNode node,Class<T> type) {try{return mapper.treeToValue(node,type);}catch(Exception e){throw new BusinessException("SYNC_PAYLOAD_INVALID","同步数据格式不合法");}}
  public <T> T required(String instance,String kind,String code,Class<T> type) {return repo.record(t(),instance,kind,code).map(r->decode(r.payload(),type)).orElseThrow(()->new BusinessException("SYNC_RELATION_MISSING",kind+" 单据未上传: "+code));}
  public <T> List<T> all(String instance,String kind,Class<T> type) {return repo.records(t(),instance,kind).stream().map(r->decode(r.payload(),type)).toList();}
  public static boolean live(String status){return !Set.of("draft","cancelled","voided").contains(status);}
  private void check(boolean ok,String message){if(!ok) throw new BusinessException("SYNC_VALIDATION_FAILED",message);}
  private void dates(java.time.LocalDate production,java.time.LocalDate expiry){check(production==null || expiry==null || !production.isAfter(expiry),"生产日期不能晚于有效期");}
  public void validateOrderAmendment(String instance,OrderRequest order) {
    var quantities=new HashMap<String,BigDecimal>();
    for(var r:all(instance,"receiving",Receiving.class)) if(r.orderNo().equals(order.orderNo()) && (r.status().equals("approved") || r.status().equals("rejected"))) {
      check(r.supplierCode().equals(order.supplierCode()),"已有收货验收，采购订单不能更换供应商");
      for(var line:r.items()) {
        var parent=order.items().stream().filter(i->i.lineId().equals(line.orderLineId())).findFirst().orElseThrow(()->new BusinessException("ORDER_LINE_IN_USE","已收货的采购明细不能删除"));
        check(parent.productCode().equals(line.productCode()) && parent.unit().equals(line.unit()),"已收货的采购明细不能更换商品或单位");
        if(r.status().equals("approved")){quantities.merge(line.orderLineId(),line.qualifiedQuantity(),BigDecimal::add);check(quantities.get(line.orderLineId()).compareTo(parent.quantity())<=0,"采购数量不能小于已验收合格数量");}
      }
      for(var inbound:all(instance,"inbound",Inbound.class)) if(inbound.receivingNo().equals(r.documentNo()) && inbound.status().equals("completed"))
        check(inbound.currency().equals(order.currency()) && inbound.taxIncluded().equals(order.taxIncluded()),"已有实际入库，不能更换采购币种或含税口径");
    }
  }
  private void unique(Set<String> ids,String id){check(ids.add(id),"明细身份重复: "+id);}
  @Transactional public SyncLog upload(String instance,String kind,Object payload) {
    check(KINDS.contains(kind),"第二期对象类型不合法");
    var config=repo.instance(t(),instance,true);check(config.enabled(),"对接实例已停用");
    String code;Instant version;
    if(payload instanceof Receiving r){code=r.documentNo();version=r.sourceUpdatedAt();}
    else if(payload instanceof Inbound r){code=r.documentNo();version=r.sourceUpdatedAt();}
    else if(payload instanceof PurchaseReturn r){code=r.documentNo();version=r.sourceUpdatedAt();}
    else if(payload instanceof Inventory r){code="current";version=r.sourceUpdatedAt();}
    else throw new BusinessException("SYNC_PAYLOAD_INVALID","同步数据类型不合法");
    var previous=repo.record(t(),instance,kind,code);
    if(previous.isPresent() && !version.isAfter(Instant.parse(previous.get().sourceUpdatedAt())))
      return repo.log(t(),instance,UUID.randomUUID().toString(),"upload",kind,code,"ignored","重复或旧版本，未覆盖已保存数据",auditPayload(payload));
    try {
      if(payload instanceof Receiving r) validateReceiving(instance,r);
      else if(payload instanceof Inbound r) validateInbound(instance,r);
      else if(payload instanceof PurchaseReturn r) validateReturn(instance,r);
      else if(payload instanceof Inventory r) validateInventory(instance,r);
    } catch(BusinessException e){return repo.log(t(),instance,UUID.randomUUID().toString(),"upload",kind,code,"failed",e.getMessage(),payload);}
    repo.saveRecord(t(),instance,kind,code,version.toString(),payload);
    return repo.log(t(),instance,UUID.randomUUID().toString(),"upload",kind,code,"processed","处理成功",auditPayload(payload));
  }
  private Object auditPayload(Object payload) {
    if(payload instanceof Inventory r) return Map.of("rowCount",r.items().size(),"sourceUpdatedAt",r.sourceUpdatedAt().toString(),"currency",r.currency(),"taxIncluded",r.taxIncluded(),"valuationBasis",r.valuationBasis());
    return payload;
  }
  private void validateReceiving(String instance,Receiving r) {
    var priorReceiving=repo.record(t(),instance,"receiving",r.documentNo()).map(stored->decode(stored.payload(),Receiving.class)).orElse(null);
    repo.record(t(),instance,"receiving",r.documentNo()).ifPresent(stored->{var old=decode(stored.payload(),Receiving.class);if(old.status().equals("approved") || old.status().equals("rejected")) check(old.orderNo().equals(r.orderNo()) && old.warehouseCode().equals(r.warehouseCode()),"已处理的收货单不能更换原采购订单或仓库");});
    OrderRequest order=required(instance,"order",r.orderNo(),OrderRequest.class);
    check(order.supplierCode().equals(r.supplierCode()),"收货供应商与采购订单不一致");
    if(r.status().equals("approved")) check(r.receivedDate()!=null,"验收通过单据必须有实际收货日期");
    var ids=new HashSet<String>();
    var totals=new HashMap<String,BigDecimal>();
    for(var other:all(instance,"receiving",Receiving.class)) if(!other.documentNo().equals(r.documentNo()) && other.orderNo().equals(r.orderNo()) && other.status().equals("approved"))
      for(var line:other.items()) totals.merge(line.orderLineId(),line.qualifiedQuantity(),BigDecimal::add);
    for(var line:r.items()) {
      unique(ids,line.lineId());
      var parent=order.items().stream().filter(i->i.lineId().equals(line.orderLineId())).findFirst().orElseThrow(()->new BusinessException("ORDER_LINE_MISSING","采购明细无法唯一关联: "+line.orderLineId()));
      check(parent.productCode().equals(line.productCode()) && parent.unit().equals(line.unit()),"收货商品或单位与原采购明细不一致");
      check(line.qualifiedQuantity().add(line.rejectedQuantity()).compareTo(line.quantity())<=0,"验收合格及不合格数量超过收货数量");
      if(r.status().equals("approved") || r.status().equals("rejected")) check(line.qualifiedQuantity().add(line.rejectedQuantity()).compareTo(line.quantity())==0,"已处理验收数量必须完整分配");
      if(r.status().equals("rejected")) check(line.qualifiedQuantity().signum()==0,"拒收单不能有合格数量");
      if(r.status().equals("approved")) {
        totals.merge(line.orderLineId(),line.qualifiedQuantity(),BigDecimal::add);
        check(totals.get(line.orderLineId()).compareTo(parent.quantity())<=0,"累计验收合格数量超过采购数量");
      }
    }
    var inboundTotals=new HashMap<String,BigDecimal>();
    for(var inbound:all(instance,"inbound",Inbound.class)) if(inbound.receivingNo().equals(r.documentNo()) && inbound.status().equals("completed")) {
      check(r.status().equals("approved"),"存在有效入库单，不能撤销验收");
      check(inbound.warehouseCode().equals(r.warehouseCode()),"已入库的收货单不能更换仓库");
      for(var line:inbound.items()) {
        var oldLine=priorReceiving==null?null:priorReceiving.items().stream().filter(i->i.lineId().equals(line.receivingLineId())).findFirst().orElse(null);
        check(oldLine!=null && r.items().stream().anyMatch(i->i.lineId().equals(line.receivingLineId()) && i.orderLineId().equals(oldLine.orderLineId()) && i.productCode().equals(line.productCode()) && i.unit().equals(line.unit())),"已入库的收货明细不能删除或更换原采购明细、商品单位");
        inboundTotals.merge(line.receivingLineId(),line.quantity(),BigDecimal::add);
      }
    }
    for(var line:r.items()) check(inboundTotals.getOrDefault(line.lineId(),BigDecimal.ZERO).compareTo(line.qualifiedQuantity())<=0,"验收合格数量不能小于已入库数量");
  }
  private void validateInbound(String instance,Inbound r) {
    var priorInbound=repo.record(t(),instance,"inbound",r.documentNo()).map(stored->decode(stored.payload(),Inbound.class)).orElse(null);
    repo.record(t(),instance,"inbound",r.documentNo()).ifPresent(stored->{var old=decode(stored.payload(),Inbound.class);if(old.status().equals("completed")) check(old.receivingNo().equals(r.receivingNo()) && old.warehouseCode().equals(r.warehouseCode()),"已完成入库不能更换原收货单或仓库");});
    var receipt=required(instance,"receiving",r.receivingNo(),Receiving.class);
    var order=required(instance,"order",receipt.orderNo(),OrderRequest.class);
    check(receipt.warehouseCode().equals(r.warehouseCode()),"入库仓库与收货仓库不一致");
    check(order.currency().equals(r.currency()) && order.taxIncluded().equals(r.taxIncluded()),"入库金额币种或含税口径与订单不一致");
    if(r.status().equals("completed")) check(receipt.status().equals("approved"),"仅验收通过的收货单可入库");
    var totals=new HashMap<String,BigDecimal>();var ids=new HashSet<String>();
    for(var other:all(instance,"inbound",Inbound.class)) if(!other.documentNo().equals(r.documentNo()) && other.receivingNo().equals(r.receivingNo()) && other.status().equals("completed"))
      for(var line:other.items()) totals.merge(line.receivingLineId(),line.quantity(),BigDecimal::add);
    for(var line:r.items()) {
      unique(ids,line.lineId());dates(line.productionDate(),line.expiryDate());
      var parent=receipt.items().stream().filter(i->i.lineId().equals(line.receivingLineId())).findFirst().orElseThrow(()->new BusinessException("RECEIVING_LINE_MISSING","收货明细未找到: "+line.receivingLineId()));
      check(parent.productCode().equals(line.productCode()) && parent.unit().equals(line.unit()),"入库商品或单位与验收明细不一致");
      if(r.status().equals("completed")) {totals.merge(line.receivingLineId(),line.quantity(),BigDecimal::add);check(totals.get(line.receivingLineId()).compareTo(parent.qualifiedQuantity())<=0,"累计入库数量超过验收合格数量");}
    }
    var returnTotals=new HashMap<String,BigDecimal>();
    for(var returned:all(instance,"return",PurchaseReturn.class)) if(returned.inboundNo().equals(r.documentNo()) && returned.status().equals("completed")) {
      check(r.status().equals("completed"),"存在有效退货单，不能撤销原入库");
      check(returned.currency().equals(r.currency()) && returned.taxIncluded().equals(r.taxIncluded()),"已退货的入库不能更换金额口径");
      for(var line:returned.items()) {
        var oldLine=priorInbound==null?null:priorInbound.items().stream().filter(i->i.lineId().equals(line.inboundLineId())).findFirst().orElse(null);
        check(oldLine!=null && r.items().stream().anyMatch(i->i.lineId().equals(line.inboundLineId()) && i.receivingLineId().equals(oldLine.receivingLineId()) && i.productCode().equals(line.productCode()) && i.unit().equals(line.unit()) && i.systemBatchNo().equals(line.systemBatchNo())),"已退货的入库明细不能删除或更换原验收明细、商品单位和批次");
        returnTotals.merge(line.inboundLineId(),line.quantity(),BigDecimal::add);
      }
    }
    for(var line:r.items()) check(returnTotals.getOrDefault(line.lineId(),BigDecimal.ZERO).compareTo(line.quantity())<=0,"入库数量不能小于已退货数量");
  }
  private void validateReturn(String instance,PurchaseReturn r) {
    repo.record(t(),instance,"return",r.documentNo()).ifPresent(stored->{var old=decode(stored.payload(),PurchaseReturn.class);if(old.status().equals("completed")) check(old.inboundNo().equals(r.inboundNo()) && old.warehouseCode().equals(r.warehouseCode()),"已完成退货不能更换原入库单或仓库");});
    var inbound=required(instance,"inbound",r.inboundNo(),Inbound.class);
    check(inbound.warehouseCode().equals(r.warehouseCode()),"退货仓库与原入库不一致");
    check(inbound.currency().equals(r.currency()) && inbound.taxIncluded().equals(r.taxIncluded()),"退货金额口径与原入库不一致");
    if(r.status().equals("completed")) check(inbound.status().equals("completed"),"原入库尚未完成");
    var totals=new HashMap<String,BigDecimal>();var ids=new HashSet<String>();
    for(var other:all(instance,"return",PurchaseReturn.class)) if(!other.documentNo().equals(r.documentNo()) && other.inboundNo().equals(r.inboundNo()) && other.status().equals("completed"))
      for(var line:other.items()) totals.merge(line.inboundLineId(),line.quantity(),BigDecimal::add);
    for(var line:r.items()) {
      unique(ids,line.lineId());
      var parent=inbound.items().stream().filter(i->i.lineId().equals(line.inboundLineId())).findFirst().orElseThrow(()->new BusinessException("INBOUND_LINE_MISSING","原入库明细未找到"));
      check(parent.productCode().equals(line.productCode()) && parent.unit().equals(line.unit()) && parent.systemBatchNo().equals(line.systemBatchNo()),"退货商品、单位或批次与原入库不一致");
      if(r.status().equals("completed")) {totals.merge(line.inboundLineId(),line.quantity(),BigDecimal::add);check(totals.get(line.inboundLineId()).compareTo(parent.quantity())<=0,"累计退货数量超过原入库数量");}
    }
  }
  private void validateInventory(String instance,Inventory r) {
    var ids=new HashSet<List<String>>();
    for(var line:r.items()) {
      check(ids.add(List.of(line.warehouseCode(),line.productCode(),line.systemBatchNo())),"库存仓库商品批次身份重复");dates(line.productionDate(),line.expiryDate());
      long product=repo.mappedProduct(t(),instance,line.productCode()).orElseThrow(()->new BusinessException("PRODUCT_UNMAPPED","库存商品未匹配: "+line.productCode()));
      var p=products.findById(t(),product).orElseThrow(()->new BusinessException("PRODUCT_NOT_FOUND","库存商品不存在"));
      check(p.unit().equals(line.unit()),"库存单位与商品单位不一致");
    }
  }
  @Transactional public SyncLog retry(String id) {
    var log=repo.logRow(t(),id);check(log.state().equals("failed") && log.direction().equals("upload") && KINDS.contains(log.kind()),"仅失败的第二期上传可重试");
    var node=repo.logPayload(t(),id);
    Object request=switch(log.kind()){case "receiving"->decode(node,Receiving.class);case "inbound"->decode(node,Inbound.class);case "return"->decode(node,PurchaseReturn.class);default->decode(node,Inventory.class);};
    var result=upload(log.instanceId(),log.kind(),request);repo.result(t(),id,"retried","已创建重试记录: "+result.id());return result;
  }
}
