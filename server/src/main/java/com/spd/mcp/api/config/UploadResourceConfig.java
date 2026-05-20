package com.spd.mcp.api.config;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadResourceConfig implements WebMvcConfigurer {
  private final Path uploadRootDir;

  public UploadResourceConfig(@Value("${app.upload.root-dir:uploads}") String uploadRootDir) {
    this.uploadRootDir = Path.of(uploadRootDir).toAbsolutePath().normalize();
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry
        .addResourceHandler("/uploads/**")
        .addResourceLocations(uploadRootDir.toUri().toString());
  }
}
