package com.spd.mcp.api.integration;

import com.spd.mcp.api.tenant.TenantContext;
import com.spd.mcp.api.product.ProductRepository;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.spd.mcp.api.integration.Phase2Types.*;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

/** Reads fulfillment facts independently from current balances; never adds inbound movements to stock. */
@Service
public class Phase2ReportService {
  public record Execution(String orderNo,String lineId,String supplierCode,String productCode,String productName,String unit,
      BigDecimal ordered,BigDecimal received,BigDecimal qualified,BigDecimal rejected,BigDecimal inbound,BigDecimal returned,
      BigDecimal remaining,BigDecimal arrivalRate,BigDecimal qualificationRate,BigDecimal returnRate) {}
  public record PurchaseAmount(String currency,boolean taxIncluded,String amountOrigin,BigDecimal inboundAmount,BigDecimal returnAmount,BigDecimal netAmount) {}
  public record SupplierPerformance(String supplierCode,String productCode,String productName,String unit,long orderCount,
      BigDecimal ordered,BigDecimal received,BigDecimal qualified,BigDecimal rejected,BigDecimal inbound,BigDecimal returned,
      BigDecimal arrivalRate,BigDecimal qualificationRate,BigDecimal returnRate) {}
  public record InventoryRow(StockLine stock,String productName,String manufacturer,String expiryStatus,Long daysToExpiry) {}
  public record Report(List<Execution> execution,List<SupplierPerformance> suppliers,List<PurchaseAmount> amounts,String inventoryUpdatedAt,String inventoryCurrency,
      Boolean inventoryTaxIncluded,String valuationBasis,List<InventoryRow> inventory) {}
  private final Phase2Service service;
  private final IntegrationRepository repo;
  private final TenantContext tenant;
  private final ProductRepository products;
  public Phase2ReportService(Phase2Service service,IntegrationRepository repo,TenantContext tenant,ProductRepository products) {this.service=service;this.repo=repo;this.tenant=tenant;this.products=products;}
  @org.springframework.transaction.annotation.Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
  public Report report(String instance,LocalDate from,LocalDate to,String supplier,String product,String manufacturer,String warehouse) {
    repo.instance(tenant.currentTenantId(),instance,false);
    var receipts=service.all(instance,"receiving",Receiving.class);
    var inbounds=service.all(instance,"inbound",Inbound.class);
    var returns=service.all(instance,"return",PurchaseReturn.class);
    var receiptMap=new HashMap<String,Receiving>();receipts.forEach(r->receiptMap.put(r.documentNo(),r));
    var receiptsByOrder=new HashMap<String,List<Receiving>>();receipts.forEach(r->receiptsByOrder.computeIfAbsent(r.orderNo(),k->new ArrayList<>()).add(r));
    var inboundsByOrder=new HashMap<String,List<Inbound>>();inbounds.forEach(r->{var receipt=receiptMap.get(r.receivingNo());if(receipt!=null)inboundsByOrder.computeIfAbsent(receipt.orderNo(),k->new ArrayList<>()).add(r);});
    var returnsByInbound=new HashMap<String,List<PurchaseReturn>>();returns.forEach(r->returnsByInbound.computeIfAbsent(r.inboundNo(),k->new ArrayList<>()).add(r));
    var execution=new ArrayList<Execution>();var amountGroups=new LinkedHashMap<List<String>,BigDecimal[]>();
    for(var stored:repo.records(tenant.currentTenantId(),instance,"order")) {
      var order=service.decode(stored.payload(),OrderRequest.class);
      if(!matches(supplier,order.supplierCode())) continue;
      for(var line:order.items()) {
        var mapping=repo.mappedProduct(tenant.currentTenantId(),instance,line.productCode());
        var p=mapping.flatMap(id->products.findById(tenant.currentTenantId(),id));
        String name=p.map(com.spd.mcp.api.product.ProductDto::name).orElse(line.productCode());
        String factory=p.map(com.spd.mcp.api.product.ProductDto::manufacturer).orElse("");
        if(!contains(product,line.productCode()) || !contains(manufacturer,factory)) continue;
        BigDecimal received=BigDecimal.ZERO,qualified=BigDecimal.ZERO,rejected=BigDecimal.ZERO,inboundQty=BigDecimal.ZERO,returnedQty=BigDecimal.ZERO;
        boolean receiptDatesKnown=true;
        for(var r:receiptsByOrder.getOrDefault(order.orderNo(),List.of())) if(r.status().equals("approved") || r.status().equals("rejected"))
          for(var item:r.items()) if(item.orderLineId().equals(line.lineId())) {received=received.add(item.quantity());qualified=qualified.add(item.qualifiedQuantity());rejected=rejected.add(item.rejectedQuantity());if(r.receivedDate()==null) receiptDatesKnown=false;}
        for(var inbound:inboundsByOrder.getOrDefault(order.orderNo(),List.of())) {
          var receipt=receiptMap.get(inbound.receivingNo());
          if(receipt==null || !receipt.orderNo().equals(order.orderNo()) || !receipt.status().equals("approved") || !inbound.status().equals("completed")) continue;
          for(var item:inbound.items()) {
            var receiptLine=receipt.items().stream().filter(i->i.lineId().equals(item.receivingLineId())).findFirst();
            if(receiptLine.isEmpty() || !receiptLine.get().orderLineId().equals(line.lineId())) continue;
            inboundQty=inboundQty.add(item.quantity());
            if(date(from,to,inbound.documentDate()) && contains(warehouse,inbound.warehouseCode())) addAmount(amountGroups,inbound.currency(),inbound.taxIncluded(),inbound.amountOrigin(),0,item.amount());
            for(var returned:returnsByInbound.getOrDefault(inbound.documentNo(),List.of())) if(returned.status().equals("completed"))
              for(var ri:returned.items()) if(ri.inboundLineId().equals(item.lineId())) {
                returnedQty=returnedQty.add(ri.quantity());
                if(date(from,to,returned.documentDate()) && contains(warehouse,returned.warehouseCode())) addAmount(amountGroups,returned.currency(),returned.taxIncluded(),inbound.amountOrigin(),1,ri.amount());
              }
          }
        }
        if(IntegrationRules.reportable(order.status()) && date(from,to,order.orderDate())) execution.add(new Execution(order.orderNo(),line.lineId(),order.supplierCode(),line.productCode(),name,line.unit(),line.quantity(),received,qualified,rejected,inboundQty,returnedQty,
            line.quantity().subtract(qualified).max(BigDecimal.ZERO),receiptDatesKnown?rate(received,line.quantity()):null,rate(qualified,received),rate(returnedQty,inboundQty)));
      }
    }
    var amounts=amountGroups.entrySet().stream().map(e->new PurchaseAmount(e.getKey().get(0),Boolean.parseBoolean(e.getKey().get(1)),e.getKey().get(2),e.getValue()[0],e.getValue()[1],e.getValue()[0].subtract(e.getValue()[1]))).toList();
    var stock=repo.record(tenant.currentTenantId(),instance,"inventory","current");
    Inventory inventory=stock.map(r->service.decode(r.payload(),Inventory.class)).orElse(null);
    var inventoryRows=new ArrayList<InventoryRow>();
    if(inventory!=null) for(var line:inventory.items()) {
      var p=repo.mappedProduct(tenant.currentTenantId(),instance,line.productCode()).flatMap(id->products.findById(tenant.currentTenantId(),id));
      String name=p.map(com.spd.mcp.api.product.ProductDto::name).orElse(line.productCode()),factory=p.map(com.spd.mcp.api.product.ProductDto::manufacturer).orElse("");
      if(!contains(product,line.productCode()) || !contains(manufacturer,factory) || !contains(warehouse,line.warehouseCode())) continue;
      Long days=line.expiryDate()==null?null:java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(ZoneId.of("Asia/Shanghai")),line.expiryDate());
      String status=line.availableQuantity().signum()==0?"empty":days==null?"unknown":days<0?"expired":days<=90?"near_expiry":"normal";
      inventoryRows.add(new InventoryRow(line,name,factory,status,days));
    }
    return new Report(execution,supplierRows(execution),amounts,stock.map(StoredRecord::sourceUpdatedAt).orElse(null),inventory==null?null:inventory.currency(),inventory==null?null:inventory.taxIncluded(),inventory==null?null:inventory.valuationBasis(),inventoryRows);
  }
  private static List<SupplierPerformance> supplierRows(List<Execution> execution) {
    var groups=new LinkedHashMap<List<String>,List<Execution>>();
    for(var e:execution) groups.computeIfAbsent(List.of(e.supplierCode(),e.productCode(),e.productName(),e.unit()),k->new ArrayList<>()).add(e);
    var result=new ArrayList<SupplierPerformance>();
    for(var entry:groups.entrySet()) {
      BigDecimal ordered=BigDecimal.ZERO,received=BigDecimal.ZERO,qualified=BigDecimal.ZERO,rejected=BigDecimal.ZERO,inbound=BigDecimal.ZERO,returned=BigDecimal.ZERO;
      var orders=new HashSet<String>();boolean datesKnown=true;
      for(var e:entry.getValue()){orders.add(e.orderNo());ordered=ordered.add(e.ordered());received=received.add(e.received());qualified=qualified.add(e.qualified());rejected=rejected.add(e.rejected());inbound=inbound.add(e.inbound());returned=returned.add(e.returned());if(e.arrivalRate()==null)datesKnown=false;}
      var k=entry.getKey();result.add(new SupplierPerformance(k.get(0),k.get(1),k.get(2),k.get(3),orders.size(),ordered,received,qualified,rejected,inbound,returned,datesKnown?rate(received,ordered):null,rate(qualified,received),rate(returned,inbound)));
    }
    return result;
  }
  private static BigDecimal rate(BigDecimal n,BigDecimal d){return d.signum()==0?null:n.multiply(new BigDecimal("100")).divide(d,2,RoundingMode.HALF_UP);}
  private static boolean date(LocalDate from,LocalDate to,LocalDate d){return (from==null || !d.isBefore(from)) && (to==null || !d.isAfter(to));}
  private static boolean matches(String filter,String value){return filter==null || filter.isBlank() || filter.equals(value);}
  private static boolean contains(String filter,String value){return filter==null || filter.isBlank() || value.contains(filter);}
  private static void addAmount(Map<List<String>,BigDecimal[]> groups,String currency,boolean tax,String origin,int index,BigDecimal amount){var totals=groups.computeIfAbsent(List.of(currency,Boolean.toString(tax),origin),k->new BigDecimal[]{BigDecimal.ZERO,BigDecimal.ZERO});totals[index]=totals[index].add(amount);}
}
