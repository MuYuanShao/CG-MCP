package com.spd.mcp.api.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception) {
    return ResponseEntity
        .status(exception.getStatus())
        .body(ApiResponse.error(exception.getCode(), exception.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException exception) {
    FieldError fieldError = exception.getBindingResult().getFieldErrors().stream().findFirst().orElse(null);
    String message = fieldError == null ? "请求参数不合法" : fieldError.getDefaultMessage();
    return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_FAILED", message));
  }

  @ExceptionHandler(DuplicateKeyException.class)
  public ResponseEntity<ApiResponse<Void>> handleDuplicateKeyException(DuplicateKeyException exception) {
    return ResponseEntity.badRequest().body(ApiResponse.error("DUPLICATE_KEY", "编码或唯一字段已存在"));
  }

  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleNoResourceFoundException(NoResourceFoundException exception) {
    return ResponseEntity
        .status(org.springframework.http.HttpStatus.NOT_FOUND)
        .body(ApiResponse.error("NOT_FOUND", "请求的资源不存在"));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleException(Exception exception) {
    log.error("Unhandled API exception", exception);
    return ResponseEntity
        .internalServerError()
        .body(ApiResponse.error("INTERNAL_SERVER_ERROR", "系统异常，请稍后重试"));
  }
}
