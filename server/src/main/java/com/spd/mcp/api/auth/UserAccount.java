package com.spd.mcp.api.auth;

public record UserAccount(Long id, Long tenantId, String username, String passwordHash, String displayName, String role) {}
