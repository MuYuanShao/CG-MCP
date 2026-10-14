# 第二期：采购履约与批次库存对接

第二期延续第一期双端鉴权、机构隔离、来源版本、同步记录和失败重试。商品下发仍进入SPD-PR待审批目录。本期按用户确认，只实现采购退货接收接口、查询和报表，不新增SPD-PR采购退货业务或虚构退货数据。

## 启用与页面

1. 部署双方新版后端及前端。SPD-PR执行Flyway V90，增加收货到采购明细关联及收货明细版本触发器；前提是已执行V88/V89。MCP-UI复用第一期spd_record及同步日志，无新增表。
2. 在SPD-PR **系统配置 → 系统集成 → MCP-UI对接地址** 勾选“启用第二期收货、入库和批次库存同步”并保存。该开关默认关闭；第一期对接总开关、上传账户和密钥仍需已配置。
3. 下一次任务依次上传厂家、供应商、采购订单、采购收货验收、采购入库和完整批次库存。按来源编码及版本去重，失败数据后续继续上传；库存每次发送完整当前余额。
4. MCP-UI **采购对接 → 履约与库存** 提供订单执行、供应商履约、实际采购金额、批次库存与效期、履约单据及明细查询。同步记录支持第二期对象筛选和关联失败重试。

代码开发未迁移现有业务库、启用上传或执行真实业务审批。部署后需进行真实MySQL及双端联调验收。

## 上传接口

统一前缀 `/api/integration/instances/{实例UUID}/phase2`。鉴权与第一期相同：Bearer访问令牌、平台API key、匹配的租户及x-spd-token；需要integration:upload权限。查询报告需要integration:read。

| 方法和路径 | 内容 |
|---|---|
| POST `/receiving` | 采购收货与验收完整单据 |
| POST `/inbound` | 采购入库完整单据；SPD-PR以不可变采购入库事件为来源 |
| POST `/return` | 采购退货完整单据，等待真实来源系统接入 |
| POST `/inventory` | 当前完整批次可用余额，成功后替换旧快照 |
| GET `/report` | 订单执行、供应商履约、实际金额及当前批次库存 |

单据主明细整体验证后保存。业务结果在data.state：processed成功、ignored重复或旧版本、failed关联或数量校验失败。Bean字段校验失败、无权限和实例鉴权失败返回HTTP错误。来源端状态保存在SPD-PR的mcp_upload_state；已提交到MCP-UI的关联失败也保留于MCP-UI同步记录。

各单据更新、取消或作废必须使用更晚sourceUpdatedAt并发送完整主明细。重复或较旧版本不覆盖已保存数据。单据最多1000明细，库存最多10000行；超过限制会拒绝整个对象，不静默截断。

### 收货与验收

```json
{
  "documentNo":"RC001","orderNo":"PO001","supplierCode":"SUP001",
  "warehouseCode":"W001","warehouseName":"中心库",
  "documentDate":"2026-10-08","receivedDate":"2026-10-08",
  "status":"approved","sourceUpdatedAt":"2026-10-08T02:00:00Z",
  "items":[{"lineId":"101","orderLineId":"10","productCode":"SPD-P001","unit":"支",
    "productionBatchNo":"LOT001","quantity":10,"qualifiedQuantity":8,"rejectedQuantity":2,"reason":"包装破损"}]
}
```

状态draft/approved/rejected/cancelled/voided。orderLineId关联一期采购订单items.lineId，商品和单位须一致，供应商须与订单一致。已处理明细的合格加不合格数量须等于收货数量；拒收不能有合格数量。累计验收合格数量不能超过原采购数量。验收通过必须有实际receivedDate，单据创建日期不冒充实际收货日期。

SPD-PR采购转收货时保留真实purchaseOrderItemId，编辑和拆分批次时保持关联。变更商品会清除该关联，并由后端重新验证。该字段新增于既有ReceivingItemRequest，旧请求仍兼容：历史未填写关联时，仅在同订单同商品采购明细唯一时推导；多条匹配不猜测，来源上传状态记录失败。新建或修改收货单可显式传入purchaseOrderItemId；它必须属于原采购订单且对应同商品。

明确关联的验收只更新指定采购明细的已收数量，审核入库前校验该明细剩余可收数量；未关联的旧流程仍使用现有产品级分配。临时收货没有采购订单关联，不纳入本期采购履约统计。

### 采购入库

```json
{
  "documentNo":"IE001","receivingNo":"RC001","warehouseCode":"W001","warehouseName":"中心库",
  "documentDate":"2026-10-08","status":"completed","currency":"CNY","taxIncluded":true,
  "amountOrigin":"captured","sourceUpdatedAt":"2026-10-08T03:00:00Z",
  "items":[{"lineId":"201","receivingLineId":"101","productCode":"SPD-P001","unit":"支",
    "systemBatchNo":"B001","productionBatchNo":"LOT001","productionDate":"2026-09-01",
    "expiryDate":"2028-09-01","quantity":8,"amount":16}]
}
```

状态draft/completed/cancelled/voided。原收货单必须存在；完成入库要求验收通过，仓库、商品、单位及金额口径须与原单一致，累计入库数量不超过对应验收合格数量。有效退货存在时，原入库不能撤销或减少到已退数量以下。生产日期不得晚于有效期。

SPD-PR来源是inventory_event的purchase_receive_in事件，通过inventory_batch.receiving_item_id追踪原验收明细。数量取qty_change，金额取amount_snapshot，不能用当前商品价格重新计算历史入库金额。缺少事件金额、商品单位或批次关联时记录失败。amountOrigin区分captured事件原始金额、legacy_backfill历史回填金额、provided外部来源上传金额；报表分开汇总，不把回填值当作原始历史金额。

### 采购退货

```json
{
  "documentNo":"RT001","inboundNo":"IE001","warehouseCode":"W001","documentDate":"2026-10-09",
  "status":"completed","currency":"CNY","taxIncluded":true,"sourceUpdatedAt":"2026-10-09T01:00:00Z",
  "items":[{"lineId":"301","inboundLineId":"201","productCode":"SPD-P001","unit":"支",
    "systemBatchNo":"B001","quantity":2,"amount":4,"reason":"质量退货"}]
}
```

状态draft/completed/cancelled/voided。原入库必须存在，完成退货要求原入库已完成；仓库、商品、单位、批次、币种和含税口径一致。跨退货单累计数量不超过原入库数量。只有completed计入退货数量和金额，取消后解除数量占用并更新报表。未上传退货不代表SPD-PR没有实际退货。

### 完整批次库存

```json
{
  "currency":"CNY","taxIncluded":true,"valuationBasis":"catalog_purchase_price",
  "sourceUpdatedAt":"2026-10-08T04:00:00Z",
  "items":[{"warehouseCode":"W001","warehouseName":"中心库","productCode":"SPD-P001","unit":"支",
    "systemBatchNo":"B001","productionBatchNo":"LOT001","productionDate":"2026-09-01","expiryDate":"2028-09-01",
    "looseQuantity":6,"packagedQuantity":2,"lockedQuantity":0,"isolatedQuantity":0,"inTransitQuantity":0,"amount":16}]
}
```

数据范围是双方已建立商品映射的SPD-PR院内商品。仓库＋商品＋系统批次唯一，不允许重复；单位与MCP-UI商品一致，数量与金额非负。完整有效快照成功后整体替换current记录；items为空会清空已同步余额，旧版本不能复活旧库存。任意一行失败保留原快照及失败日志。

SPD-PR库存口径与现有库存查询一致：无货位散货available_qty，加pending_print/available定数包按quota_package_label_source分摊的批次数量。signed包已进入科室余额，不再累加；picked包不计入当前可用数量。锁定、隔离、在途分别展示，不混入可用库存。缺少完整来源批次的在库定数包会阻止快照生成，避免遗漏批次数量。

库存金额按院内目录采购价估值，明确标记catalog_purchase_price，不当作历史批次成本。入出库事件不再叠加到已上传余额，避免双计。库存同步时间显示在页面；源端生成失败时保留上次有效余额。

## 报表口径及验收

- 订单执行及供应商履约按原订单日期筛选，分别按订单明细、供应商＋商品＋单位统计全部有效履约；排除草稿、驳回、作废和取消订单。未完成数量为订购数量减验收合格数量，最低为零。
- 收货/拒收数量和验收结果来自已处理单据。若缺实际收货日期，到货率显示未知；到货率可能超过100%，例如不合格后补货。合格率按合格量／收货拒收量，退货率按完成退货量／完成入库量。不混合不同商品单位；本期未接入计划到货日期，不提供准时到货率。
- 实际采购金额按入库日期、退货日期分别筛选，并按币种、税口径和入库金额来源分组；净入库金额＝入库金额－退货金额。已发生的有效入库与退货不因后续原订单取消而被抹除。
- 库存只看最新成功快照，不按采购日期截取；支持商品、厂家、仓库及效期筛选。有效期小于今天为过期，0至90天为近效期，没有有效期单独标记；零可用数量不计入效期预警。
- 采购、收货和入库明细一旦已有有效下游，不能删除关联、改换商品单位、变更原单或将数量减少至下游已完成数量以下。需要纠正时先处理下游单据，再上传更晚版本。

验收包含分批收货、部分不合格、指定采购明细与重复商品、超量入库/退货、取消及作废、旧版本/重复上传、空库存快照、缺失关联、批次日期校验、历史金额来源、币种税口径隔离及机构鉴权。代码测试通过后仍需用真实单据核对SPD-PR与MCP-UI结果。

采购审查修复：存在完成入库的收货行冻结orderLineId；存在完成退货的入库行冻结receivingLineId，不能通过相同商品单位改换原明细。原生MCP-UI采购订单、配送单、发货单接口的数组响应在前端标准化为分页对象；订单列表与明细分别展示加载、错误及空状态。驳回计划编辑保存后回到草稿，可通过POST `/api/purchase-plans/{id}/submit`重新提交，接口要求purchasePlans:submit权限且只允许草稿。编辑计划按读取到的预期状态条件更新；并发转单推进状态后，编辑返回PLAN_STATUS_CHANGED，不改写已生成订单对应的计划数量和价格。
