package com.spd.mcp.api.auth;

import java.util.Set;

public record AuthenticatedUser(Long tenantId, String username, String role, Set<String> permissions) {}
