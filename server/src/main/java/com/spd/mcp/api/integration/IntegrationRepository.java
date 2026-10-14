package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.BusinessException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

@Repository
public class IntegrationRepository {
  private final JdbcTemplate db;
  private final ObjectMapper mapper;
  public IntegrationRepository(JdbcTemplate db, ObjectMapper mapper) { this.db = db; this.mapper = mapper; }
  public String json(Object value) {
    try { return mapper.writeValueAsString(value); } catch (Exception e) { throw new IllegalArgumentException("Invalid sync payload", e); }
  }
  public JsonNode parse(String value) {
    try { return mapper.readTree(value); } catch (Exception e) { throw new IllegalStateException("Invalid stored sync payload", e); }
  }
  public List<Instance> instances(long tenant) {
    return db.query("SELECT * FROM spd_instance WHERE tenant_id=? ORDER BY created_time", (rs,n) -> new Instance(
        rs.getString("id"),rs.getString("name"),rs.getString("organization"),rs.getString("endpoint"),rs.getString("token_env"),rs.getBoolean("enabled")),tenant);
  }
  public Instance instance(long tenant, String id, boolean lock) {
    return db.query("SELECT * FROM spd_instance WHERE tenant_id=? AND id=?" + (lock ? " FOR UPDATE" : ""), (rs,n) -> new Instance(
        rs.getString("id"),rs.getString("name"),rs.getString("organization"),rs.getString("endpoint"),rs.getString("token_env"),rs.getBoolean("enabled")),tenant,id)
        .stream().findFirst().orElseThrow(() -> new BusinessException("INSTANCE_NOT_FOUND", "对接实例不存在"));
  }
  public void saveInstance(long tenant, String id, InstanceRequest r, boolean create) {
    if (create) db.update("INSERT INTO spd_instance(id,tenant_id,name,organization,endpoint,token_env,enabled) VALUES(?,?,?,?,?,?,?)",
        id,tenant,r.name(),r.organization(),r.endpoint(),r.tokenEnv(),r.enabled());
    else db.update("UPDATE spd_instance SET name=?,endpoint=?,token_env=?,enabled=? WHERE tenant_id=? AND id=?",
        r.name(),r.endpoint(),r.tokenEnv(),r.enabled(),tenant,id);
  }
  public List<StoredRecord> records(long tenant, String instance, String kind) {
    return db.query("SELECT * FROM spd_record WHERE tenant_id=? AND instance_id=? AND kind=? ORDER BY source_code", (rs,n) -> new StoredRecord(
        rs.getString("instance_id"),rs.getString("kind"),rs.getString("source_code"),rs.getString("source_updated_at"),parse(rs.getString("payload"))),tenant,instance,kind);
  }
  public Optional<StoredRecord> record(long tenant, String instance, String kind, String code) {
    return db.query("SELECT * FROM spd_record WHERE tenant_id=? AND instance_id=? AND kind=? AND source_code=?", (rs,n) -> new StoredRecord(
        rs.getString("instance_id"),rs.getString("kind"),rs.getString("source_code"),rs.getString("source_updated_at"),parse(rs.getString("payload"))),tenant,instance,kind,code).stream().findFirst();
  }
  public void saveRecord(long tenant, String instance, String kind, String code, String timestamp, Object payload) {
    db.update("INSERT INTO spd_record(id,tenant_id,instance_id,kind,source_code,source_updated_at,payload) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE source_updated_at=VALUES(source_updated_at),payload=VALUES(payload)",
        UUID.randomUUID().toString(),tenant,instance,kind,code,timestamp,json(payload));
  }
  public Optional<Long> mappedProduct(long tenant,String instance,String code) {
    return db.query("SELECT product_id FROM spd_product_mapping WHERE tenant_id=? AND instance_id=? AND source_code=?",(rs,n)->rs.getLong(1),tenant,instance,code).stream().findFirst();
  }
  public String targetCode(long tenant,String instance,long product,String fallback) {
    return db.query("SELECT source_code FROM spd_product_mapping WHERE tenant_id=? AND instance_id=? AND product_id=?",(rs,n)->rs.getString(1),tenant,instance,product).stream().findFirst().orElse(fallback);
  }
  public Optional<String> mappingVersion(long tenant,String instance,long product) {
    return db.query("SELECT source_updated_at FROM spd_product_mapping WHERE tenant_id=? AND instance_id=? AND product_id=?",(rs,n)->rs.getString(1),tenant,instance,product).stream().findFirst();
  }
  public void mapProduct(long tenant,String instance,long product,String code,String version) {
    db.update("INSERT INTO spd_product_mapping(tenant_id,instance_id,product_id,source_code,source_updated_at) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE source_code=VALUES(source_code),source_updated_at=VALUES(source_updated_at)",tenant,instance,product,code,version);
  }
  public SyncLog log(long tenant,String instance,String batch,String direction,String kind,String code,String state,String message,Object payload) {
    String id=UUID.randomUUID().toString();
    db.update("INSERT INTO spd_sync_log(id,tenant_id,instance_id,batch_id,direction,kind,source_code,state,message,payload) VALUES(?,?,?,?,?,?,?,?,?,?)",
        id,tenant,instance,batch,direction,kind,code,state,message,json(payload));
    return logRow(tenant,id);
  }
  public SyncLog logRow(long tenant,String id) {
    return db.query("SELECT * FROM spd_sync_log WHERE tenant_id=? AND id=?",(rs,n)->new SyncLog(rs.getString("id"),rs.getString("batch_id"),rs.getString("instance_id"),rs.getString("direction"),rs.getString("kind"),rs.getString("source_code"),rs.getString("state"),rs.getString("message"),rs.getString("created_time")),tenant,id)
        .stream().findFirst().orElseThrow(()->new BusinessException("LOG_NOT_FOUND","同步记录不存在"));
  }
  public JsonNode logPayload(long tenant,String id) {
    return parse(db.queryForObject("SELECT payload FROM spd_sync_log WHERE tenant_id=? AND id=?",String.class,tenant,id));
  }
  public List<SyncLog> logs(long tenant,String instance) {
    return db.query("SELECT * FROM spd_sync_log WHERE tenant_id=? AND instance_id=? ORDER BY created_time DESC,id DESC LIMIT 500",(rs,n)->new SyncLog(rs.getString("id"),rs.getString("batch_id"),rs.getString("instance_id"),rs.getString("direction"),rs.getString("kind"),rs.getString("source_code"),rs.getString("state"),rs.getString("message"),rs.getString("created_time")),tenant,instance);
  }
  public void result(long tenant,String id,String state,String message) {
    db.update("UPDATE spd_sync_log SET state=?,message=? WHERE tenant_id=? AND id=?",state,message,tenant,id);
  }
}
