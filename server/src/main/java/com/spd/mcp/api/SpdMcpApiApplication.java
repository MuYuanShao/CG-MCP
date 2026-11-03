package com.spd.mcp.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@org.springframework.scheduling.annotation.EnableScheduling
@SpringBootApplication
public class SpdMcpApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(SpdMcpApiApplication.class, args);
  }
}
