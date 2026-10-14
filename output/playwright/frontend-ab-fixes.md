# 双端联调错误修复与复验

日期：2026-10-09（Asia/Shanghai）。原 A/B 联调报告中的分类接口404、MCP-UI全项目类型检查失败均已修复；复查发现的弹窗ref错误、虚构附件和favicon404也已修复。

## 修复结果

| 错误 | 修复 | 验证 |
|---|---|---|
| 分类查询、新增接口404，商品分类下拉为空 | 补齐 `/api/product-categories` 查询、新增、修改、软删除接口，复用V22分类表；新增V27维护权限 | 真实页面新增、编辑、选择分类、跨端下发、SPD-PR审批入院通过 |
| 分类权限和引用缺少保护 | 写接口校验 `categories:manage`；管理员迁移授权；只读按钮禁用；分类改名同步本租户商品引用；使用中分类禁止删除，批量失败整批回滚 | 真实数据库重名、非法值、引用、批量原子性、租户隔离、无权限测试通过；浏览器删除取消与确认通过 |
| 带分页参数的列表函数直接传给TanStack Query | 使用无参数查询回调，避免查询上下文对象进入页码；适配后端数组和分页响应 | 医院、供应商、库存、退货页面均发送 `current=1&size=20` 并返回HTTP200；24项前端测试通过 |
| 分类和结算操作读取可能不存在的单选ID | 显式检查ID再提交、打开明细 | 完整TypeScript检查通过，未放宽strict配置或用any绕过 |
| `DialogOverlay`函数组件不能接收ref | 使用React.forwardRef转发到Radix原生Overlay | 前端回归不再出现该警告；真实下发弹窗可正常打开、提交和关闭 |
| SPD-PR无文件却显示“商品资质材料.pdf”等演示附件 | 商品详情只返回真实sys_attachment记录，取消按证号合成附件 | 新增2项详情回归通过；真实院内页面显示0份、暂无附件；真实证照附件在全量双端回归中仍正常 |
| 浏览器自动请求favicon.ico产生404 | 添加SVG图标及HTML显式图标链接 | 新浏览器访问不再产生favicon404；最终前端构建通过 |

## 检查与联调

- MCP-UI完整 `npm run typecheck`：通过。
- MCP-UI `npm test -- --reporter=dot`：6个文件、24项通过。
- MCP-UI最终 `npm run build`：通过。
- MCP-UI与SPD-PR后端 `package`：测试及打包通过。
- SPD-PR新增 `ProductAttachmentRealityTest`：2项通过。
- 最终真实双端回归：**82项全部通过**，包含目录审批、证照下发/续期/撤销、采购上传、报表、分类权限和租户隔离，以及无文件不合成PDF。
- [完整双端回归JSON](D:/SPD-MCP-UI/test-results/dual-system-20261009-111849/report.json)

浏览器使用隔离数据库及双方真实服务，不拦截或模拟业务接口。最终页面复验运行日志位于 `test-results/dual-system-20261009-112007`；各类非法请求的拒绝是预期业务结果。

## 修复后截图

- [分类新增成功](D:/SPD-MCP-UI/output/playwright/fix-category-created.png)
- [真实商品分类可选择](D:/SPD-MCP-UI/output/playwright/fix-product-category-selected.png)
- [SPD-PR分类接收](D:/SPD-MCP-UI/output/playwright/fix-spd-category-pending.png)
- [院内商品分类正确显示](D:/SPD-MCP-UI/output/playwright/fix-spd-category-hospital.png)
- [只读分类权限](D:/SPD-MCP-UI/output/playwright/fix-category-readonly.png)
- [删除确认](D:/SPD-MCP-UI/output/playwright/fix-category-delete-confirm.png)
- [列表真实数据](D:/SPD-MCP-UI/output/playwright/fix-list-page.png)
- [无真实附件的正确空态](D:/SPD-MCP-UI/output/playwright/fix-spd-attachments-empty.png)

## 升级说明

MCP-UI部署需执行 **V27** 迁移，管理员角色自动获得 `categories:manage`；其他角色需要显式授予该权限才能维护分类。SPD-PR附件展示修复通过后端代码升级生效，不新增数据库迁移。没有修改现有业务数据库。
