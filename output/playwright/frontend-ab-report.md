# 目录、采购、证照：双端前端 A/B 联调

后续修复已完成：[错误修复与最终复验报告](D:/SPD-MCP-UI/output/playwright/frontend-ab-fixes.md)。下文保留首次联调记录，分类404与类型检查问题的当前状态见复验报告。

测试日期：2026-10-09（Asia/Shanghai）。使用 Playwright CLI 操作真实 MCP-UI 与 SPD-PR 前端，实际调用双方后端及独立 MySQL 数据库；未模拟业务接口。初始账户、对接配置及基础资料由隔离环境初始化，商品、证照、目录审批、采购订单及作废操作均从页面执行。

结论：目录、采购、证照核心链路及 A/B 隔离验证通过。发现并修复两个前端缺陷；分类接口 404 尚未修复。

## 数据与核对结果

| 组别 | 商品编码 | 规格型号 | 单价 | 首张订单 | 数量 | 金额 |
|---|---|---|---:|---|---:|---:|
| A | YLQX00009002 | 5ml / AB-A | 2.50 | CG20261009001 | 10支 | 25.00 |
| B | YLQX00009003 | 10ml / AB-B | 7.00 | CG20261009002 | 3支 | 21.00 |

商品名称分别为 AB前端耗材_A_1009、AB前端耗材_B_1009。注册证分别为 AB_REG_A_1009、AB_REG_B_1009，初始有效期至 2028-12-31；使用内容不同的真实 PDF 附件。

| 检查 | 结果 | 证据 |
|---|---|---|
| 商品页面新增 A/B、规格价格单位分开保存 | 通过 | 两组真实商品行，前端保存请求成功 |
| 证照页面选择真实 A/B 商品，上传不同 PDF | 通过（修复后） | 证照 ID 1、2；稳定商品 ID 随保存请求提交 |
| 两组商品证照批量下发 | 通过 | SP20261009001、SP20261009002，均接收为待审批申请 |
| SPD-PR 页面审批后院内目录可采购 | 通过 | 两申请批准；采购下拉列表展示正确规格型号 |
| SPD-PR 页面创建、提交、审批两组订单 | 通过（修复后） | 两订单金额分别 25、21；提交后审批按钮可直接使用 |
| MCP-UI 上传订单查询及主明细核对 | 通过 | 明细分别为 10×2.5=25、3×7=21，编码、单位及来源状态一致 |
| MCP-UI 首次采购报表 | 通过 | 2单；A 10支25元、B 3支21元，按商品分组 |
| A 证照改编号、续期、替换附件 | 通过 | ID 1 保留，改为 AB_REG_A_NEW_1009，附件有效期至 2029-12-31 |
| A 独立证照更新审批及旧附件退役展示 | 通过 | 院内商品仅展示新附件 8aa8be68-2f33-4c8c-acc8-5b9626e20b79.pdf，数量1 |
| B 资质更新驳回及重发 | 通过 | SP20261009004 驳回；重发生成 SP20261009006 并批准 |
| 已批准 B 过期生产许可证阻断采购 | 通过 | CG20261009004 允许保存草稿，提交返回业务 code 400，页面展示 AB_PROD_B_1009 |
| B 失效证照不影响 A | 通过 | 同时提交 CG20261009003 成功，进入待审批 |
| B 续期审批恢复原被阻断订单 | 通过 | 证照 ID 3 续期至 2029-12-31；SP20261009007 批准后 CG20261009004 提交成功 |
| B 原订单作废同步与报表排除 | 通过 | CG20261009002 来源 voided、MCP-UI 显示已作废；21元排除 |
| 最终报表及 A/B 商品筛选隔离 | 通过 | 3单34.50元：A 2单11支27.50元，B 1单1支7元；筛选不出现另一组 |

独立证照下发维护证照及附件，不修改商品本身的注册证号字段。A 改证照编号后，院内商品基础注册证号仍为原编号；商品资料变化需走商品下发审批。

## 修复与未通过项

1. MCP-UI 证照关联选择器使用写死的演示商品，无法选择真实 A/B 商品，编辑还会丢失真实关联。已改为分页读取真实商品目录、提交稳定商品 ID；加载失败或原关联不存在时阻止编辑，避免保存时误清空关联。已在真实页面验证新增、修改及续期关联保留。
2. SPD-PR 采购提交刷新列表后，选中对象仍保留草稿状态，审批按钮不可用。已按新列表替换选中对象，离开当前列表的订单清除选中；已验证 B 订单连续提交、审批无需重新选择。
3. **未修复：MCP-UI `/api/product-categories` GET/POST 返回404。** 商品分类下拉为空，分类页新增失败。目录核心测试使用可选分类空值，SPD-PR 显示未分类，未伪造分类选项。需要补齐现有分类后端接口后再验收分类维护。
4. MCP-UI 全项目 `typecheck` 未通过，现存错误涉及 CategoryManagement、HospitalManagement、SupplierManagement 等文件。本次修改的 LicenseManagement 与 licenses service 未出现类型错误。完整日志位于 `test-results/dual-system-20261009-103144/mcp-typecheck.log`。

## 编译与回归

- MCP-UI `npm run build`：通过。
- MCP-UI `npm test -- --reporter=dot`：5个测试文件、17项通过。
- SPD-PR `npm --prefix frontend run build`：vue-tsc 与 Vite 构建通过。
- 本次修复文件 `git diff --check`：通过。

## 浏览器证据

- [批量下发](D:/SPD-MCP-UI/output/playwright/ab-catalog-dispatch.png)
- [SPD-PR待审批目录](D:/SPD-MCP-UI/output/playwright/ab-spd-pending.png)
- [SPD-PR采购审批](D:/SPD-MCP-UI/output/playwright/ab-spd-orders-approved.png)
- [MCP-UI A订单明细](D:/SPD-MCP-UI/output/playwright/ab-mcp-order-A.png)
- [MCP-UI B订单明细](D:/SPD-MCP-UI/output/playwright/ab-mcp-order-B.png)
- [初始采购报表](D:/SPD-MCP-UI/output/playwright/ab-mcp-procurement-report.png)
- [B资质驳回](D:/SPD-MCP-UI/output/playwright/ab-license-B-rejected.png)
- [B过期证照阻断](D:/SPD-MCP-UI/output/playwright/ab-spd-B-expired-block.png)
- [B续期恢复](D:/SPD-MCP-UI/output/playwright/ab-spd-B-renewed-restored.png)
- [A院内附件最终展示](D:/SPD-MCP-UI/output/playwright/ab-spd-A-hospital-detail.png)
- [作废后最终报表](D:/SPD-MCP-UI/output/playwright/ab-mcp-final-report.png)
- [A筛选](D:/SPD-MCP-UI/output/playwright/ab-mcp-filter-A.png)
- [B筛选](D:/SPD-MCP-UI/output/playwright/ab-mcp-filter-B.png)

测试服务：MySQL13326、MCP-UI后端18080/前端5175、SPD-PR后端11818/前端1825。运行日志保留在 `test-results/dual-system-20261009-103144`。测试结束关闭隔离服务与浏览器，不部署至业务环境。
