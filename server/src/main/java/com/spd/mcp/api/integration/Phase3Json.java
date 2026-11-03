package com.spd.mcp.api.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.TreeSet;

/** Canonical JSON and hashes shared by durable phase-three messages and receipts. */
public final class Phase3Json {
    public static final ObjectMapper MAPPER=new ObjectMapper().findAndRegisterModules();
    private Phase3Json() {}
    public static JsonNode parse(String text) {
        try {return MAPPER.readTree(text);}catch(Exception error){throw new IllegalArgumentException("第三期JSON格式不合法",error);}
    }
    public static String json(Object value) {
        try {return MAPPER.writeValueAsString(sorted(MAPPER.valueToTree(value)));}catch(Exception error){throw new IllegalArgumentException("第三期消息序列化失败",error);}
    }
    public static String hash(Object value) {try {return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(json(value).getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(Exception error){throw new IllegalStateException(error);}}
    private static JsonNode sorted(JsonNode node) {
        if(node.isObject()) {
            ObjectNode result=MAPPER.createObjectNode();var keys=new TreeSet<String>();node.fieldNames().forEachRemaining(keys::add);
            keys.forEach(key->result.set(key,sorted(node.get(key))));return result;
        }
        if(node.isArray()) {var result=MAPPER.createArrayNode();node.forEach(item->result.add(sorted(item)));return result;}
        return node;
    }
}
