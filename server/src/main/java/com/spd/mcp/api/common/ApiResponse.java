package com.spd.mcp.api.common;

public record ApiResponse<T>(String code, String message, T data) {
  public static <T> ApiResponse<T> success(T data) {
    return new ApiResponse<>("SUCCESS", "操作成功", data);
  }

  public static <T> ApiResponse<T> error(String code, String message) {
    return new ApiResponse<>(code, message, null);
  }
}
