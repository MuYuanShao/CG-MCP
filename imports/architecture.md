# SPD供应商采购平台 — 系统架构设计方案

---

## 一、架构概述

### 1.1 项目定位

SPD供应商采购平台是面向医疗器械/耗材供应商的B2B采购管理平台，核心解决供应商与医院之间的采购协同、库存联动、证照合规、结算对账等全链路业务闭环。

### 1.2 核心设计原则

| 原则 | 说明 |
|------|------|
| **多租户数据隔离** | 供应商间数据严格隔离，采用租户ID字段 + 行级安全策略，确保数据零泄露 |
| **权限与数据双控** | RBAC角色权限 + 数据范围权限，实现功能权限与数据权限的二维管控 |
| **全链路可追溯** | 从采购计划→订单→发货→验收→结算→发票，全流程单据关联、状态可溯 |
| **医疗合规优先** | 证照效期预警、UDI追溯、GSP合规校验贯穿业务全流程 |
| **高可用可扩展** | 模块化单体架构，支持渐进式微服务拆分，业务模块热插拔 |

### 1.3 架构选型：模块化单体（Modular Monolith）

**选型理由：**

- 初期团队规模有限，微服务带来的运维复杂度（服务发现、链路追踪、分布式事务）成本过高
- 模块化单体在代码层面严格模块边界（包隔离 + API接口隔离），业务模块间通过内部接口调用
- 当某模块业务量激增（如库存、订单），可零成本拆分为独立微服务
- 单进程部署，事务一致性天然保障，开发调试效率高

---

## 二、整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         前端应用层                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 供应商门户 │  │ 运营管理台 │  │ 移动端APP │  │ 医院对接台 │            │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘            │
│        └──────────────┴──────────────┴──────────────┘                │
│                              │                                      │
│                     API Gateway / Nginx                             │
│                    (路由/限流/鉴权/CORS)                              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────────┐
│                      应用服务层 (Spring Boot)                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    公共基础设施层                              │    │
│  │  租户上下文 │ 统一异常 │ 审计日志 │ 分布式ID │ 文件存储       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 用户模块  │ │ 权限模块  │ │ 医院模块  │ │ 商品模块  │               │
│  │ user     │ │ auth     │ │ hospital │ │ product  │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 证照模块  │ │ 采购计划  │ │ 采购订单  │ │ 验收模块  │               │
│  │ license  │ │ plan     │ │ order    │ │ accept   │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 退货模块  │ │ 库存模块  │ │ 结算模块  │ │ 发票模块  │               │
│  │ refund   │ │ inventory│ │ settle   │ │ invoice  │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    领域事件总线 (内部)                         │    │
│  │  Spring Event → 异步事件驱动模块间解耦                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────────┐
│                       数据存储层                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ MySQL8.0 │  │  Redis   │  │ RabbitMQ │  │  MinIO   │           │
│  │ 业务数据  │  │ 缓存/会话 │  │ 异步消息  │  │ 文件存储  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、技术选型明细

### 3.1 后端技术栈

| 层次 | 技术 | 版本 | 选型依据 |
|------|------|------|----------|
| 核心框架 | Spring Boot | 3.2.x | 生态成熟、社区活跃、企业级首选 |
| 安全框架 | Spring Security + JWT | — | 细粒度权限控制、无状态Token认证 |
| ORM框架 | MyBatis-Plus | 3.5.x | 灵活SQL、多租户插件、代码生成 |
| 数据库 | MySQL | 8.0 | InnoDB事务支持、行级锁、成熟稳定 |
| 缓存 | Redis | 7.x | 会话管理、字典缓存、分布式锁、库存扣减 |
| 消息队列 | RabbitMQ | 3.12.x | 可靠消息投递、死信队列、订单异步处理 |
| 文件存储 | MinIO | — | S3兼容、私有化部署、证照文件存储 |
| 接口文档 | Knife4j (Swagger) | 4.x | 接口文档自动生成、在线调试 |
| 分布式ID | Snowflake | — | 趋势递增、高性能、无依赖 |
| 任务调度 | XXL-Job | — | 分布式调度、效期预警定时任务 |
| 日志框架 | Logback + ELK | — | 结构化日志、集中检索 |

### 3.2 前端技术栈

| 层次 | 技术 | 选型依据 |
|------|------|----------|
| 框架 | Vue 3 + TypeScript | 组合式API、类型安全、生态丰富 |
| UI组件库 | Element Plus | 企业级组件、表格/表单场景成熟 |
| 状态管理 | Pinia | 轻量、TypeScript友好 |
| 路由 | Vue Router 4 | 路由守卫、动态路由（权限驱动） |
| HTTP客户端 | Axios | 拦截器、统一错误处理 |
| 构建工具 | Vite | 极速HMR、按需加载 |

### 3.3 运维与部署

| 组件 | 技术 | 说明 |
|------|------|------|
| 容器化 | Docker | 标准化交付、环境一致性 |
| 编排 | Docker Compose（初期）→ K8s（规模期） | 渐进式容器编排 |
| 反向代理 | Nginx | 静态资源、SSL终止、负载均衡 |
| CI/CD | Jenkins / GitLab CI | 自动化构建、测试、部署 |
| 监控 | Prometheus + Grafana | 指标采集、可视化告警 |

---

## 四、微服务模块拆分与职责划分

### 4.1 模块总览

```
spd-platform/
├── spd-common/                    # 公共模块
│   ├── spd-common-core/           # 核心工具类、统一响应、异常定义
│   ├── spd-common-security/       # 安全工具、JWT、租户上下文
│   ├── spd-common-mybatis/        # MyBatis配置、多租户拦截器、自动填充
│   ├── spd-common-redis/          # Redis工具、分布式锁
│   ├── spd-common-mq/             # MQ工具、消息模板
│   ├── spd-common-file/           # 文件存储抽象（MinIO）
│   ├── spd-common-log/            # 审计日志注解与切面
│   └── spd-common-id/             # 分布式ID生成器
│
├── spd-gateway/                   # API网关
│
├── spd-modules/                   # 业务模块
│   ├── spd-user/                  # 用户管理模块
│   ├── spd-auth/                  # 权限管理模块
│   ├── spd-hospital/              # 医院管理模块
│   ├── spd-product/               # 商品目录管理模块
│   ├── spd-license/               # 证照管理模块
│   ├── spd-plan/                  # 采购计划管理模块
│   ├── spd-order/                 # 采购订单管理模块
│   ├── spd-acceptance/            # 院内验收单管理模块
│   ├── spd-refund/                # 退货管理模块
│   ├── spd-inventory/             # 库存管理模块
│   ├── spd-settlement/            # 结算单管理模块
│   └── spd-invoice/               # 发票管理模块
│
└── spd-admin/                     # 系统管理后台（启动入口）
```

### 4.2 各模块职责明细

#### 模块1：用户管理 (spd-user)

| 功能 | 说明 |
|------|------|
| 用户注册/登录 | 供应商用户自助注册、手机号/邮箱登录 |
| 用户信息管理 | 用户CRUD、状态管理（启用/禁用/锁定） |
| 组织架构 | 供应商企业信息、部门管理 |
| 用户关联 | 用户-供应商绑定、用户-角色分配 |

#### 模块2：权限管理 (spd-auth)

| 功能 | 说明 |
|------|------|
| 角色管理 | 角色CRUD、角色-权限关联 |
| 菜单权限 | 菜单树管理、按钮级权限控制 |
| 数据权限 | 数据范围策略（全部/本供应商/本部门/本人） |
| 租户隔离 | 基于tenant_id的行级数据隔离，SQL拦截自动注入 |

**数据权限策略设计：**

```
数据范围枚举：
- DATA_SCOPE_ALL        → 查看所有供应商数据（平台管理员）
- DATA_SCOPE_TENANT     → 仅查看本供应商数据（供应商用户）
- DATA_SCOPE_DEPT       → 仅查看本部门数据
- DATA_SCOPE_SELF       → 仅查看本人数据
```

#### 模块3：医院管理 (spd-hospital)

| 功能 | 说明 |
|------|------|
| 医院信息管理 | 医院基础信息CRUD（名称、等级、地址、联系人） |
| 供应商-医院关系 | 多对多映射、合作状态、授权品类范围 |
| 医院收货地址 | 一院多地址、默认地址管理 |
| 合作协议 | 合同起止日期、结算周期、配送要求 |

#### 模块4：商品目录管理 (spd-product)

| 功能 | 说明 |
|------|------|
| 商品信息管理 | 商品CRUD（名称、规格、型号、UDI、分类） |
| 商品分类 | 多级分类树、分类授权 |
| 供应商商品目录 | 供应商维护的可供商品、价格、最小起订量 |
| 医院目录映射 | 供应商商品与医院目录的对照关系 |
| 价格管理 | 价格维护、价格生效/失效、历史价格 |

#### 模块5：证照管理 (spd-license)

| 功能 | 说明 |
|------|------|
| 供应商证照 | 营业执照、经营许可证、备案凭证等 |
| 商品证照 | 注册证、生产许可证、卫生许可证等 |
| 效期管理 | 证照到期前30/60/90天预警 |
| 证照审核 | 证照上传→审核→生效/驳回流程 |
| 证照关联 | 证照与商品、供应商的关联关系 |

#### 模块6：采购计划管理 (spd-plan)

| 功能 | 说明 |
|------|------|
| 计划创建 | 医院发起采购需求、供应商响应 |
| 计划明细 | 商品、数量、期望交期、备注 |
| 计划审批 | 多级审批流程、审批意见 |
| 计划转订单 | 审批通过后一键生成采购订单 |
| 计划跟踪 | 计划执行状态、已转订单数量 |

#### 模块7：采购订单管理 (spd-order)

| 功能 | 说明 |
|------|------|
| 订单创建 | 手动创建 / 采购计划转入 |
| 订单明细 | 商品、数量、单价、金额、交期 |
| 订单状态机 | 待确认→已确认→部分发货→已发货→已完成→已关闭 |
| 发货通知 | 供应商发货后推送医院、物流信息跟踪 |
| 订单变更 | 数量/交期变更、变更审批 |

**订单状态机：**

```
                    ┌──────────┐
                    │  待确认   │
                    └────┬─────┘
                         │ 确认
                    ┌────▼─────┐
              ┌─────│  已确认   │─────┐
              │     └────┬─────┘     │
              │ 取消      │ 发货      │ 取消
              │     ┌────▼─────┐     │
              │     │ 部分发货  │     │
              │     └────┬─────┘     │
              │          │ 全部发货    │
              │     ┌────▼─────┐     │
              │     │  已发货   │     │
              │     └────┬─────┘     │
              │          │ 验收完成    │
              │     ┌────▼─────┐     │
              └────→│  已完成   │←────┘
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  已关闭   │
                    └──────────┘
```

#### 模块8：院内验收单管理 (spd-acceptance)

| 功能 | 说明 |
|------|------|
| 验收单创建 | 关联采购订单、录入验收数量/合格数量 |
| 验收明细 | 逐商品验收、批号、效期、UDI扫码 |
| 质量检验 | 合格/不合格判定、不合格原因记录 |
| 验收差异 | 实收与应收差异处理、差异通知供应商 |
| 验收确认 | 验收通过后自动更新库存、触发结算 |

#### 模块9：退货管理 (spd-refund)

| 功能 | 说明 |
|------|------|
| 退货申请 | 医院发起/供应商发起退货 |
| 退货审核 | 退货原因审核、退货数量确认 |
| 退货出库 | 退货商品出库、库存回退 |
| 退款处理 | 退货关联退款、退款金额核算 |
| 退货跟踪 | 退货物流、退货状态跟踪 |

#### 模块10：库存管理 (spd-inventory)

| 功能 | 说明 |
|------|------|
| 库存台账 | 实时库存查询、批次管理、库位管理 |
| 入库管理 | 采购入库、退货入库 |
| 出库管理 | 销售出库、退货出库 |
| 效期管理 | 效期预警（近效期/过期）、先进先出策略 |
| 库存盘点 | 盘点计划、盘盈盘亏处理 |
| 库存预警 | 上下限预警、安全库存提醒 |
| 批次追溯 | 批号+效期+UDI全链路追溯 |

**效期预警策略：**

```
效期状态判定：
- 正常：距效期 > 180天
- 近效期（黄色）：距效期 90~180天
- 临近效期（橙色）：距效期 30~90天
- 过期预警（红色）：距效期 < 30天
- 已过期：已过效期，禁止出库

定时任务：
- 每日02:00扫描效期，生成预警记录
- 预警消息推送：站内信 + 邮件 + 短信（可配置）
```

#### 模块11：结算单管理 (spd-settlement)

| 功能 | 说明 |
|------|------|
| 结算单生成 | 按周期/按订单汇总验收数据生成结算单 |
| 结算明细 | 关联验收单、商品明细、金额汇总 |
| 对账确认 | 供应商与医院双向确认 |
| 结算审批 | 结算单审批流程 |
| 差异处理 | 对账差异标记、协商处理 |

#### 模块12：发票管理 (spd-invoice)

| 功能 | 说明 |
|------|------|
| 发票登记 | 发票信息录入、关联结算单 |
| 发票审核 | 发票合规性审核 |
| 发票开具 | 供应商开票、电子发票上传 |
| 发票签收 | 医院签收确认 |
| 发票查询 | 按供应商/医院/日期/状态多维查询 |

---

## 五、数据架构设计

### 5.1 多租户隔离策略

**方案：共享数据库 + 租户字段隔离（tenant_id）**

```
所有业务表均包含 tenant_id 字段：
- MyBatis-Plus TenantLineInnerInterceptor 自动注入 WHERE tenant_id = ?
- 新增/修改时自动填充 tenant_id
- 超级管理员可跨租户查询（特殊SQL绕过拦截器）
```

**优势：** 运维成本低、资源利用率高、适合SaaS模式
**保障：** SQL拦截器 + 数据库行级安全策略（RLS）双重保障

### 5.2 核心数据表设计

#### 租户与用户域

```sql
-- 租户表（供应商）
CREATE TABLE sys_tenant (
    id              BIGINT PRIMARY KEY,
    tenant_name     VARCHAR(200) NOT NULL COMMENT '供应商名称',
    tenant_code     VARCHAR(50) NOT NULL UNIQUE COMMENT '供应商编码',
    credit_code     VARCHAR(50) COMMENT '统一社会信用代码',
    contact_name    VARCHAR(50) COMMENT '联系人',
    contact_phone   VARCHAR(20) COMMENT '联系电话',
    status          TINYINT DEFAULT 1 COMMENT '状态 1-正常 0-禁用',
    expire_time     DATETIME COMMENT '租户过期时间',
    tenant_id       BIGINT NOT NULL COMMENT '租户ID(自身)',
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 用户表
CREATE TABLE sys_user (
    id              BIGINT PRIMARY KEY,
    username        VARCHAR(50) NOT NULL,
    password        VARCHAR(200) NOT NULL,
    real_name       VARCHAR(50),
    phone           VARCHAR(20),
    email           VARCHAR(100),
    avatar          VARCHAR(500),
    status          TINYINT DEFAULT 1,
    tenant_id       BIGINT NOT NULL,
    dept_id         BIGINT,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0,
    UNIQUE KEY uk_username_tenant (username, tenant_id)
);

-- 部门表
CREATE TABLE sys_dept (
    id              BIGINT PRIMARY KEY,
    parent_id       BIGINT DEFAULT 0,
    dept_name       VARCHAR(100) NOT NULL,
    dept_code       VARCHAR(50),
    sort            INT DEFAULT 0,
    status          TINYINT DEFAULT 1,
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 角色表
CREATE TABLE sys_role (
    id              BIGINT PRIMARY KEY,
    role_name       VARCHAR(50) NOT NULL,
    role_code       VARCHAR(50) NOT NULL,
    data_scope      TINYINT DEFAULT 2 COMMENT '数据范围 1-全部 2-本租户 3-本部门 4-本人',
    status          TINYINT DEFAULT 1,
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 菜单表
CREATE TABLE sys_menu (
    id              BIGINT PRIMARY KEY,
    parent_id       BIGINT DEFAULT 0,
    menu_name       VARCHAR(100) NOT NULL,
    menu_type       TINYINT COMMENT '1-目录 2-菜单 3-按钮',
    path            VARCHAR(200),
    component       VARCHAR(200),
    permission      VARCHAR(100) COMMENT '权限标识',
    icon            VARCHAR(100),
    sort            INT DEFAULT 0,
    status          TINYINT DEFAULT 1,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 用户-角色关联
CREATE TABLE sys_user_role (
    id              BIGINT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    role_id         BIGINT NOT NULL,
    tenant_id       BIGINT NOT NULL
);

-- 角色-菜单关联
CREATE TABLE sys_role_menu (
    id              BIGINT PRIMARY KEY,
    role_id         BIGINT NOT NULL,
    menu_id         BIGINT NOT NULL,
    tenant_id       BIGINT NOT NULL
);
```

#### 医院域

```sql
-- 医院表
CREATE TABLE biz_hospital (
    id              BIGINT PRIMARY KEY,
    hospital_name   VARCHAR(200) NOT NULL,
    hospital_code   VARCHAR(50) NOT NULL,
    hospital_level  VARCHAR(20) COMMENT '医院等级',
    province        VARCHAR(50),
    city            VARCHAR(50),
    district        VARCHAR(50),
    address         VARCHAR(500),
    contact_name    VARCHAR(50),
    contact_phone   VARCHAR(20),
    status          TINYINT DEFAULT 1,
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 供应商-医院关系
CREATE TABLE biz_supplier_hospital (
    id              BIGINT PRIMARY KEY,
    supplier_id     BIGINT NOT NULL COMMENT '供应商tenant_id',
    hospital_id     BIGINT NOT NULL,
    cooperation_start DATE,
    cooperation_end   DATE,
    settlement_cycle TINYINT COMMENT '结算周期 1-月结 2-季结 3-年结',
    delivery_requirement VARCHAR(500),
    status          TINYINT DEFAULT 1 COMMENT '1-合作中 0-已终止',
    authorized_categories VARCHAR(500) COMMENT '授权品类ID列表',
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 医院收货地址
CREATE TABLE biz_hospital_address (
    id              BIGINT PRIMARY KEY,
    hospital_id     BIGINT NOT NULL,
    address_name    VARCHAR(100) COMMENT '地址名称(如:中心库房)',
    contact_name    VARCHAR(50),
    contact_phone   VARCHAR(20),
    address         VARCHAR(500),
    is_default      TINYINT DEFAULT 0,
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);
```

#### 商品域

```sql
-- 商品分类
CREATE TABLE biz_product_category (
    id              BIGINT PRIMARY KEY,
    parent_id       BIGINT DEFAULT 0,
    category_name   VARCHAR(100) NOT NULL,
    category_code   VARCHAR(50),
    sort            INT DEFAULT 0,
    status          TINYINT DEFAULT 1,
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 商品信息
CREATE TABLE biz_product (
    id              BIGINT PRIMARY KEY,
    product_name    VARCHAR(200) NOT NULL,
    product_code    VARCHAR(50) NOT NULL COMMENT '商品编码',
    category_id     BIGINT COMMENT '分类ID',
    specification   VARCHAR(200) COMMENT '规格',
    model           VARCHAR(100) COMMENT '型号',
    unit            VARCHAR(20) COMMENT '单位',
    udi             VARCHAR(200) COMMENT 'UDI编码',
    manufacturer    VARCHAR(200) COMMENT '生产厂家',
    brand           VARCHAR(100) COMMENT '品牌',
    is_licensed     TINYINT DEFAULT 0 COMMENT '是否需要证照 1-是 0-否',
    status          TINYINT DEFAULT 1,
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 供应商商品目录（供应商可供应的商品+价格）
CREATE TABLE biz_supplier_product (
    id              BIGINT PRIMARY KEY,
    product_id      BIGINT NOT NULL,
    supply_price    DECIMAL(12,4) COMMENT '供应价格',
    min_order_qty   INT DEFAULT 1 COMMENT '最小起订量',
    lead_time       INT COMMENT '交货天数',
    status          TINYINT DEFAULT 1 COMMENT '1-上架 0-下架',
    price_start_date DATE COMMENT '价格生效日期',
    price_end_date   DATE COMMENT '价格失效日期',
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 医院商品目录映射
CREATE TABLE biz_hospital_product_mapping (
    id              BIGINT PRIMARY KEY,
    hospital_id     BIGINT NOT NULL,
    supplier_product_id BIGINT NOT NULL COMMENT '供应商商品ID',
    hospital_product_code VARCHAR(50) COMMENT '医院端商品编码',
    hospital_product_name VARCHAR(200) COMMENT '医院端商品名称',
    hospital_price  DECIMAL(12,4) COMMENT '医院采购价',
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);
```

#### 证照域

```sql
-- 证照信息
CREATE TABLE biz_license (
    id              BIGINT PRIMARY KEY,
    license_type    TINYINT NOT NULL COMMENT '证照类型 1-营业执照 2-经营许可证 3-注册证 4-生产许可证 5-备案凭证 6-其他',
    license_no      VARCHAR(100) NOT NULL COMMENT '证号',
    license_name    VARCHAR(200) COMMENT '证照名称',
    issue_date      DATE COMMENT '发证日期',
    expire_date     DATE COMMENT '到期日期',
    issuing_authority VARCHAR(200) COMMENT '发证机关',
    file_url        VARCHAR(500) COMMENT '证照文件URL',
    status          TINYINT DEFAULT 0 COMMENT '0-待审核 1-生效 2-过期 3-驳回',
    related_type    TINYINT COMMENT '关联类型 1-供应商 2-商品',
    related_id      BIGINT COMMENT '关联对象ID',
    audit_remark    VARCHAR(500) COMMENT '审核意见',
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 证照预警记录
CREATE TABLE biz_license_alert (
    id              BIGINT PRIMARY KEY,
    license_id      BIGINT NOT NULL,
    alert_level     TINYINT COMMENT '1-90天 2-60天 3-30天',
    expire_date     DATE,
    is_handled      TINYINT DEFAULT 0,
    tenant_id       BIGINT NOT NULL,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 采购计划域

```sql
-- 采购计划
CREATE TABLE biz_purchase_plan (
    id              BIGINT PRIMARY KEY,
    plan_no         VARCHAR(50) NOT NULL UNIQUE COMMENT '计划编号',
    hospital_id     BIGINT NOT NULL,
    plan_date       DATE COMMENT '计划日期',
    delivery_date   DATE COMMENT '期望交期',
    total_amount    DECIMAL(14,2) COMMENT '计划总金额',
    status          TINYINT DEFAULT 0 COMMENT '0-草稿 1-待审批 2-已审批 3-部分转单 4-已转单 5-已关闭',
    audit_status    TINYINT DEFAULT 0 COMMENT '0-未提交 1-审批中 2-已通过 3-已驳回',
    audit_remark    VARCHAR(500),
    remark          VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 采购计划明细
CREATE TABLE biz_purchase_plan_item (
    id              BIGINT PRIMARY KEY,
    plan_id         BIGINT NOT NULL,
    product_id      BIGINT NOT NULL,
    supplier_product_id BIGINT,
    plan_qty        INT NOT NULL COMMENT '计划数量',
    unit_price      DECIMAL(12,4) COMMENT '单价',
    amount          DECIMAL(14,2) COMMENT '金额',
    delivered_qty   INT DEFAULT 0 COMMENT '已转订单数量',
    remark          VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);
```

#### 采购订单域

```sql
-- 采购订单
CREATE TABLE biz_purchase_order (
    id              BIGINT PRIMARY KEY,
    order_no        VARCHAR(50) NOT NULL UNIQUE COMMENT '订单编号',
    plan_id         BIGINT COMMENT '关联采购计划ID',
    hospital_id     BIGINT NOT NULL,
    hospital_address_id BIGINT COMMENT '收货地址ID',
    order_date      DATE COMMENT '订单日期',
    delivery_date   DATE COMMENT '交货日期',
    total_amount    DECIMAL(14,2) COMMENT '订单总金额',
    status          TINYINT DEFAULT 0 COMMENT '0-待确认 1-已确认 2-部分发货 3-已发货 4-已完成 5-已关闭',
    delivery_status TINYINT DEFAULT 0 COMMENT '0-未发货 1-部分发货 2-已发货',
    accept_status   TINYINT DEFAULT 0 COMMENT '0-未验收 1-部分验收 2-已验收',
    remark          VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 采购订单明细
CREATE TABLE biz_purchase_order_item (
    id              BIGINT PRIMARY KEY,
    order_id        BIGINT NOT NULL,
    plan_item_id    BIGINT COMMENT '关联计划明细ID',
    product_id      BIGINT NOT NULL,
    supplier_product_id BIGINT,
    order_qty       INT NOT NULL COMMENT '订单数量',
    unit_price      DECIMAL(12,4) COMMENT '单价',
    amount          DECIMAL(14,2) COMMENT '金额',
    delivered_qty   INT DEFAULT 0 COMMENT '已发货数量',
    accepted_qty    INT DEFAULT 0 COMMENT '已验收数量',
    remark          VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);
```

#### 验收域

```sql
-- 验收单
CREATE TABLE biz_acceptance (
    id              BIGINT PRIMARY KEY,
    acceptance_no   VARCHAR(50) NOT NULL UNIQUE COMMENT '验收单编号',
    order_id        BIGINT NOT NULL COMMENT '关联订单ID',
    hospital_id     BIGINT NOT NULL,
    acceptance_date DATE COMMENT '验收日期',
    total_qty       INT COMMENT '总数量',
    qualified_qty   INT COMMENT '合格数量',
    unqualified_qty INT COMMENT '不合格数量',
    status          TINYINT DEFAULT 0 COMMENT '0-待验收 1-部分验收 2-已验收 3-有差异',
    remark          VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 验收明细
CREATE TABLE biz_acceptance_item (
    id              BIGINT PRIMARY KEY,
    acceptance_id   BIGINT NOT NULL,
    order_item_id   BIGINT NOT NULL,
    product_id      BIGINT NOT NULL,
    batch_no        VARCHAR(50) COMMENT '批号',
    production_date DATE COMMENT '生产日期',
    expire_date     DATE COMMENT '有效期',
    udi_code        VARCHAR(200) COMMENT 'UDI编码',
    accept_qty      INT COMMENT '验收数量',
    qualified_qty   INT COMMENT '合格数量',
    unqualified_qty INT COMMENT '不合格数量',
    unqualified_reason VARCHAR(500) COMMENT '不合格原因',
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);
```

#### 退货域

```sql
-- 退货单
CREATE TABLE biz_refund (
    id              BIGINT PRIMARY KEY,
    refund_no       VARCHAR(50) NOT NULL UNIQUE COMMENT '退货单编号',
    order_id        BIGINT COMMENT '关联订单ID',
    acceptance_id   BIGINT COMMENT '关联验收单ID',
    hospital_id     BIGINT NOT NULL,
    refund_type     TINYINT COMMENT '1-质量问题 2-数量差异 3-效期问题 4-其他',
    refund_amount   DECIMAL(14,2) COMMENT '退货金额',
    status          TINYINT DEFAULT 0 COMMENT '0-待审核 1-已审核 2-退货中 3-已完成 4-已驳回',
    audit_remark    VARCHAR(500),
    remark          VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 退货明细
CREATE TABLE biz_refund_item (
    id              BIGINT PRIMARY KEY,
    refund_id       BIGINT NOT NULL,
    product_id      BIGINT NOT NULL,
    order_item_id   BIGINT,
    batch_no        VARCHAR(50),
    refund_qty      INT NOT NULL COMMENT '退货数量',
    unit_price      DECIMAL(12,4),
    amount          DECIMAL(14,2),
    refund_reason   VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);
```

#### 库存域

```sql
-- 库存主表
CREATE TABLE biz_inventory (
    id              BIGINT PRIMARY KEY,
    product_id      BIGINT NOT NULL,
    warehouse_id    BIGINT COMMENT '仓库ID',
    total_qty       INT DEFAULT 0 COMMENT '库存总量',
    available_qty   INT DEFAULT 0 COMMENT '可用量',
    locked_qty      INT DEFAULT 0 COMMENT '锁定量',
    safety_qty      INT COMMENT '安全库存',
    max_qty         INT COMMENT '库存上限',
    min_qty         INT COMMENT '库存下限',
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0,
    UNIQUE KEY uk_product_warehouse (product_id, warehouse_id, tenant_id)
);

-- 库存批次表
CREATE TABLE biz_inventory_batch (
    id              BIGINT PRIMARY KEY,
    inventory_id    BIGINT NOT NULL,
    product_id      BIGINT NOT NULL,
    batch_no        VARCHAR(50) NOT NULL COMMENT '批号',
    production_date DATE COMMENT '生产日期',
    expire_date     DATE COMMENT '有效期',
    udi_code        VARCHAR(200) COMMENT 'UDI编码',
    qty             INT DEFAULT 0 COMMENT '批次数量',
    available_qty   INT DEFAULT 0 COMMENT '可用量',
    locked_qty      INT DEFAULT 0 COMMENT '锁定量',
    cost_price      DECIMAL(12,4) COMMENT '成本价',
    expire_status   TINYINT DEFAULT 0 COMMENT '0-正常 1-近效期 2-临近效期 3-过期预警 4-已过期',
    warehouse_id    BIGINT,
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 库存流水
CREATE TABLE biz_inventory_log (
    id              BIGINT PRIMARY KEY,
    inventory_id    BIGINT NOT NULL,
    product_id      BIGINT NOT NULL,
    batch_no        VARCHAR(50),
    move_type       TINYINT NOT NULL COMMENT '1-采购入库 2-销售出库 3-退货入库 4-退货出库 5-盘点调整',
    move_qty        INT NOT NULL COMMENT '变动数量(正为入,负为出)',
    before_qty      INT COMMENT '变动前数量',
    after_qty       INT COMMENT '变动后数量',
    related_no      VARCHAR(50) COMMENT '关联单号',
    remark          VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 效期预警
CREATE TABLE biz_expire_alert (
    id              BIGINT PRIMARY KEY,
    product_id      BIGINT NOT NULL,
    batch_no        VARCHAR(50) NOT NULL,
    expire_date     DATE NOT NULL,
    remain_days     INT COMMENT '剩余天数',
    alert_level     TINYINT COMMENT '1-近效期(黄色) 2-临近效期(橙色) 3-过期预警(红色)',
    is_handled      TINYINT DEFAULT 0,
    handle_remark   VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 结算域

```sql
-- 结算单
CREATE TABLE biz_settlement (
    id              BIGINT PRIMARY KEY,
    settlement_no   VARCHAR(50) NOT NULL UNIQUE COMMENT '结算单编号',
    hospital_id     BIGINT NOT NULL,
    settlement_start DATE COMMENT '结算起始日期',
    settlement_end   DATE COMMENT '结算截止日期',
    total_amount    DECIMAL(14,2) COMMENT '结算总金额',
    status          TINYINT DEFAULT 0 COMMENT '0-待确认 1-供应商已确认 2-医院已确认 3-已审批 4-差异处理中 5-已完成',
    confirm_status  TINYINT DEFAULT 0 COMMENT '0-未确认 1-已确认 2-有异议',
    remark          VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);

-- 结算明细
CREATE TABLE biz_settlement_item (
    id              BIGINT PRIMARY KEY,
    settlement_id   BIGINT NOT NULL,
    acceptance_id   BIGINT COMMENT '关联验收单ID',
    order_id        BIGINT COMMENT '关联订单ID',
    product_id      BIGINT NOT NULL,
    product_name    VARCHAR(200),
    settle_qty      INT COMMENT '结算数量',
    unit_price      DECIMAL(12,4) COMMENT '单价',
    amount          DECIMAL(14,2) COMMENT '金额',
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);
```

#### 发票域

```sql
-- 发票
CREATE TABLE biz_invoice (
    id              BIGINT PRIMARY KEY,
    invoice_no      VARCHAR(50) NOT NULL UNIQUE COMMENT '发票号码',
    invoice_code    VARCHAR(50) COMMENT '发票代码',
    invoice_type    TINYINT COMMENT '1-增值税专用发票 2-增值税普通发票 3-电子发票',
    settlement_id   BIGINT COMMENT '关联结算单ID',
    hospital_id     BIGINT NOT NULL,
    invoice_date    DATE COMMENT '开票日期',
    invoice_amount  DECIMAL(14,2) COMMENT '发票金额',
    tax_amount      DECIMAL(14,2) COMMENT '税额',
    total_amount    DECIMAL(14,2) COMMENT '价税合计',
    tax_rate        DECIMAL(5,2) COMMENT '税率',
    file_url        VARCHAR(500) COMMENT '电子发票文件URL',
    status          TINYINT DEFAULT 0 COMMENT '0-待审核 1-已审核 2-已签收 3-已驳回',
    audit_remark    VARCHAR(500),
    remark          VARCHAR(500),
    tenant_id       BIGINT NOT NULL,
    created_by      BIGINT,
    created_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by      BIGINT,
    updated_time    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0
);
```

### 5.3 缓存架构

| 缓存Key | 数据 | 过期策略 | 说明 |
|---------|------|----------|------|
| `user:token:{userId}` | JWT Token | 2h | 用户会话 |
| `user:perms:{userId}` | 权限列表 | 30min | 用户权限缓存 |
| `dict:{type}` | 字典数据 | 24h | 数据字典 |
| `product:{tenantId}:{productId}` | 商品信息 | 1h | 商品详情 |
| `inventory:{tenantId}:{productId}` | 库存数量 | 10min | 实时库存 |
| `license:expire:{tenantId}` | 证照预警 | 1h | 证照效期 |

### 5.4 数据备份方案

- MySQL主从复制：1主2从，读写分离
- 每日全量备份 + 实时binlog增量备份
- 备份保留策略：日备份7天、周备份4周、月备份12月
- 异地灾备：跨机房主从同步（RPO < 5s）

---

## 六、系统集成架构

### 6.1 外部系统集成

```
┌──────────────────────────────────────────────────────────┐
│                    SPD供应商采购平台                       │
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ HIS系统  │  │ UDI平台  │  │ 物流系统  │  │ 税务系统  │   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │
│       │            │            │            │          │
│  ┌────┴────────────┴────────────┴────────────┴────┐    │
│  │              统一集成网关 (API Gateway)           │    │
│  │   协议转换 │ 数据映射 │ 安全认证 │ 限流熔断       │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

| 对接系统 | 对接方式 | 数据流向 | 说明 |
|---------|---------|---------|------|
| HIS系统 | REST API / HL7 | 双向 | 采购需求推送、验收结果回传 |
| UDI平台 | REST API | 入 | UDI扫码解析、产品信息获取 |
| 物流系统 | REST API / EDI | 双向 | 发货通知、物流跟踪 |
| 税务系统 | REST API | 出 | 发票查验、开票对接 |
| 短信/邮件 | SDK | 出 | 预警通知、业务提醒 |

### 6.2 接口安全设计

- **传输安全**：HTTPS + TLS 1.3
- **身份认证**：API Key + HMAC签名
- **数据加密**：敏感字段AES-256加密传输
- **防重放**：请求时间戳 + nonce校验
- **限流**：令牌桶算法，按租户维度限流

---

## 七、合规与安全设计

### 7.1 数据安全

| 措施 | 说明 |
|------|------|
| 数据脱敏 | 手机号/身份证/银行卡号查询时脱敏显示 |
| 传输加密 | HTTPS + 敏感字段AES加密 |
| 存储加密 | 密码BCrypt哈希、敏感字段数据库加密 |
| 数据备份 | 主从复制 + 异地灾备 |
| 日志脱敏 | 审计日志中敏感信息脱敏 |

### 7.2 权限架构

```
权限模型：RBAC + 数据权限

功能权限：
  菜单权限 → 控制页面可见性
  按钮权限 → 控制操作可用性（如：新增/编辑/删除/审批）
  API权限  → 接口级别访问控制

数据权限：
  DATA_SCOPE_ALL     → 平台管理员，查看所有供应商
  DATA_SCOPE_TENANT  → 供应商管理员，查看本供应商数据
  DATA_SCOPE_DEPT    → 部门级，查看本部门数据
  DATA_SCOPE_SELF    → 个人级，仅查看本人数据

实现方式：
  MyBatis-Plus DataPermissionInterceptor + 自定义数据权限SQL注入
```

### 7.3 审计日志

- 所有业务操作记录审计日志（操作人、操作时间、操作类型、变更前后数据）
- 登录日志（登录/登出/登录失败）
- 数据变更日志（关键字段变更前后值）
- 审计日志不可篡改、保留5年

---

## 八、部署架构

### 8.1 初期部署方案（单机/双机）

```
┌─────────────────────────────────────────────┐
│              Nginx (反向代理/SSL)             │
│                  │                           │
│         ┌───────┴───────┐                    │
│         │               │                    │
│    ┌────▼────┐   ┌─────▼─────┐              │
│    │ 前端静态 │   │ SpringBoot │              │
│    │  资源   │   │  应用实例   │              │
│    └─────────┘   └─────┬─────┘              │
│                        │                     │
│         ┌───────┬──────┴──────┬─────────┐   │
│         │       │             │         │    │
│    ┌────▼──┐ ┌──▼───┐ ┌─────▼──┐ ┌───▼──┐ │
│    │MySQL  │ │Redis │ │RabbitMQ│ │MinIO │ │
│    │主从   │ │      │ │        │ │      │ │
│    └───────┘ └──────┘ └────────┘ └──────┘ │
└─────────────────────────────────────────────┘
```

### 8.2 规模期部署方案（K8s集群）

```
┌──────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                  │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Ingress   │  │  ConfigMap│  │  Secret   │           │
│  │ Controller│  │  /Nacos   │  │  管理     │           │
│  └─────┬────┘  └──────────┘  └──────────┘           │
│        │                                              │
│  ┌─────▼─────────────────────────────────────────┐   │
│  │              Service Mesh                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐         │   │
│  │  │spd-app  │ │spd-app  │ │spd-app  │  ×N     │   │
│  │  │ pod-1   │ │ pod-2   │ │ pod-3   │         │   │
│  │  └─────────┘ └─────────┘ └─────────┘         │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ MySQL    │  │  Redis   │  │ RabbitMQ │           │
│  │ StatefulSet│ │ Cluster │  │ Cluster  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│                                                       │
│  ┌──────────┐  ┌──────────┐                          │
│  │ MinIO    │  │监控(Prom │                          │
│  │          │  │ +Grafana)│                          │
│  └──────────┘  └──────────┘                          │
└──────────────────────────────────────────────────────┘
```

---

## 九、实施计划与风险

### 9.1 实施阶段

| 阶段 | 周期 | 交付内容 |
|------|------|----------|
| **P0 基础框架** | 4周 | 项目骨架、公共模块、用户/权限/租户体系、前端脚手架 |
| **P1 核心业务** | 6周 | 医院管理、商品目录、证照管理、采购计划、采购订单 |
| **P2 供应链闭环** | 4周 | 验收管理、退货管理、库存管理（含效期预警） |
| **P3 财务结算** | 3周 | 结算单管理、发票管理 |
| **P4 集成优化** | 3周 | 外部系统集成、性能优化、安全加固、上线部署 |

### 9.2 技术风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 多租户数据泄露 | 高 | SQL拦截器 + 数据库RLS + 代码Review + 渗透测试 |
| 库存并发超卖 | 高 | Redis分布式锁 + 数据库乐观锁 + 库存预扣 |
| 效期预警延迟 | 中 | XXL-Job定时任务 + Redis缓存 + 消息推送 |
| 大数据量查询慢 | 中 | 分页查询 + 索引优化 + 读写分离 + ES检索 |
| 外部系统对接不稳定 | 中 | 熔断降级 + 重试机制 + 异步解耦 |

---

## 十、业务流程全景图

```
供应商注册 ──→ 医院授权 ──→ 商品目录上架 ──→ 证照合规校验
                                              │
                                              ▼
发票管理 ←── 结算对账 ←── 验收确认 ←── 发货配送 ←── 采购订单 ←── 采购计划
    │              │            │            │            │
    │              │            │            │            │
    ▼              ▼            ▼            ▼            ▼
  税务对接      差异处理     库存入库      物流跟踪      审批流程
                               │
                               ▼
                         效期预警/盘点
                               │
                               ▼
                          退货处理 ←── 质量问题
```
