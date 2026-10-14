package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.BusinessException;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;
import static com.spd.mcp.api.integration.IntegrationTypes.*;

class SpdTransportTest {
  @Test void sendsIdempotencyKeyAndDistinguishesAcceptedFromProcessed() throws Exception {
    var mapper=new ObjectMapper();var env=new MockEnvironment().withProperty("SPD_PR_TEST_TOKEN","test-secret");
    var transport=new SpdTransport(mapper,env);
    var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
    server.createContext("/receive",exchange->{
      var request=mapper.readTree(exchange.getRequestBody());
      boolean valid="Bearer test-secret".equals(exchange.getRequestHeaders().getFirst("Authorization")) && "sync-1".equals(exchange.getRequestHeaders().getFirst("Idempotency-Key")) && request.path("organization").asText().equals("H1");
      byte[] bytes="{\"state\":\"accepted\",\"message\":\"queued\"}".getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(valid?202:401,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
    });server.start();
    try {
      var instance=new Instance("one","测试","H1","http://127.0.0.1:"+server.getAddress().getPort()+"/receive","SPD_PR_TEST_TOKEN",true);
      var receipt=transport.send(instance,"sync-1",Map.of("productCode","P1"));
      assertEquals("accepted",receipt.state());
      assertThrows(BusinessException.class,()->transport.send(instance,"different-key",Map.of()));
    } finally {server.stop(0);}
  }
  @Test void missingCredentialsFailBeforeNetwork() {
    var transport=new SpdTransport(new ObjectMapper(),new MockEnvironment());
    var instance=new Instance("one","测试","H1","http://127.0.0.1:1/receive","SPD_PR_MISSING_TOKEN",true);
    assertEquals("SPD_TOKEN_MISSING",assertThrows(BusinessException.class,()->transport.send(instance,"one",Map.of())).getCode());
  }
}
