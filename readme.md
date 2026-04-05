# ICET — Internal Control Evaluation Testing System

> 自动化内部控制评价测试系统

## 目录

- [背景与目的](#-背景与目的)
- [核心功能](#-核心功能)
- [系统架构](#-系统架构)
- [技术选型](#-技术选型)
- [项目结构](#-项目结构)
- [环境准备](#-环境准备)
- [快速开始](#-快速开始)
- [开发指南](#-开发指南)

---

## 背景与目的

### 业务背景

企业内部控制评价测试（Internal Control Evaluation Testing）是合规管理的核心环节。测试人员需要：

1. **查阅规章制度**：从规章制度 PDF 中理解各业务场景的控制点（如 C1、C2...）
2. **设计测试步骤**：根据控制点拆解出可执行的测试检查项
3. **准备测试材料**：收集待检查的业务样本（采购计划、付款申请单等 PDF 文件）
4. **逐步骤执行检查**：对每份样本材料逐一核查每个测试步骤（签名是否存在、审批链是否完整、日期是否合规等）
5. **填写工作底稿**：将测试过程与结果记录为标准格式 Excel 表格并归档

### 痛点

| 痛点 | 说明 |
|------|------|
| **重复劳动多** | 每次测试需要人工阅读大量 PDF，步骤高度相似 |
| **效率瓶颈** | 单份底稿往往需要数小时到数天的人工时间 |
| **一致性差** | 不同测试人员对同一控制点的理解和步骤设计存在差异 |
| **追溯困难** | 测试依据、证据散落在各处，难以系统化管理 |

### 系统目标

ICET 旨在将上述流程**最大程度自动化**：

```
传统流程（全人工，数小时/份）          自动化流程（AI辅助，数分钟/份）
──────────────────────────────         ──────────────────────────────
手动阅读规章制度 PDF             ──►   AI 解析 → 自动提取控制点
人工设计测试步骤                 ──►   AI 生成测试计划 → 人工审核确认
逐份查阅样本材料                 ──►   AI 解析样本 → 结构化理解
手动核查每个步骤                 ──►   AI Agent 自动执行 → 人工复核异常
手动填写 Excel 工作底稿          ──►   自动生成底稿 → 一键导出归档
```

---

## 核心功能

### 业务场景管理
- 维护公司各业务领域（采购、财务、人事等）的场景目录
- 关联对应的规章制度文件库
- 支持一/二/三级流程层级结构

### 规章制度解析
- 上传 PDF 规章制度文件
- **AI 自动提取控制点**（控制编号、描述、责任人、审批链）
- 控制点人工审核与修正
- 版本管理与历史追溯

### 测试任务全生命周期管理

```
DRAFT → PLANNING → PLAN_REVIEW → EXECUTING → EXEC_REVIEW → PAPER_DRAFT → PAPER_REVIEW → ARCHIVED
```

- 创建测试任务，绑定场景与规章制度
- **AI 自动生成测试计划**（步骤列表 + 每步骤执行配置）
- 人工审核/修改测试步骤
- 批量上传测试样本材料

### AI Agent 自动执行测试

基于 **LangGraph** 构建的多 Agent 协作体系：

| Agent | 职责 | 模式 |
|-------|------|------|
| `RegulationParserAgent` | 从规章 PDF 提取控制点 | ReAct |
| `PlanGeneratorAgent` | 基于控制点生成测试计划 | Plan-and-Execute |
| `SampleParserAgent` | 解析样本 PDF（签名/日期/金额识别） | Tool Calling |
| `TestExecutorAgent` | 逐步骤检查每份样本，输出 ✓/×/N/A + 证据 | ReAct + Plan |

- AI 执行结果附带**置信度**与**可溯源证据**
- 支持**人工覆盖** AI 判断
- 异常项（×）自动生成差异记录

### 工作底稿自动生成与导出
- 汇聚所有测试数据，**一键生成标准格式工作底稿**
- 完整还原企业标准 Excel 格式（含合并单元格、样式、图例）
- 人工编辑复核后提交审阅、批准归档
- 底稿快照存储，归档后永久不变

### 实时进度监控
- WebSocket 实时推送 AI 任务进度
- 可视化执行矩阵（样本 × 步骤 结果展示）
- AI 推理过程与证据可查看

---

## 系统架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              ICET 系统架构                                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    前端层  apps/web  (React + Vite)                  │ │
│  │  场景管理  │  任务详情  │  执行矩阵  │  底稿编辑器  │  实时监控       │ │
│  └────────────────────────────┬────────────────────────────────────────┘ │
│                               │  HTTP REST + WebSocket                   │
│  ┌────────────────────────────▼────────────────────────────────────────┐ │
│  │                   API 层  apps/api  (Express + TypeScript)           │ │
│  │  路由层 → 控制器层 → 服务层 → 数据访问层                             │ │
│  └──────┬─────────────────────────────────┬───────────────────────────┘ │
│         │                                 │                              │
│  ┌──────▼──────────────────┐   ┌──────────▼──────────────────────────┐  │
│  │   基础设施层             │   │        AI Agent 层                   │  │
│  │                         │   │                                      │  │
│  │  PostgreSQL  (Prisma)   │   │  RegulationParserAgent               │  │
│  │  Redis       (BullMQ)   │   │  PlanGeneratorAgent                  │  │
│  │  MinIO/S3   (文件存储)  │   │  SampleParserAgent                   │  │
│  │  Socket.io  (实时推送)  │   │  TestExecutorAgent                   │  │
│  │                         │   │                                      │  │
│  └─────────────────────────┘   │  ──── LangGraph Runtime ────         │  │
│                                │  State Graph │ Checkpointer          │  │
│                                │  Tool Calling│ ReAct Loop            │  │
│                                └──────────────────────────────────────┘  │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │              共享包层  packages/                                      │ │
│  │  shared (Types + Utils)  │  excel-generator (SheetJS 底稿生成)       │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 关键数据流

```
上传规章制度 PDF
    │
    ▼
RegulationParserAgent ──► 控制点列表（C1, C2...）
    │
    ▼
PlanGeneratorAgent ──► 测试步骤列表 + 执行配置
    │（人工审核）
    ▼
上传样本材料 PDF
    │
    ▼
SampleParserAgent ──► 结构化解析（签名/日期/金额/文本）
    │
    ▼
TestExecutorAgent（Plan → Execute Loop → Judge）
    │          ├── ✓ 通过（附证据）
    │          ├── × 不通过（自动创建异常记录）
    │          └── N/A 不适用
    ▼
WorkingPaper 自动生成 ──► Excel 导出归档
```

---

## 技术选型

### 全栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 语言 | TypeScript | `^5.4` | 全栈统一类型 |
| 包管理 | pnpm | `^9.0` | Monorepo 工作区支持 |
| 构建编排 | Turborepo | `^2.0` | 增量构建缓存 |
| 运行时 | Node.js | `>=20 LTS` | — |

### 前端（`apps/web`）

| 类别 | 技术 | 说明 |
|------|------|------|
| 框架 | React 18 | 并发特性、Suspense |
| 构建工具 | Vite 5 | 极速 HMR |
| 路由 | React Router v6 | 数据路由模式 |
| 服务端状态 | TanStack Query v5 | 数据获取、缓存、同步 |
| 客户端状态 | Zustand | 轻量全局状态 |
| UI 组件 | shadcn/ui + Radix UI | 无样式锁定，高度可定制 |
| 样式 | Tailwind CSS v3 | 原子化 CSS |
| 实时通信 | Socket.io-client | AI 进度推送订阅 |
| Excel 生成 | SheetJS (xlsx) | 前端导出底稿 |

### 后端（`apps/api`）

| 类别 | 技术 | 说明 |
|------|------|------|
| 框架 | Express.js 4 | 轻量灵活，足够小规模 |
| 数据库 ORM | Prisma 5 | 类型安全，迁移管理方便 |
| 数据库 | PostgreSQL 16 | JSONB 存储快照数据 |
| 缓存 / 队列 | Redis + BullMQ | AI 任务异步队列 + 进度跟踪 |
| 文件存储 | MinIO（本地）/ AWS S3（生产） | S3 兼容接口，可平滑迁移 |
| 实时通信 | Socket.io | AI 任务进度广播 |
| 认证 | JWT + httpOnly Cookie | 无状态认证 |
| 文件上传 | Multer | multipart 处理 |
| 校验 | Zod | 运行时类型校验，与 TS 类型同步 |

### AI 层

| 类别 | 技术 | 说明 |
|------|------|------|
| Agent 框架 | LangGraph.js | 状态图管理 Agent 执行，支持断点续传 |
| LLM SDK | LangChain.js | 统一 LLM 调用接口，可切换模型 |
| 默认 LLM | OpenAI GPT-4o | 视觉能力强，PDF 图像分析 |
| 可替换 LLM | Claude 3.5 / 本地模型 | 通过 LangChain 适配器切换 |
| PDF 文本提取 | pdf-parse | 原生 PDF 文本层提取 |
| OCR | Tesseract.js | 扫描件 / 图像文字识别 |
| Agent 持久化 | LangGraph SqliteCheckpointer | 长时任务断点续传 |

### 共享包

| 包 | 内容 |
|----|------|
| `packages/shared` | 所有 TypeScript 类型定义、常量枚举、通用工具函数 |
| `packages/excel-generator` | SheetJS 底稿构建逻辑（纯函数，前后端均可调用） |

---

## 项目结构

```
icet/
├── apps/
│   ├── web/                        # 前端 React 应用
│   │   └── src/
│   │       ├── pages/              # 路由页面
│   │       │   ├── dashboard/      # 仪表盘
│   │       │   ├── scenarios/      # 业务场景管理
│   │       │   ├── regulations/    # 规章制度库
│   │       │   ├── tasks/          # 测试任务
│   │       │   │   └── TaskDetail/ # 任务详情（Plan/Samples/Execution/Paper）
│   │       │   └── papers/         # 底稿归档
│   │       ├── components/         # 共享 UI 组件
│   │       │   ├── ai-job-monitor/ # AI 进度监控组件
│   │       │   └── paper-editor/   # 底稿编辑器
│   │       ├── hooks/              # 自定义 Hooks
│   │       ├── stores/             # Zustand 状态
│   │       └── api/                # API 客户端（axios + React Query）
│   │
│   └── api/                        # 后端 Node.js API
│       ├── src/
│       │   ├── routes/             # 路由层
│       │   ├── controllers/        # 控制器层
│       │   ├── services/           # 业务逻辑层
│       │   ├── agents/             # AI Agent 实现
│       │   │   ├── regulation-parser/
│       │   │   ├── plan-generator/
│       │   │   ├── sample-parser/
│       │   │   └── test-executor/  # 核心 Agent（LangGraph）
│       │   ├── db/                 # Prisma 客户端 + Repositories
│       │   ├── queue/              # BullMQ Worker
│       │   └── websocket/          # Socket.io 服务
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   ├── shared/                     # 共享类型与工具
│   │   └── src/
│   │       ├── types/              # 全量 TypeScript 类型定义
│   │       ├── constants/          # 枚举与常量
│   │       └── utils/              # 日期、校验等工具
│   │
│   └── excel-generator/            # Excel 生成逻辑（前后端通用）
│       └── src/
│           └── builders/
│
├── docs/                           # 设计文档
│   ├── data-model.md
│   └── api-spec.md
│
├── docker-compose.yml              # 本地基础设施（PG + Redis + MinIO）
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## 环境准备

### 系统依赖

| 依赖 | 版本要求 | 检查命令 |
|------|----------|----------|
| Node.js | `>= 20 LTS` | `node -v` |
| pnpm | `>= 9.0` | `pnpm -v` |
| Docker + Docker Compose | `>= 24` | `docker -v` |
| Git | `>= 2.40` | `git --version` |

安装 pnpm（如未安装）：

```bash
npm install -g pnpm
```

### 第三方服务

| 服务 | 用途 | 获取方式 |
|------|------|----------|
| OpenAI API Key | AI Agent LLM 调用 | [platform.openai.com](https://platform.openai.com) |
| （可选）Anthropic API Key | 替代 LLM | [console.anthropic.com](https://console.anthropic.com) |

> **本地基础设施**（PostgreSQL、Redis、MinIO）均通过 Docker Compose 一键启动，无需单独安装。

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-org/icet.git
cd icet
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
# 复制模板
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

编辑 `apps/api/.env`，填写必要配置：

```dotenv
# ── 数据库 ──────────────────────────────────────────
DATABASE_URL="postgresql://icet:icet_password@localhost:5432/icet_db"

# ── Redis ────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── 文件存储（MinIO） ─────────────────────────────────
STORAGE_ENDPOINT="http://localhost:9000"
STORAGE_ACCESS_KEY="minioadmin"
STORAGE_SECRET_KEY="minioadmin"
STORAGE_BUCKET="icet-files"

# ── JWT ──────────────────────────────────────────────
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# ── AI / LLM ─────────────────────────────────────────
OPENAI_API_KEY="sk-..."
# ANTHROPIC_API_KEY="sk-ant-..."   # 可选，替代 LLM
LLM_MODEL="gpt-4o"                 # 默认模型

# ── 服务端口 ──────────────────────────────────────────
PORT=3001
```

编辑 `apps/web/.env`：

```dotenv
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_WS_URL=http://localhost:3001
```

### 4. 启动本地基础设施

```bash
# 启动 PostgreSQL + Redis + MinIO
docker compose up -d

# 验证服务状态
docker compose ps
```

```
NAME                STATUS
icet-postgres       running   0.0.0.0:5432->5432/tcp
icet-redis          running   0.0.0.0:6379->6379/tcp
icet-minio          running   0.0.0.0:9000->9000/tcp
```

### 5. 初始化数据库

```bash
# 执行数据库迁移
pnpm --filter @icet/api prisma migrate dev --name init

# 导入初始种子数据（演示用业务场景 + 测试账号）
pnpm --filter @icet/api prisma db seed
```

种子数据包含：

| 账号 | 密码 | 角色 |
|------|------|------|
| `admin@icet.local` | `Admin123!` | 管理员 |
| `tester@icet.local` | `Test123!` | 测试执行人 |
| `reviewer@icet.local` | `Review123!` | 测试审阅人 |

### 6. 启动开发服务

```bash
# 同时启动前端 + 后端（Turborepo 并行）
pnpm dev
```

| 服务 | 地址 |
|------|------|
| 前端 Web | http://localhost:5173 |
| 后端 API | http://localhost:3001 |
| API 健康检查 | http://localhost:3001/health |
| MinIO 控制台 | http://localhost:9001（账号 minioadmin / minioadmin） |

### 7. 体验完整流程

```
① 登录系统          →  使用 tester@icet.local
② 创建业务场景      →  「场景管理」→「新建场景」，填写流程层级
③ 上传规章制度      →  「规章制度库」→ 上传 PDF → 触发 AI 解析
④ 创建测试任务      →  「测试任务」→「新建任务」，选择场景和规章制度
⑤ AI 生成测试计划   →  任务详情「计划」标签 → 点击「AI 生成计划」
⑥ 上传样本材料      →  「样本」标签 → 上传 PDF 样本 → 触发 AI 解析
⑦ AI 执行测试       →  「执行」标签 → 点击「AI 全量执行」→ 观察实时进度
⑧ 复核并导出底稿    →  「底稿」标签 → 审核结果 → 点击「导出 Excel」
```

---

## 开发指南

### 常用命令

```bash
# 开发
pnpm dev                          # 启动全部应用
pnpm --filter @icet/web dev       # 仅启动前端
pnpm --filter @icet/api dev       # 仅启动后端

# 构建
pnpm build                        # 构建全部（Turbo 增量缓存）

# 类型检查
pnpm typecheck                    # 全部包类型检查

# 代码质量
pnpm lint                         # ESLint 检查
pnpm format                       # Prettier 格式化

# 测试
pnpm test                         # 运行全部测试
pnpm --filter @icet/api test      # 仅运行后端测试

# 数据库
pnpm --filter @icet/api prisma studio        # 可视化数据库浏览器
pnpm --filter @icet/api prisma migrate dev   # 创建并执行迁移
pnpm --filter @icet/api prisma generate      # 重新生成 Prisma Client

# 清理
docker compose down -v            # 停止并清理所有容器和数据卷
```

### 新增 API 端点的标准流程

```
1. packages/shared/src/types/api.ts     → 添加 Request/Response 类型
2. apps/api/src/routes/                 → 注册路由
3. apps/api/src/controllers/            → 实现控制器（参数校验 / 响应格式）
4. apps/api/src/services/               → 实现业务逻辑
5. apps/web/src/api/                    → 添加前端 API 调用函数
```

### 共享类型修改

所有类型统一维护在 `packages/shared`，修改后前后端自动同步（Turborepo 追踪依赖）：

```bash
# 修改类型后重新构建共享包
pnpm --filter @icet/shared build
```