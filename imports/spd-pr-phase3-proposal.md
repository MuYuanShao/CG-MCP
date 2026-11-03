# SPD-PR 与 SPD-MCP-UI 采购计划、结算对接方案

日期：2026-10-29。此文件保留方案制定时的业务决策；2026-10-30 实现进度与启用步骤见 [实施说明](2026-10-30-mcp-phase3-implementation.md)，生产默认仍关闭。

本方案在五项既有接口缺陷修复验证通过后制定。前置证据为双端独立 MySQL 联调 102 项检查全部通过，报告为 `D:/SPD-MCP-UI/test-results/dual-system-20261029-134446/report.json`。SPD 后端广泛回归 871 项无失败、133 项可选集成测试关闭；MCP 后端 59 项全部通过。

## 一、推荐业务边界

| 对象 | 权威来源 | 首期同步方向 | MCP-UI 的处理边界 |
|---|---|---|---|
| 医院采购计划 | SPD-PR 的 `purchase_plan` 及院内审批 | SPD-PR → MCP-UI | 接收医院计划、查询及供应商协同，不自动生成原生采购订单 |
| 医院采购订单 | SPD-PR 的真实订单 | 沿用现有一期上传 | 用来源关系连接计划、订单和二期收货，不另造订单 |
| 供应商结算 | SPD-PR 的 `settlement_bill` / `settlement_bill_item` | SPD-PR → MCP-UI | 展示真实结算依据、金额和来源状态，接收或提出差异反馈 |
| 供应商反馈 | MCP-UI 的已鉴权供应商用户 | MCP-UI → SPD-PR 协同记录 | 反馈不直接批准计划、确认结算、修改金额、扣库存或标记付款 |

推荐先将医院计划和结算接入独立对接区，延续一期 `spd_record` 与 MCP 原生业务隔离的原则。原生 `/api/purchase-plans` 与 `/api/settlements` 保持本地语义，不将来源单据直接插入 `biz_purchase_plan`、`biz_purchase_order` 或 `biz_settlement`。

供应商主动提交医院采购建议可以作为后续独立功能：进入 SPD 草稿/待审批，不复用已批准计划上传接口，更不能自动触发院内采购审批。

## 二、当前模型差异及处理

1. SPD 当前每张计划直接拥有一个 `product_id` 和 `planned_quantity`；MCP 已有头明细结构。协议统一使用 `items[]`，SPD 当前用一条明细适配，`sourceLineId` 使用来源计划 ID；不能用数组序号作持久身份。
2. SPD 当前计划未保存计划价格和要求到货日期。历史计划的 `estimatedUnitPrice`、`estimatedAmount`、`expectedDate` 必须为 `null`，标记 `priceBasis=not_recorded`，不能用上传当日目录价或订单到货日期冒充。
3. 若业务需要新计划估价，实施时在计划创建事务保存可选估价及 `priceBasis=catalog_at_plan_creation`。该估价不约束现有转订单时的取价规则，不回填历史估价，也不替代实际订单金额。
4. SPD 结算金额精度为四位，MCP 原生结算头金额为两位。导入对接明细和金额必须保留四位，不能经原生两位金额列落库。
5. 结算来源包括收货明细、科室消耗明细和高值计费。不能要求每条结算行都有采购订单，也不能用入库金额、HIS 患者收费金额或当前目录价重建供应商结算。

## 三、身份、版本与通用信封

身份主键为 `(tenantId, instanceId, sourceSystem, documentType, sourceId)`，其中实例与租户来自服务端鉴权上下文。来源 ID、明细 ID 和追溯 ID 均用十进制字符串传输，避免 JavaScript 大整数精度丢失。单号是可读业务标识，不替代来源 ID。

每次业务内容或状态改变，在同一事务推进该单据的 `revision` 并保存消息。`revision` 使用持久单调整数，`sourceUpdatedAt` 是带时区的真实来源时间；时间用于展示和追查，不单独决定先后。不能在每次重传时生成一个新的“来源更新时间”。

示例信封：

```json
{
  "schemaVersion": "3.0",
  "messageId": "持久化UUID",
  "sourceSystem": "SPD-PR",
  "documentType": "purchase_plan",
  "sourceId": "123",
  "documentNo": "真实来源单号",
  "revision": "2",
  "sourceUpdatedAt": "2026-10-29T05:00:00Z",
  "operation": "UPSERT",
  "payload": {}
}
```

`Idempotency-Key` 必须等于 `messageId`。同消息 ID、同规范化内容摘要返回原回执；同 ID 不同内容返回 `409 IDEMPOTENCY_CONFLICT`。低版本返回 `ignored`；同来源、同 revision 但不同摘要返回 `409 REVISION_CONFLICT`，不静默吞掉。

回执沿用现有集成响应包装，业务结果在 `data.state`，并增加 `sourceId`、`storedRevision`、`payloadHash`。`processed` 只表示该完整版本已可靠保存，不表示院内审批通过、供应商确认或已付款。

## 四、采购计划载荷与状态

头字段：`supplierCode`、`sourceStatus`、`createdAt`、`approvedAt`、`convertedOrderIds[]`、`convertedOrderNos[]`、`remark`；日期缺失保持 `null`。

明细字段：`sourceLineId`、`productCode`、`unit`、`plannedQuantity`、`estimatedUnitPrice`、`estimatedAmount`、`priceBasis`、`expectedDate`。数量采用 SPD 基本单位和整数量规则；金额、价格使用规范化十进制字符串，估价缺失不以零代替。

| SPD 状态 | 对接展示 | 是否构成正式需求 |
|---|---|---|
| draft | 院内草稿；默认不向供应商发布 | 否 |
| approved | 院内已批准计划 | 是 |
| executed | 已在 SPD 转为真实采购订单 | 以关联采购订单为准，不再次转单 |
| rejected | 院内驳回；若此前已发布则同步失效结果 | 否 |

状态保留来源语义，不强行映射为 MCP 本地整数状态。先到的订单可以保存未解析的计划来源引用并提示待关联，待计划到达后补连；不能因引用暂未到达生成第二张订单。

计划消失、商品停用或同步列表为空都不等于计划取消。只有来源明确业务撤销/删除事件才发送 `CANCEL`，并保留原身份、版本和原因。SPD 当前没有的计划状态或动作不在适配器中虚构。

## 五、结算载荷与金额规则

头字段：`supplierCode`、`settlementPeriod`、`settlementMode`、`sourceStatus`、`generatedAt`、`confirmedAt`、`currency`、`taxIncluded`、`moneyScale=4`、`totalAmount`、`items[]`。

明细字段：`sourceLineId`、`sourceBizType`、`sourceBizId`、`productCode`、`systemBatchNo`、`traceCodeId`、`goodsType`、`quantity`、`unit`、`unitPrice`、`amount`，以及来源真实存在时的采购、收货或消耗单据引用。

- `sourceLineId` 对应结算明细 ID；`traceCodeId` 用于稳定追溯，可被多个混批分摊行共享，不能当结算明细主键。
- `settlementMode` 原样区分 `purchase_in`、`department_consumption`、`actual_sale`。金额读取已生成的结算明细，沿用已锁定价格和尾差分摊，不重算。
- 校验头金额等于所有当前明细 `amount` 的四位精确合计。不能强制每条 `amount=quantity*unitPrice`，因为混批分摊可能存在四位尾差。
- 币种、税口径须明确配置且能代表真实单据。现有来源没有逐单字段时，只有确认单一口径的医院才能用当前系统配置；混合或不明口径拒绝自动财务对账，不默认 CNY/含税，也不跨口径相加。
- 当前商品信息可用于辅助展示，但须标明取自当前目录；不得将后续目录名称、注册证或价格声称为历史结算快照。新消息保存首次传输的显示信息及其来源标记。
- 供应商协同不需要患者信息；高值结算使用计费来源和稳定追溯身份，不上传患者姓名或住院号。

`pending_confirm` 与 `confirmed` 是 SPD 的权威状态。MCP 的“已接收”“有差异”等反馈单独存储，不覆盖 `sourceStatus`。确认结算不是付款，现有系统没有的付款事实不生成 `paid` 状态。

反消耗撤销待确认结算时：共享账单发送更高 revision 的完整剩余明细和重算金额；空账单被删除前，在同一事务保存 `CANCEL` 消息。对方保留历史版本并使当前版本失效，不能硬删审计历史。已确认结算仍遵守现有财务红冲边界；首期不开放远端撤销或任意降级状态。

## 六、拟新增接口

以下均为拟议接口，当前代码尚不存在。

| 端 | 方法与路径 | 用途 |
|---|---|---|
| MCP | POST `/api/integration/instances/{id}/phase3/purchase-plans` | 接收完整采购计划版本 |
| MCP | POST `/api/integration/instances/{id}/phase3/settlements` | 接收完整结算版本或取消消息 |
| MCP | GET `/api/integration/instances/{id}/phase3/purchase-plans` | 分页查询，统一 rows/total/page/size |
| MCP | GET `/api/integration/instances/{id}/phase3/settlements` | 分页查询头信息与来源状态 |
| MCP | GET `/api/integration/instances/{id}/phase3/settlements/{sourceId}/items` | 分页读取当前有效版本明细 |
| MCP | POST `/api/integration/instances/{id}/phase3/settlements/{sourceId}/feedback` | 已鉴权供应商提交接收/差异反馈 |
| SPD | POST `/api/mcp/phase3/feedback` | 幂等保存协同反馈，不执行财务或采购审批 |

上传继续使用访问令牌、平台 API key、租户、实例共享密钥，要求 `integration:upload`。查询要求 `integration:read`；供应商反馈增加独立 `integration:reconcile`，并按已鉴权用户所属供应商限制其账单范围。不能只验证医院实例就允许任意供应商查看全院结算。

新 SPD 反馈入口使用专用安全链和受限服务账户，验证机构、消息 ID、来源单据及供应商归属；原 `/api/mcp/receive` 继续仅接收目录/证照。保存外部操作人信息用于审计，不将其当作本院审批权限。

## 七、完整大单与原子可见性

普通请求最多 1000 行。超过上限不得截断，也不能将一张结算单拆成多个独立有效账单冒充成功。大单采用暂存上传会话：

1. `POST /phase3/upload-sessions`：声明类型、来源 ID、revision、总行数、总金额和完整摘要，取得会话 ID。
2. `PUT /phase3/upload-sessions/{sessionId}/parts/{partNo}`：每片最多 1000 行；片号及摘要幂等，重复片不同内容拒绝。
3. `POST /phase3/upload-sessions/{sessionId}/commit`：验证片数、行数、明细身份、供应商/商品映射及总金额，在一个数据库事务中激活完整版本并返回 processed。

暂存失败或超时不影响上一有效版本，不暴露半张账单；commit 丢失响应可用原 messageId 查询回执。暂存会话有容量和过期清理限制。若医院存在大于 1000 行的结算，大单会话能力是结算上线前置条件。

## 八、落库、出站消息和重试

SPD 拟新增单据版本表和持久出站表，版本键即来源类型+ID。出站表保存完整不可变载荷或大单内容引用、摘要、尝试次数、下次执行时间及回执，不存令牌或共享密钥。版本记录在业务单据删除后仍保留，保证取消消息可追查。

接入点：计划创建/审批/执行、结算生成/确认、反消耗移除结算行及删除空账单。先在同一事务保存业务数据、版本和出站消息，提交后发送；网络调用不能持有业务行锁。

MCP 复用实例及产品映射；对接计划头、结算头明细、版本历史、暂存会话、反馈记录使用独立持久结构或既有 spd_record 加配套索引。确认结算行的来源业务身份在同一实例只能归属一份当前有效账单；跨账单变更乱序时先标记冲突并重试，不让同一来源重复进入应付合计。

轮询以持久 revision/出站队列为依据，不只扫描自增 ID或每轮当前时间。对现有计划缺少 update_time、结算删除后不可再扫描的问题，不能靠临时生成时间戳规避。历史回填使用明确 backfill 标记，只导出真实来源事实。

消息按单据顺序发送，HTTP 完整交换继续使用本轮修复后的截止时间及字节上限。重试采用退避、抖动、每轮预算和失败隔离，避免一张失败单阻塞全院。token 过期后可续期，但重试使用原消息身份和内容；数据修正产生新 revision，不换 ID 重发不同内容。

所有结构与索引通过两端 Flyway 的下一可用迁移版本实施。本方案不修改现有业务数据库、不预占迁移版本号、不启动第三期上传任务。

## 九、实施顺序和验收

1. **契约与底座**：确定以下待确认口径，增加第三期独立开关及权限，落地来源版本、出站消息和对接区；默认关闭。
2. **计划纵向链路**：SPD 已批准计划上传 → MCP 分页查看 → 关联现有上传订单；验证重复、乱序、状态更新及本地订单不会重复创建。
3. **结算纵向链路**：真实收货/低值消耗/HIS 高值计费生成的结算 → 原价和尾差传输 → MCP 明细查询；再接入共享账单反消耗、取消及大单原子提交。
4. **协同反馈**：租户、实例和供应商隔离 → 接收/差异反馈 → SPD 审计与人工处置；不自动改变权威状态。
5. **灰度与对账**：先单医院、单供应商、限定日期回填，核对单数、行数、数量及四位金额；再逐步启用。关闭第三期开关只停止第三期，不影响既有目录、证照、订单及二期同步。

上线验收至少包含：

- 同一消息重试、同 revision 异内容冲突、旧版本后到、断网后恢复、响应正文停传和事务回滚。
- 同一计划并发转换及接收重放不产生额外采购订单；计划 12×2 的估价和实际订单 24 分开标识。
- 两家医院同号、两个供应商、不同租户、缺失/停用映射和商品改名的身份隔离。
- 三类结算点、混批跨供应商、0.0001 尾差、零价合法金额、税口径不明拒绝、确认不代表付款。
- 共享账单只移除一个消耗来源后保留其他明细与金额；删除空账单取消消息在网络重试后仍可发送。
- 1001 行以上的分片、缺片、重复片、commit 超时重放，未提交版本不可见。
- 反馈重复、撤回、无权限和跨供应商越权不能改金额、确认状态、库存或 HIS 计费事实。

## 十、实施前需确认的口径

本方案推荐：SPD 为医院计划与结算权威来源；首期只读同步加协同反馈；不自动生成 MCP 原生采购订单，也不自动批准财务状态。以下业务决定在实施前由院方与供应商确认：

1. 是否同意上述权威来源和首期边界；是否另需“供应商建议 → SPD 草稿”能力。
2. 单医院币种与税口径是否统一；如果混合，来源必须先补逐单字段。
3. 结算反馈的业务称谓、谁能反馈、确认与争议时限；是否需要已确认结算的财务红冲集成。
4. 真实月结最大明细数及回填日期范围，用于确定分片上线门槛与性能验收规模。

以上为方案制定时的口径清单。后续已按只读同步与协同反馈边界开发；实际部署仍需确认币种税口径、供应商账号范围及回填范围，具体见实施说明。
