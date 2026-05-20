package com.spd.mcp.api.ai;

import com.spd.mcp.api.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiSearchController {
  private final AiSearchService aiSearchService;

  public AiSearchController(AiSearchService aiSearchService) {
    this.aiSearchService = aiSearchService;
  }

  @PostMapping("/search")
  public ApiResponse<AiSearchResponse> search(@Valid @RequestBody AiSearchRequest request) {
    return ApiResponse.success(aiSearchService.search(request));
  }
}
