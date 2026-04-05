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
# 1. 启动基础设施
docker compose up -d

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env

# 4. 数据库迁移
cd apps/api && pnpm prisma migrate dev

# 5. 启动开发服务
pnpm dev
```

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
