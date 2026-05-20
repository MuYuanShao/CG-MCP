package com.spd.mcp.api.auth;

import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.stereotype.Component;

@Component
public class PasswordHasher {
  private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
  private static final int ITERATIONS = 120_000;
  private static final int KEY_LENGTH = 256;
  private final SecureRandom secureRandom = new SecureRandom();

  public String hash(String password) {
    byte[] salt = new byte[16];
    secureRandom.nextBytes(salt);
    byte[] hash = pbkdf2(password, salt, ITERATIONS, KEY_LENGTH);
    return "pbkdf2_sha256$" + ITERATIONS + "$"
        + Base64.getEncoder().encodeToString(salt) + "$"
        + Base64.getEncoder().encodeToString(hash);
  }

  public boolean matches(String password, String encoded) {
    String[] parts = encoded.split("\\$", 4);
    if (parts.length != 4 || !"pbkdf2_sha256".equals(parts[0])) return false;
    int iterations = Integer.parseInt(parts[1]);
    byte[] salt = Base64.getDecoder().decode(parts[2]);
    byte[] expected = Base64.getDecoder().decode(parts[3]);
    byte[] actual = pbkdf2(password, salt, iterations, expected.length * 8);
    return constantTimeEquals(expected, actual);
  }

  private byte[] pbkdf2(String password, byte[] salt, int iterations, int keyLength) {
    try {
      PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, keyLength);
      return SecretKeyFactory.getInstance(ALGORITHM).generateSecret(spec).getEncoded();
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to hash password", exception);
    }
  }

  private boolean constantTimeEquals(byte[] expected, byte[] actual) {
    if (expected.length != actual.length) return false;
    int result = 0;
    for (int i = 0; i < expected.length; i++) {
      result |= expected[i] ^ actual[i];
    }
    return result == 0;
  }
}
