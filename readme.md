# ICET - Internal Control Evaluation Testing System

自动化内部控制评价测试系统 — 将企业合规测试流程从人工操作自动化。

## 技术栈

- **前端**: React 18 + Vite + TanStack Query + Zustand + shadcn/ui
- **后端**: Express.js + Prisma + PostgreSQL
- **AI**: LangGraph.js + LangChain.js + Qwen 2.5 VL
- **基础设施**: BullMQ + Redis + MinIO + Socket.io
- **工程化**: pnpm Monorepo + Turborepo

## 快速开始

```bash
# 1. 启动基础设施（PostgreSQL / Redis / MinIO）
docker compose up -d

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
# Prisma 在 apps/api 下执行，会加载 apps/api/.env；仅复制根目录不够
cp .env.example .env
cp .env.example apps/api/.env

# 4. 数据库迁移（首次建议指定迁移名）
pnpm --filter @icet/api exec prisma migrate dev --name init

# 5. 启动开发服务
pnpm dev
```

**说明**：Compose 将 PostgreSQL 映射到宿主机 **5433**（避免与本机已占用 **5432** 的实例冲突）；`.env.example` 中 `DATABASE_URL` 使用 **`127.0.0.1`** 而非 `localhost`，以减少 macOS 上 IPv6 带来的连接问题。排障与 Rancher Desktop 等说明见 [`docs/hand-off.md`](docs/hand-off.md)。

## 项目结构

```
icet/
├── apps/
│   ├── web/          # 前端 React 应用
│   └── api/          # 后端 Express API
├── packages/
│   ├── shared/       # 共享类型与工具
│   └── excel-generator/  # Excel 底稿生成
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```
