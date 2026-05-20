package com.spd.mcp.api.license;

import com.spd.mcp.api.common.ApiResponse;
import com.spd.mcp.api.common.BusinessException;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/licenses")
public class LicenseController {
  private static final long MAX_UPLOAD_SIZE = 10L * 1024L * 1024L;
  private static final Set<String> ALLOWED_FILE_TYPES = Set.of(
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf"
  );

  private final LicenseService licenseService;
  private final Path licenseUploadDir;

  public LicenseController(
      LicenseService licenseService,
      @Value("${app.upload.license-dir:uploads/licenses}") String licenseUploadDir
  ) {
    this.licenseService = licenseService;
    this.licenseUploadDir = Path.of(licenseUploadDir).toAbsolutePath().normalize();
  }

  @GetMapping
  public ApiResponse<List<LicenseDto>> search(
      @RequestParam(required = false) String licenseType,
      @RequestParam(required = false) String productName,
      @RequestParam(required = false) String manufacturer,
      @RequestParam(required = false) String registrationNo,
      @RequestParam(required = false) String contractCode,
      @RequestParam(required = false) String licenseCode
  ) {
    return ApiResponse.success(licenseService.search(new LicenseSearchRequest(
        licenseType,
        productName,
        manufacturer,
        registrationNo,
        contractCode,
        licenseCode)));
  }

  @PostMapping
  public ApiResponse<LicenseDto> create(@Valid @RequestBody LicenseRequest request) {
    return ApiResponse.success(licenseService.create(request));
  }

  @PutMapping("/{id}")
  public ApiResponse<LicenseDto> update(@PathVariable long id, @Valid @RequestBody LicenseRequest request) {
    return ApiResponse.success(licenseService.update(id, request));
  }

  @DeleteMapping
  public ApiResponse<Map<String, Object>> delete(@RequestBody Map<String, List<Long>> request) {
    List<Long> ids = request.getOrDefault("ids", List.of());
    licenseService.delete(ids);
    return ApiResponse.success(Map.of("deleted", ids.size()));
  }

  @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<LicenseUploadResponse> upload(@RequestParam("file") MultipartFile file) {
    validateUploadFile(file);
    try {
      Files.createDirectories(licenseUploadDir);
      String extension = extension(file.getOriginalFilename(), file.getContentType());
      String filename = UUID.randomUUID() + extension;
      Path target = licenseUploadDir.resolve(filename).normalize();
      if (!target.startsWith(licenseUploadDir)) {
        throw new BusinessException("INVALID_FILE_NAME", "文件名不合法");
      }
      file.transferTo(target);
      return ApiResponse.success(new LicenseUploadResponse(
          "/uploads/licenses/" + filename,
          file.getOriginalFilename(),
          file.getSize(),
          file.getContentType()));
    } catch (IOException exception) {
      throw new BusinessException("UPLOAD_FAILED", "证照文件上传失败");
    }
  }

  private static void validateUploadFile(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new BusinessException("EMPTY_FILE", "请选择要上传的证照文件");
    }
    if (file.getSize() > MAX_UPLOAD_SIZE) {
      throw new BusinessException("FILE_TOO_LARGE", "文件大小不能超过 10 MB");
    }
    String contentType = file.getContentType();
    if (contentType == null || !ALLOWED_FILE_TYPES.contains(contentType.toLowerCase())) {
      throw new BusinessException("UNSUPPORTED_FILE_TYPE", "仅支持 JPG、PNG、WEBP、GIF 图片或 PDF 文件");
    }
  }

  private static String extension(String originalFilename, String contentType) {
    if (originalFilename != null) {
      int index = originalFilename.lastIndexOf('.');
      if (index >= 0 && index < originalFilename.length() - 1) {
        String suffix = originalFilename.substring(index).toLowerCase();
        if (Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf").contains(suffix)) {
          return suffix;
        }
      }
    }
    return switch (contentType == null ? "" : contentType.toLowerCase()) {
      case "image/png" -> ".png";
      case "image/webp" -> ".webp";
      case "image/gif" -> ".gif";
      case "application/pdf" -> ".pdf";
      default -> ".jpg";
    };
  }
}
