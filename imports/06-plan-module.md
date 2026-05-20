# 采购计划管理模块 (spd-plan)

## 模块定位

采购需求收集、计划编制、审批流转、计划转订单

## 功能说明

| 功能 | 说明 |
|------|------|
| 计划创建 | 医院发起采购需求、供应商响应、计划模板导入 |
| 计划明细 | 商品、数量、期望交期、备注、附件上传 |
| 计划审批 | 多级审批流程、审批意见、审批历史、驳回重提 |
| 计划转订单 | 审批通过后一键生成采购订单、支持分批转单 |
| 计划跟踪 | 计划执行状态、已转订单数量、完成率统计 |

## 核心API

```java
// 采购计划分页查询
GET /api/plan/page?pageNum=1&pageSize=10&hospitalId=xxx&status=1

// 创建采购计划
POST /api/plan
Body: {planNo, hospitalId, planDate, deliveryDate, remark, items: [{productId, planQty, unitPrice, remark}]}

// 计划提交审批
PUT /api/plan/{id}/submit

// 计划审批
PUT /api/plan/{id}/audit
Body: {auditStatus, auditRemark}

// 计划转订单
POST /api/plan/{id}/convert-order
Body: {itemIds: [1, 2, 3]}

// 获取计划明细
GET /api/plan/{id}/items
```

## 计划状态流转

```
草稿 ──提交──→ 待审批 ──审批通过──→ 已审批 ──转订单──→ 部分转单 ──全部转单──→ 已转单
  │                    │                                      │
  └───删除            └───审批驳回──→ 驳回 ──修改──→ 草稿  └───关闭──→ 已关闭
```
