package com.spd.mcp.api.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spd.mcp.api.common.BusinessException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AiSearchService {
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;
  private final String endpoint;
  private final String model;
  private final long timeoutSeconds;

  public AiSearchService(
      ObjectMapper objectMapper,
      @Value("${app.ai.endpoint:http://localhost:11434/api/chat}") String endpoint,
      @Value("${app.ai.model:qwen2.5:7b}") String model,
      @Value("${app.ai.timeout-seconds:60}") long timeoutSeconds
  ) {
    this.objectMapper = objectMapper;
    this.endpoint = endpoint;
    this.model = model;
    this.timeoutSeconds = timeoutSeconds;
    this.httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(Math.min(timeoutSeconds, 10)))
        .build();
  }

  public AiSearchResponse search(AiSearchRequest request) {
    try {
      Map<String, Object> payload = Map.of(
          "model", model,
          "stream", false,
          "messages", List.of(
              Map.of(
                  "role", "system",
                  "content", """
                      你是 SPD 医用耗材供应链系统的本地 AI 搜索助手。
                      根据用户问题，用中文给出简洁、可执行的回答。
                      如果用户在找单据、商品、证照、库存、采购或退货，请说明建议进入哪个菜单以及可用的查询字段。
                      不要编造当前数据库里不存在的具体记录。
                      """),
              Map.of("role", "user", "content", request.query())));
      HttpRequest httpRequest = HttpRequest.newBuilder()
          .uri(URI.create(endpoint))
          .timeout(Duration.ofSeconds(timeoutSeconds))
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
          .build();
      HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new BusinessException("AI_SEARCH_FAILED", "本地AI大模型调用失败：" + response.statusCode(), HttpStatus.BAD_GATEWAY);
      }
      JsonNode root = objectMapper.readTree(response.body());
      String answer = root.path("message").path("content").asText();
      if (answer == null || answer.isBlank()) {
        answer = root.path("response").asText();
      }
      if (answer == null || answer.isBlank()) {
        throw new BusinessException("AI_SEARCH_EMPTY", "本地AI大模型未返回内容", HttpStatus.BAD_GATEWAY);
      }
      return new AiSearchResponse(answer, model);
    } catch (BusinessException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new BusinessException("AI_SEARCH_UNAVAILABLE", "本地AI大模型不可用，请确认模型服务已启动", HttpStatus.BAD_GATEWAY);
    }
  }
}
