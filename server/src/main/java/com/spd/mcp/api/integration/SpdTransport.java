package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.BusinessException;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.core.env.Environment;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

@Component
public class SpdTransport {
  private final ObjectMapper mapper;
  private final Environment environment;
  private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
  public SpdTransport(ObjectMapper mapper,Environment environment) { this.mapper=mapper;this.environment=environment; }
  public static void validateEndpoint(String endpoint) {
    try {
      URI u=URI.create(endpoint);
      if (!("http".equals(u.getScheme()) || "https".equals(u.getScheme())) || u.getHost()==null || u.getUserInfo()!=null || u.getQuery()!=null || u.getFragment()!=null || u.getPort()==0 || u.getPort()>65535)
        throw new IllegalArgumentException();
    } catch (IllegalArgumentException e) { throw new BusinessException("ENDPOINT_INVALID","接口地址必须为无用户信息、查询参数及片段的 HTTP(S) 地址"); }
  }
  public Receipt send(Instance instance,String logId,Object payload) {
    String secret=environment.getProperty(instance.tokenEnv());
    if (secret==null || secret.isBlank()) throw new BusinessException("SPD_TOKEN_MISSING","服务器未配置实例鉴权环境变量");
    try {
      var request=HttpRequest.newBuilder(URI.create(instance.endpoint())).timeout(Duration.ofSeconds(15))
          .header("Authorization","Bearer "+secret).header("Content-Type","application/json")
          .header("Idempotency-Key",logId).POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(Map.of("syncId",logId,"sourceSystem","MCP-UI","organization",instance.organization(),"payload",payload)))).build();
      var deadline=Duration.ofMillis(environment.getProperty("SPD_PR_HTTP_TIMEOUT_MS",Long.class,15000L));
      var response=BoundedHttpClient.send(client,request,65536,deadline);
      {
        if (response.statusCode()!=200 && response.statusCode()!=202) throw new BusinessException("SPD_HTTP_ERROR","SPD-PR 接口返回 HTTP "+response.statusCode());
        var node=mapper.readTree(response.body());
        String state=node.path("state").asText();
        if (!java.util.Set.of("accepted","processed","failed").contains(state) || (response.statusCode()==202 && !state.equals("accepted")))
          throw new BusinessException("SPD_RESPONSE_INVALID","SPD-PR 回执缺少合法处理状态");
        return new Receipt(state,node.path("message").asText(""),node.path("productCode").asText(""));
      }
    } catch (BoundedHttpClient.ResponseTooLargeException e) { throw new BusinessException("SPD_RESPONSE_INVALID","SPD-PR 回执超过限制"); }
    catch (BusinessException e) { throw e; }
    catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new BusinessException("SPD_INTERRUPTED","下发中断，可重试"); }
    catch (Exception e) { throw new BusinessException("SPD_NETWORK_ERROR","SPD-PR 网络或回执异常，可重试"); }
  }
}
