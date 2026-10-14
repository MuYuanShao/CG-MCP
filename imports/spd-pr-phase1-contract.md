# SPD-PR 第一期采购对接接口契约

本次实现覆盖 **SPD-MCP-UI** 与本机 **D:\SPD-PR** 两个仓库。MCP-UI 包含页面、上传接口、下发客户端和 V24/V25 迁移；SPD-PR 包含专用接收端、基础资料与订单上传任务和 V88 迁移。根据用户确认，商品及证照下发到 **待审批目录**，由 SPD-PR 既有审批流程决定是否进入院内目录。构建与单元测试通过不等于真实双端同步验收通过。

目录审查修复补充：SPD-PR需执行V91。证照替换/撤销以来源附件身份保存待审批动作，审批通过后停用对应旧院内附件；审批前保留原院内证照。独立重发同步申请注册证有效期，资质审批保留院内原启停状态。商品启停状态与未结束的待审批申请冲突时明确失败，不返回处理成功；需先在SPD-PR处理原申请，再重新下发。成功或部分成功的前端下发通过统一成功通知写入操作审计。

## 启用步骤

1. 部署后端，让 Flyway 执行 V24（对接实例、资料、映射、同步日志和权限）及 V25（商品品牌、配送企业持久化）。本次开发未对现有业务数据库执行迁移。
2. 管理员重新登录以获得 `integration:read`、`integration:manage`、`integration:upload`。上传账户仅授予 `integration:upload`，查询和配置分开授权。
3. 在后端运行环境配置每个机构专用的随机密钥，例如 `SPD_PR_MAIN_TOKEN`。配置页只保存环境变量名称，接口不返回密钥值。SPD-PR 的接收适配器配置同一共享密钥；生产使用 HTTPS。
4. 在 MCP-UI **系统设置** 中新增或编辑SPD-PR实例，填写对方IP地址或域名、端口和HTTP/HTTPS协议；页面自动生成接收地址，例如 `http://192.168.1.10:1818/api/mcp/receive`，保存后下发立即使用新地址。既有实例的自定义接收路径会保留。机构标识唯一且创建后不可修改。SPD-PR **系统配置 → 系统集成** 同样提供MCP-UI的IP和端口表单，下一次上传自动使用页面保存的地址，无需为地址修改环境变量；账户和密钥仍按双方配置说明提供。
5. SPD-PR 先上传厂家、供应商。商品下发要求厂家名称与该实例上传资料唯一匹配；商品编码映射仅在 SPD-PR 返回 `processed` 后建立。
6. 商品及证照进入待审批目录后建立编码映射。SPD-PR 真实采购订单仍基于院内目录产生，院内采购资格由现有审批及证照规则控制。失败订单在同步记录中重试；正式订单及报表仅包含整单校验成功的数据。

上传的供应商、厂家及采购订单独立存储于对接模块，按实例查询；不会进入旧采购履约模块触发转配送、发货或审批。

## 鉴权与身份

MCP-UI API 统一前缀 `/api/integration`，沿用现有平台的 `Authorization: Bearer <access-token>`、`x-api-key` 与 `x-tenant-id` 校验。直连后端需要平台 API key；通过已注入 key 的代理时仍需要 Bearer token。调用上传和回执接口还需 `x-spd-token: <实例环境变量对应值>`。

SPD-PR 上传账户通过现有 `/api/auth/login` 取得访问令牌并通过 `/api/auth/refresh` 更新。租户标识必须与账户令牌相符。不要将管理员的浏览器访问令牌硬编码到上传任务中。上传实例由 URL 唯一确定机构，来源系统固定为 SPD-PR；来源唯一键为租户、实例、类型、来源编码。各实例应使用独立密钥。

## MCP-UI 接口

| 方法与路径（省略 `/api/integration`） | 内容 | 权限 |
|---|---|---|
| GET `/instances` | 实例列表 | integration:read |
| POST `/instances`、PUT `/instances/{id}` | 新增及更新配置 | integration:manage |
| POST `/instances/{id}/dispatch` | `{productIds:[123],licensesOnly:false}`；最多 100 个 | integration:manage |
| GET `/instances/{id}/logs` | 最近 500 条日志 | integration:read |
| POST `/logs/{syncId}/retry` | 重试失败记录 | integration:manage |
| POST `/instances/{id}/upload/supplier` | 单条供应商 | integration:upload |
| POST `/instances/{id}/upload/manufacturer` | 单条厂家 | integration:upload |
| POST `/instances/{id}/orders` | 完整订单及明细 | integration:upload |
| POST `/instances/{id}/receipts/{syncId}` | 异步处理回执 | integration:upload |
| GET `/instances/{id}/records/{kind}` | kind 为 supplier、manufacturer、order | integration:read |
| GET `/instances/{id}/report` | 订购统计与日价格趋势 | integration:read |

标准响应 `{code:"SUCCESS",message:"操作成功",data:...}`。上传的业务结果以 `data.state` 为准：`processed` 成功，`ignored` 重复或旧版本，`failed` 关联或业务校验失败。无权限、非法输入、实例不存在或停用返回 HTTP 错误。

基础资料上传示例：

```json
{
  "sourceCode": "SUP001",
  "name": "测试供应商",
  "creditCode": "统一社会信用代码",
  "contactName": "张先生",
  "contactPhone": "13800000000",
  "status": "active",
  "sourceUpdatedAt": "2026-10-08T01:00:00Z"
}
```

厂家同样使用此结构：SPD-PR `manufacturerCode/manufacturerName` 对应 `sourceCode/name`；供应商 `supplierCode/supplierName` 同理。`creditCode`、联系人及电话可为空。状态为 `active` 或 `inactive`，时间必须带时区，保留来源实际更新时间，不要每次重传都生成新时间。

采购订单上传示例：

```json
{
  "orderNo": "PO202610080001",
  "supplierCode": "SUP001",
  "orderDate": "2026-10-08",
  "status": "submitted",
  "totalAmount": 19.98,
  "currency": "CNY",
  "taxIncluded": true,
  "sourceUpdatedAt": "2026-10-08T02:00:00Z",
  "items": [
    {"lineId":"1","productCode":"SPD-P001","quantity":2,"unit":"支","unitPrice":10,"amount":19.98}
  ]
}
```

订单来源字段来自 SPD-PR **已保存的订单主表和明细**，不是普通采购新增请求。后者只有 `estimatedUnitPrice`，缺少订单号、真实明细金额、状态及更新时间，不能直接作为上传契约。`productCode` 必须是成功下发后建立的 SPD-PR 编码，数量大于零、单位须与 MCP-UI 商品一致；最多 1000 条明细。明细编号必须唯一，总金额须与上传明细金额合计一致，不强制用数量乘单价覆盖来源金额。

状态允许 `draft/pending_approval/approved/sent/rejected/voided/submitted/confirmed/partial_shipped/shipped/arrived/accepted/completed/closed/cancelled`。本机 SPD-PR 上传适配器保留真实来源状态，尤其 sent 表示订单已发送给供应商，不能当作已发货。取消或作废上传完整订单并使用更晚的来源更新时间；旧时间或相同时间不覆盖已保存版本。关联失败不修改原成功版本，失败数据保留在日志供重试。

首次初始化逐条上传全部存量资料和订单；增量任务使用来源更新时间水位，允许重叠窗口重复上传，只在 `processed/ignored` 后推进对应记录的同步水位。订单替换为完整主明细快照，不发送明细补丁。接收端锁定实例串行处理上传，防止并发旧版本覆盖新版本。

## SPD-PR 接收适配器契约

MCP-UI 向配置的接收地址发送 POST，使用 `Authorization: Bearer <共享密钥>` 和 `Idempotency-Key: <syncId>`。请求示例：

```json
{
  "syncId":"同步记录UUID",
  "sourceSystem":"MCP-UI",
  "organization":"H001",
  "payload":{
    "productId":123,
    "licensesOnly":false,
    "sourceUpdatedAt":"2026-10-08T03:00:00Z",
    "product":{
      "productCode":"SPD-P001","productName":"一次性耗材","specModel":"5ml / A1",
      "unit":"支","purchaseUnit":"支","purchasePrice":10,
      "brand":"品牌","manufacturerCode":"M001","manufacturerName":"厂家名称",
      "supplierName":"配送企业名称","firstCategory":"耗材",
      "udiCode":"UDI","registrationNo":"注册证编号","contractCode":"院内编码","status":"active"
    },
    "licenses":[{
      "licenseCode":"证照编号","licenseType":"注册证","productCode":"SPD-P001",
      "issueDate":"2026-01-01","expiryDate":"2030-01-01","status":"active",
      "fileName":"附件.pdf","attachmentBase64":"附件原始字节的Base64"
    }]
  }
}
```

| MCP-UI 字段 | SPD-PR 对齐字段 |
|---|---|
| code/name | productCode/productName |
| spec + model（去重后用 ` / ` 拼接） | specModel |
| unit/unitPrice | unit、purchaseUnit/purchasePrice |
| brand/manufacturer/distributor | brand/manufacturerName/supplierName |
| category | firstCategory |
| udi/registrationNo/hospitalContractCode | udiCode/registrationNo/contractCode |
| 真实关联注册证的 expiryDate | registrationExpireDate（存在有效关联证照时） |
| active/inactive | 由适配器更新商品启停状态 |

未维护的 SPD-PR 专属字段不猜测或覆盖；适配器首次创建时使用 SPD-PR 既有默认值，更新待审批申请时保留未下发字段；院内已有商品再次下发时，以院内商品为基础提交新变更申请。MCP-UI 不提供零售价、仓储约束、配额、高值、收费属性等字段。品牌和配送企业已补充持久化，避免页面保存后丢失。下发前按真实 SPD-PR 字段长度校验，不静默截断。

证照只取真实 `biz_license` 记录，不采用现有证照搜索页由商品注册证号合成的演示效期。优先通过 `product_id` 关联；历史仅有商品名称时要求名称唯一。同名商品存在歧义则拒绝下发。附件从服务器受限目录读取，传输实际字节，每个商品最多10个证照，单文件最多10MB、合计最多18MB；附件缺失则整个商品下发失败。状态包括 `pending/active/expired/revoked`；删除或驳回证照以 revoked 下发，可无附件。SPD-PR 用现有审批附件服务检查文件签名，支持 PDF、PNG、JPEG、WEBP。有效期、编号、类型和来源状态保存在 `mcp_pending_license` 并写入审批附件说明及有效期。到期状态在下发时计算，需要重新下发才能更新对方状态。

接收器按机构、来源商品身份执行幂等新增/更新，校验密钥及机构绑定；所有商品字段写入待审批申请，绝不直接写院内商品。独立证照下发 `licensesOnly:true` 不能新增院内商品或覆盖商品资料：申请仍待审批时更新关联附件；原申请已处理时创建“资质更新”待审批申请。证照以不可变的 `sourceLicenseId`（MCP-UI证照记录ID）识别，编号可修改；保留其他人工附件。商品与证照分别维护来源版本，旧版本不覆盖新版本；同一 `syncId` 返回原处理结果，防止超时重试重复写入。更新申请、文件访问及新品证照资格仍执行 SPD-PR 现有业务权限和校验。正在审批的新品不能直接转为院内商品停用申请，会返回具体失败原因。

### 证照审查修复与升级

前端联调修复补充：MCP-UI还需执行V27，新增 `categories:manage` 权限并授权管理员角色。分类查询和维护使用 `/api/product-categories`，复用V22分类表；商品分类下拉读取真实分类。分类改名同步本租户商品引用，被商品使用的分类禁止删除，批量删除校验失败整批回滚。非管理员角色如需维护分类，应显式配置此权限。

SPD-PR商品详情只展示真实 `sys_attachment` 文件记录，不根据注册证号或许可证号合成演示PDF。没有上传文件时附件集合为空，页面展示“暂无附件”。

部署时还需执行 MCP-UI V26 和 SPD-PR V92。V26保存已接收的证照商品绑定及版本检查点；V92分开保存待审批证照意图与已批准证照版本。驳回不改变已批准版本，后续批准始终退役该来源证照的原已批准附件，旧版本申请不能覆盖新版本。

MCP-UI下发 `sourceLicenseId` 与 `licensesComplete:true`，表示该商品的完整来源证照集合。关联商品变更时自动为原商品追加仅证照清理下发，两端商品的申请分别审批；移除关联使用内部 `unlinked` 状态，作废仍保留关联并阻止采购。历史无稳定ID的证照兼容 `legacy:证照编号`，首次携带稳定ID时按原编号承接；升级后应先全量重发证照，再修改历史编号或关联。

已批准的来源证照参与院内采购提交、审批及发送资格校验，非有效状态、已过期或尚未到生效日期均阻止上述动作，草稿仍允许保存。新品准入同时校验待审批来源证照。人工附件保持原规则。证照商品关联持久化为商品ID，商品更名不会解除关联；历史仅名称关联仍要求名称唯一。

本机接收端同步处理成功返回 HTTP 200：`{"state":"processed","productCode":"SPD-P001","message":"商品及证照已进入待审批目录：申请编号，尚未进入院内目录"}`；业务拒绝返回 HTTP 200：`{"state":"failed","message":"具体原因"}`。**processed 只代表待审批目录接收完成，不代表审批通过。** MCP-UI 同时兼容其他适配器的 HTTP 202 异步接收：`{"state":"accepted","message":"已入队"}`，202 后必须调用 MCP-UI 回执接口。返回结构直接使用上述 JSON，不使用 SPD-PR 普通业务接口的 data 包装。

下发日志在网络发送前提交，网络调用不持有数据库锁；连接超时 5 秒、请求超时 15 秒，不自动跟随重定向。网络或业务失败重试使用原 payload 与原 syncId；修改商品或附件后应重新下发，生成新版本。预校验失败未发送到 SPD-PR，重试时重新读取已修正的商品和附件。旧版本回执不能覆盖新版本商品编码映射。

## 报表口径与验证边界

查询参数：`from/to`（含边界日期）、`supplier`（来源编码精确匹配）、`product`（商品编码包含匹配）、`manufacturer`（厂家名称包含匹配）；机构由当前实例确定。

排除 draft、cancelled、rejected 和 voided；订单数按筛选后匹配明细所属订单去重。数量及金额按商品、单位、币种、含税口径分组；金额取上传明细金额。价格趋势为日加权平均上传单价 `SUM(quantity * unitPrice) / SUM(quantity)`，按商品、单位、币种及税口径分别绘图，不推断到货、库存、消耗或付款。

已提供双方后端版本保护、待审批接收边界、缺失关联、整单校验、取消排除、机构隔离、报表分组及 HTTP 回执测试，以及前端查询、权限显示和重试交互测试。SPD-PR 上传任务分页扫描真实资料及订单，成功数据按摘要跳过，失败数据后续重试；V88 将更新时间提升到微秒精度，并用采购明细触发器推进订单版本，覆盖明细修改和删除。真实 MySQL 迁移、配置密钥后的双端上传、院内审批流与真实附件接收仍需部署联调验收。本次未写入现有业务库或启用定时上传。
