package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.product.ProductRepository;
import com.spd.mcp.api.tenant.TenantContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

@Service
public class IntegrationReportService {
  public record Group(String productCode,String productName,String manufacturer,String unit,String currency,boolean taxIncluded,
      long orderCount,BigDecimal quantity,BigDecimal amount) {}
  public record Price(String date,String productCode,String productName,String unit,String currency,boolean taxIncluded,BigDecimal unitPrice) {}
  public record Report(long orderCount,List<Group> groups,List<Price> prices) {}
  private final IntegrationRepository repo;
  private final TenantContext tenant;
  private final ProductRepository products;
  private final ObjectMapper mapper;
  public IntegrationReportService(IntegrationRepository repo,TenantContext tenant,ProductRepository products,ObjectMapper mapper) {this.repo=repo;this.tenant=tenant;this.products=products;this.mapper=mapper;}
  public Report report(String instance,LocalDate from,LocalDate to,String supplier,String product,String manufacturer) {
    long t=tenant.currentTenantId();repo.instance(t,instance,false);
    Map<List<String>,Accumulator> groups=new LinkedHashMap<>(),prices=new TreeMap<>(Comparator.comparing(Object::toString));
    Set<String> orders=new HashSet<>();
    for(var stored:repo.records(t,instance,"order")) {
      OrderRequest order;
      try { order=mapper.treeToValue(stored.payload(),OrderRequest.class); } catch(Exception e) { throw new IllegalStateException(e); }
      if(!IntegrationRules.reportable(order.status()) || (from!=null && order.orderDate().isBefore(from)) || (to!=null && order.orderDate().isAfter(to)) || (supplier!=null && !supplier.isBlank() && !order.supplierCode().equals(supplier))) continue;
      for(var line:order.items()) {
        if(product!=null && !product.isBlank() && !line.productCode().contains(product)) continue;
        var productId=repo.mappedProduct(t,instance,line.productCode());
        var p=productId.flatMap(id->products.findById(t,id));
        String name=p.map(com.spd.mcp.api.product.ProductDto::name).orElse(line.productCode());
        String factory=p.map(com.spd.mcp.api.product.ProductDto::manufacturer).orElse("");
        if(manufacturer!=null && !manufacturer.isBlank() && !factory.contains(manufacturer)) continue;
        orders.add(order.orderNo());
        var key=List.of(line.productCode(),name,factory,line.unit(),order.currency(),order.taxIncluded().toString());
        groups.computeIfAbsent(key,k->new Accumulator()).add(order.orderNo(),line);
        var priceKey=new ArrayList<>(key);priceKey.add(order.orderDate().toString());
        prices.computeIfAbsent(priceKey,k->new Accumulator()).add(order.orderNo(),line);
      }
    }
    var rows=groups.entrySet().stream().map(e->new Group(e.getKey().get(0),e.getKey().get(1),e.getKey().get(2),e.getKey().get(3),e.getKey().get(4),Boolean.parseBoolean(e.getKey().get(5)),e.getValue().orders.size(),e.getValue().qty,e.getValue().amount)).toList();
    var trend=prices.entrySet().stream().map(e->new Price(e.getKey().get(6),e.getKey().get(0),e.getKey().get(1),e.getKey().get(3),e.getKey().get(4),Boolean.parseBoolean(e.getKey().get(5)),e.getValue().priceTotal.divide(e.getValue().qty,6,RoundingMode.HALF_UP))).toList();
    return new Report(orders.size(),rows,trend);
  }
  private static class Accumulator {
    Set<String> orders=new HashSet<>();BigDecimal qty=BigDecimal.ZERO,amount=BigDecimal.ZERO,priceTotal=BigDecimal.ZERO;
    void add(String order,OrderItem item) {orders.add(order);qty=qty.add(item.quantity());amount=amount.add(item.amount());priceTotal=priceTotal.add(item.unitPrice().multiply(item.quantity()));}
  }
}
