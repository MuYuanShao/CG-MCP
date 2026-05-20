package com.spd.mcp.api.auth;

import java.util.Set;

public record LoginResponse(String token, String username, String role, Set<String> permissions) {}

record AuthSession(LoginResponse response, String refreshToken) {}
