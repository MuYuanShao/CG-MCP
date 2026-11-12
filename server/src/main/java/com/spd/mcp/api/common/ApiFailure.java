package com.spd.mcp.api.common;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Shared classification for the HTTP response and the interface audit record. */
public record ApiFailure(HttpStatus status, String code, String message) {
  public static ApiFailure from(Exception exception) {
    if (exception instanceof BusinessException business)
      return new ApiFailure(business.getStatus(), business.getCode(), business.getMessage());
    if (exception instanceof DuplicateKeyException)
      return new ApiFailure(HttpStatus.BAD_REQUEST, "DUPLICATE_KEY", "编码或唯一字段已存在");
    return new ApiFailure(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "系统异常，请稍后重试");
  }

  public ResponseEntity<ApiResponse<Void>> response() {
    return ResponseEntity.status(status).body(ApiResponse.error(code, message));
  }
}
