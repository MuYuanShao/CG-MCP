# 当前环境测试商品下发结果

日期：2026-10-14，Asia/Shanghai。

已通过MCP-UI前端创建一个测试商品，并下发至已配置的“本机 SPD-PR”实例。SPD-PR数据库、待审批目录列表及查看页均已核对。

| 项目 | 结果 |
|---|---|
| 商品名称 | 联调测试商品_20261014_1230（勿采购） |
| MCP-UI商品ID | 9007 |
| 商品编码 | YLQX00009007 |
| 规格型号 | 10ml / LOCAL-TEST-01 |
| 分类 | 低值耗材 |
| 品牌 | 联调测试 |
| 单位 | 支 |
| 采购价 | 9.90元 |
| 厂家 | 国药器械 |
| 供应商 | 济明 |
| 下发时间 | 2026-10-14 12:30:51 |
| 下发批次 | 51c30eac-3c41-4286-bba2-f33ba97d45fd |
| 同步记录 | 72e26036-0346-443b-be2b-5a0749cdd5d5 |
| 接收结果 | processed，已进入待审批目录 |
| SPD-PR申请号 | SP20261014001 |
| 当前状态 | pending_step_1，设备科一审待审批 |
| 院内目录 | 尚无该商品，查询结果0条 |

SPD-PR列表有多页数据，按申请号SP20261014001查询即可看到测试记录。查看页的名称、编码、规格型号、品牌、单位、厂家、供应商、采购价和一级分类已逐项读取并断言一致。本次保留待审批状态，未执行审批或创建采购订单；测试商品不包含证照附件。

- [SPD-PR查看页](http://localhost:1820/features/pending-product-catalog/SP20261014001)
- [MCP-UI创建截图](D:/SPD-MCP-UI/output/playwright/current-test-product-created.png)
- [下发回执截图](D:/SPD-MCP-UI/output/playwright/current-test-product-dispatched.png)
- [SPD-PR查询列表截图](D:/SPD-MCP-UI/output/playwright/current-test-product-spd-list.png)
- [SPD-PR测试记录截图](D:/SPD-MCP-UI/output/playwright/current-test-product-spd-row.png)
- [SPD-PR查看页字段截图](D:/SPD-MCP-UI/output/playwright/current-test-product-spd-fields.png)
