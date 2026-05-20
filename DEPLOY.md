# SPD MCP UI 部署说明

## 概览

本仓库可以运行一套最小可部署栈：

- `frontend`：Vite 构建产物由 Nginx 提供服务，访问地址为 `http://localhost:8088`，并在容器启动时生成运行时配置
- `spd-api`：Spring Boot 生产 API，容器端口为 `8080`
- `mysql`：MySQL 8.0，初始化脚本来自 `database/init`

前端会在运行时读取 `/env.js`，随后调用 `/api/*`；Nginx 会将这些请求代理到 `spd-api`。

## 前置条件

- Docker Engine 和 Docker Compose v2
- 本地开发前端需要 Node.js 22 和 npm；本地开发后端需要 JDK 17 和 Maven 3.9+

## 环境变量

根据示例文件创建 `.env`：

```bash
copy .env.example .env
```

部署前请替换所有占位密码。

必填变量：

| 变量 | 用途 |
| --- | --- |
| `VITE_API_BASE_URL` | 前端 API 基础地址。同源 Nginx 部署使用 `/api`；本地直连 API 可使用 `http://localhost:8080/api`。 |
| `CORS_ORIGIN` | API 被跨域调用时允许的浏览器来源。 |
| `MYSQL_DATABASE` | MySQL 数据库名称。 |
| `MYSQL_USER` | 应用数据库用户。 |
| `MYSQL_PASSWORD` | 应用数据库密码。 |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码。 |
| `MYSQL_PORT` | 映射到 MySQL 容器 `3306` 端口的宿主机端口。 |
| `SPRING_PROFILES_ACTIVE` | Spring Boot 运行环境，部署默认使用 `prod`。 |
| `SPRING_DATASOURCE_URL` | Spring Boot 本地直连 MySQL 时使用的 JDBC 地址。Compose 内部会自动指向 `mysql:3306`。 |
| `SPRING_DATASOURCE_USERNAME` | Spring Boot 数据库用户名，通常与 `MYSQL_USER` 保持一致。 |
| `SPRING_DATASOURCE_PASSWORD` | Spring Boot 数据库密码，通常与 `MYSQL_PASSWORD` 保持一致。 |
| `SPRING_FLYWAY_ENABLED` | 是否启用 Flyway 数据库迁移，默认 `true`。 |

## 使用 Docker Compose 启动

```bash
docker compose --env-file .env up --build -d
```

前端镜像与环境变量解耦。容器启动时，`docker/nginx/99-runtime-env.sh` 会写入：

```text
/usr/share/nginx/html/env.js
```

其中包含 `window.__APP_CONFIG__.VITE_API_BASE_URL`。修改 `VITE_API_BASE_URL` 后只需要重建前端容器，不需要重新构建镜像：

```bash
docker compose --env-file .env up -d --force-recreate frontend
```

服务地址：

- 前端：`http://localhost:8088`
- API 健康检查：`http://localhost:8088/api/health`
- MySQL 宿主机端口：`localhost:${MYSQL_PORT}`

查看服务状态：

```bash
docker compose ps
docker compose logs -f mysql spd-api frontend
```

## 数据库初始化

生产数据库结构由 Spring Boot 启动时通过 Flyway 管理，迁移脚本位于：

```text
server/src/main/resources/db/migration
```

首次启动 `spd-api` 时，Flyway 会执行：

```text
server/src/main/resources/db/migration/V1__init_spd_schema.sql
```

该脚本会创建 SPD 生产业务骨架表，并写入用于租户、用户、角色、医院、商品、采购计划、采购订单、配送单、发货单和退货验证的种子数据。

`database/init/01_schema.sql` 保留为历史兼容脚本；当前 Compose 不再挂载该目录，生产演进以 Flyway 迁移为准。

如果需要从零重建数据库：

```bash
docker compose down -v
docker compose --env-file .env up --build -d
```

`down -v` 会删除 MySQL 数据卷。仅在可以接受清空本地数据时使用。

## API 契约

当前最小 API 端点：

- `GET /api/health`：验证 API 进程和 MySQL 连接状态。
- `GET /api/refunds`：从 MySQL 读取退货单。
- `POST /api/refunds/{id}/approve`：退货审核通过，仅允许 `待审核 -> 已审核`。
- `POST /api/refunds/{id}/reject`：退货驳回，仅允许 `待审核 -> 已驳回`。
- `POST /api/refunds/{id}/outbound`：退货出库，仅允许 `已审核 -> 退货中`。
- `POST /api/refunds/{id}/complete`：退货完成，仅允许 `退货中 -> 已完成`。
- `GET /api/purchase-plans`：采购计划列表。
- `GET /api/purchase-orders`：采购订单列表。
- `GET /api/delivery-orders`：配送单列表。
- `GET /api/shipment-orders`：发货单列表。
- `GET /api/permissions/me/actions`：当前用户可执行业务动作。
- `POST /api/operation-logs`：保存前端成功操作日志到 MySQL。

后续后端模块应继续保留 `/api` 前缀，以确保当前 Nginx 代理和运行时配置 `VITE_API_BASE_URL=/api` 仍然有效。统一响应格式为：

```json
{
  "code": "SUCCESS",
  "message": "操作成功",
  "data": {}
}
```

## 本地开发

仅启动前端：

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

E2E 测试：

```bash
npm run test:e2e
```

当前 E2E 套件会启动 Vite，并基于本地 mock 状态验证前端流程。随着更多接口落地，应补充 API/MySQL 集成测试。

后端本地启动：

```bash
cd server
mvn spring-boot:run
```

后端打包：

```bash
cd server
mvn clean package
```

## 健康检查

Compose 包含以下健康检查：

- MySQL：`mysqladmin ping`
- API：`GET /api/health`
- 前端：`GET /`

前端会在 `spd-api` 健康后启动；`spd-api` 会在 MySQL 健康后启动。

## 生产注意事项

- 在 `.env` 中使用强度高且唯一的数据库密码。
- 不要提交 `.env`。
- 当前端和 API 通过同一个 Nginx 来源提供服务时，保持 `VITE_API_BASE_URL=/api`。
- 如果 API 部署在其他域名，请将 `VITE_API_BASE_URL` 设置为对应来源，并在后端用明确的 `CORS_ORIGIN` 配置跨域；携带凭据时不要使用通配来源。
- `/env.js` 使用 `Cache-Control: no-store` 提供服务，避免运行时环境变更被浏览器缓存固定。
- 当前后端已切换为 Spring Boot + MySQL 生产骨架。后续应继续补齐 JWT 鉴权、接口级权限校验、审计日志写入、分页查询、乐观锁和集成测试。
