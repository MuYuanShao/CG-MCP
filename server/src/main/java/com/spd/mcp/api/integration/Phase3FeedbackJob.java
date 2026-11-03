package com.spd.mcp.api.integration;

import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

/** Retries durable supplier feedback after commit; never executes hospital business approvals. */
@Component
public class Phase3FeedbackJob {
    private final JdbcTemplate db;private final IntegrationRepository repo;private final Environment env;private final TransactionTemplate tx;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
    public Phase3FeedbackJob(JdbcTemplate db,IntegrationRepository repo,Environment env,PlatformTransactionManager manager){this.db=db;this.repo=repo;this.env=env;this.tx=new TransactionTemplate(manager);}
    @Scheduled(fixedDelayString="${app.phase3.feedback-delay-ms:5000}") public synchronized void deliver(){
        if(!env.getProperty("APP_PHASE3_ENABLED",Boolean.class,false))return;
        long end=System.nanoTime()+Duration.ofSeconds(30).toNanos();
        while(System.nanoTime()<end){
            String lease=UUID.randomUUID().toString();var row=tx.execute(status->{
                var rows=db.queryForList("SELECT * FROM spd_phase3_feedback WHERE (state IN ('pending','failed') AND next_attempt<=NOW(6)) OR (state='sending' AND lease_until<NOW(6)) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED");
                if(rows.isEmpty())return null;var found=rows.get(0);db.update("UPDATE spd_phase3_feedback SET state='sending',lease_id=?,lease_until=DATE_ADD(NOW(6),INTERVAL 60 SECOND),attempts=attempts+1 WHERE message_id=?",lease,found.get("message_id"));return found;
            });
            if(row==null)return;
            try {
                var instance=repo.instance(((Number)row.get("tenant_id")).longValue(),row.get("instance_id").toString(),false);
                if(!instance.enabled())throw new IllegalStateException("实例已停用");
                URI target=URI.create(instance.endpoint());String path=target.getPath();
                if(!path.endsWith("/mcp/receive"))throw new IllegalStateException("反馈要求标准MCP接收路径");
                URI endpoint=new URI(target.getScheme(),null,target.getHost(),target.getPort(),path.substring(0,path.length()-"/mcp/receive".length())+"/mcp/phase3/feedback",null,null);
                String secret=env.getProperty(instance.tokenEnv(),"");if(secret.isBlank())throw new IllegalStateException("反馈密钥未配置");
                long millis=Math.max(1,Math.min(15000,(end-System.nanoTime())/1_000_000));
                var request=HttpRequest.newBuilder(endpoint).header("Authorization","Bearer "+secret).header("Idempotency-Key",row.get("message_id").toString()).header("Content-Type","application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(row.get("payload").toString())).build();
                var response=BoundedHttpClient.send(client,request,65536,Duration.ofMillis(millis));var result=Phase3Json.parse(new String(response.body(),java.nio.charset.StandardCharsets.UTF_8));
                if(response.statusCode()!=200||!"processed".equals(result.path("state").asText()))throw new IllegalStateException("反馈未确认："+result.path("message").asText("HTTP "+response.statusCode()));
                db.update("UPDATE spd_phase3_feedback SET state='processed',message='SPD已保存协同反馈',lease_id=NULL,lease_until=NULL WHERE message_id=? AND lease_id=?",row.get("message_id"),lease);
            } catch(Exception error){
                int delay=Math.min(900,1<<Math.min(9,((Number)row.get("attempts")).intValue()+1));String message=Objects.toString(error.getMessage(),"反馈网络异常");
                // Exception text is restricted to local validation and bounded remote business messages, never request headers.
                if(!(error instanceof IllegalStateException))message="反馈网络或连接异常："+error.getClass().getSimpleName();
                db.update("UPDATE spd_phase3_feedback SET state='failed',message=?,next_attempt=DATE_ADD(NOW(6),INTERVAL ? SECOND),lease_id=NULL,lease_until=NULL WHERE message_id=? AND lease_id=?",message.substring(0,Math.min(500,message.length())),delay,row.get("message_id"),lease);
                if(error instanceof InterruptedException){Thread.currentThread().interrupt();return;}
            }
        }
    }
}
