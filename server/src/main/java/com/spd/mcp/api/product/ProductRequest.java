package com.spd.mcp.api.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProductRequest(
    @Size(max = 50, message = "商品编号不能超过 50 个字符")
    String code,

    @NotBlank(message = "商品名称不能为空")
    @Size(max = 200, message = "商品名称不能超过 200 个字符")
    String name,

    @Size(max = 200, message = "通用名不能超过 200 个字符")
    String genericName,

    @Size(max = 100, message = "规格不能超过 100 个字符")
    String spec,

    @Size(max = 100, message = "型号不能超过 100 个字符")
    String model,

    @DecimalMin(value = "0.00", message = "单价不能小于 0")
    BigDecimal unitPrice,

    @Size(max = 20, message = "单位不能超过 20 个字符")
    String unit,

    @Size(max = 100, message = "注册证号不能超过 100 个字符")
    String registrationNo,

    @Size(max = 100, message = "医保编码不能超过 100 个字符")
    String medicalInsuranceCode,

    @Size(max = 200, message = "UDI 不能超过 200 个字符")
    String udi,

    @Size(max = 80, message = "商品分类不能超过 80 个字符")
    String category,

    @Size(max = 200, message = "生产厂家不能超过 200 个字符")
    String manufacturer,

    @Size(max = 200, message = "配送企业不能超过 200 个字符")
    String distributor,

    @Size(max = 100, message = "品牌不能超过 100 个字符")
    String brand,

    Integer isImported,

    Integer isVolume,

    @Size(max = 80, message = "集采分类不能超过 80 个字符")
    String volumeCategory,

    @Size(max = 100, message = "集采本地编码不能超过 100 个字符")
    String zcLocalCode,

    @Min(value = 0, message = "中包装数量不能小于 0")
    Integer mediumPackage,

    @Min(value = 0, message = "大包装数量不能小于 0")
    Integer largePackage,

    @Size(max = 100, message = "院内耗材编码不能超过 100 个字符")
    String hospitalContractCode,

    String status
) {}
