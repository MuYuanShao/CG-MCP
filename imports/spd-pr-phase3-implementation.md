# 采购计划与结算对接实施说明

本次实现对应《2026-10-29 采购计划与结算对接方案》。SPD 为权威来源，MCP 的第三期数据独立保存，不生成其原生订单，也不自动确认结算或付款。

## 部署与启用

- SPD Flyway：`V104__mcp_phase3_outbox.sql`；MCP Flyway：`V28__phase3_plan_settlement.sql`。通过应用正常迁移执行，禁止手工改业务库。
- MCP 设置 `APP_PHASE3_ENABLED=true`；SPD 在系统配置的 MCP 连接中开启第三期同步，也可用 `SPD_MCP_PHASE3_UPLOAD_ENABLED=true` 作为无页面配置时的默认值。两端默认关闭。
- 沿用原有实例、租户、机构、登录及专用令牌配置。SPD 必须明确配置 `SPD_MCP_CURRENCY`（如 CNY）和 `SPD_MCP_TAX_INCLUDED`（true/false）；税口径不明确时结算消息保留失败状态，不猜测税口径。
- MCP 上传账户需要 `integration:upload`；管理员需要 `integration:manage`。供应商仅授予新增 `integration:phase3:read`，提交反馈另授予 `integration:reconcile`，并绑定医院实例和来源供应商编码。不要给供应商授予旧的全量 `integration:read`。
- SPD 反馈服务账户需 `mcp-phase3:feedback`。回调固定为实例地址对应的 `/api/mcp/phase3/feedback`；非标准地址需先核对部署路由。

先启用单医院、单供应商，核对来源单数、行数、数量和四位金额，再扩大范围。关闭上传开关停止发送，已捕获的业务消息保留在数据库；重新启用继续发送。

## 已实现行为

来源业务事务同时写入持久版本与出站消息；网络发送由任务在事务提交后执行。每次发送冻结协议载荷，带 UUID 幂等编号和来源 revision，使用租约恢复异常退出任务。相同消息重放返回原回执，同版本不同内容冲突，旧版本忽略。

批准计划与转单后的状态、关联 SPD 订单身份同步到 MCP。历史计划没有保存估价时显示未记录，估价字段保留 null。订单上传附带来源计划编号，接收计划不触发 MCP 原生转单。

收货、科室消耗及 HIS 高值计费结算保留来源行金额和四位小数字符串，不重新乘单价计算行金额。来源 ID 与 revision 以字符串跨端传输。待确认共享账单反消耗后发布剩余完整版本；空账单删除前持久保存 CANCEL。MCP 禁止恢复已取消来源身份、改写已确认财务事实及重复占用同一结算来源。

超过 1000 行自动走分片会话：暂存、逐片摘要校验、完整摘要校验、原子提交；未提交版本不可见。每片最多 1000 行，单据最多 100000 行；会话有效期一小时，每实例最多五个活动会话。任务重试查询已上传片，不把部分明细当作完整单据。

供应商页面提供分页查询和明细、反馈提交及发送状态。反馈持久重试到 SPD，只产生反馈与审计记录。撤回引用本人原反馈，不删除历史，不改变库存、金额、HIS 计费或结算确认状态。

SPD 连接配置页可读取最近 100 条消息及反馈诊断、批量回填未发布历史单据、重试失败消息。每次回填最多 100 个计划和 100 个结算，可重复执行。切换目标后旧消息不自动发往新目标；管理员可逐单显式“重新发布最新快照”，沿用来源身份并增加版本，包括已删除账单的取消快照。重新发布前必须核对当前目标与金额口径。

## 接口

MCP 路径前缀为 `/api/integration/instances/{id}/phase3`：

- `POST purchase-plans`、`POST settlements`：不超过 1000 行的完整版本。
- `POST upload-sessions`、`PUT upload-sessions/{session}/parts/{part}`、`POST upload-sessions/{session}/commit`：大单暂存与提交。
- `GET messages/{message}`：已提交消息回执，需要上传权限和实例令牌。
- `GET purchase-plans`、`GET settlements` 及各自 `/{source}/items`：分页结果 rows/total/page/size。
- `POST supplier-access`：管理员绑定或移除供应商数据范围。
- `POST settlements/{source}/feedback`、`GET settlements/{source}/feedback`：协同反馈与状态。

POST 单据、会话和反馈要求 `Idempotency-Key`。上传及回执查询同时要求绑定实例的 `x-spd-token` 与登录认证。

## 验证

隔离双端验收脚本位于 MCP 项目 `tests/integration/dual_system.py`，第三期用例为 `phase3_acceptance.py`。脚本自建测试 MySQL、实例与目录，使用专属端口，不连接业务数据库。最终结果见本轮验收记录；上线仍需院方确认税口径、供应商账号范围及历史回填范围。
