# ICET 环境搭建与启动指南

> 面向测试人员，按顺序执行即可。遇到问题时对照「常见问题」章节排查。

---

## 一、安装必需软件

你需要安装以下 3 个软件（已有可跳过）：

### 1. Node.js 20 LTS

下载地址：https://nodejs.org

选择 **20.x LTS** 版本（不要选 18 或 22）。

安装完成后打开终端验证：

```bash
node -v
# 应输出 v20.x.x

npm -v
# 应输出 10.x.x
```

### 2. pnpm（包管理器）

```bash
npm install -g pnpm@9
```

验证：

```bash
pnpm -v
# 应输出 9.x.x
```

### 3. Docker Desktop（容器运行环境）

- macOS：https://www.docker.com/products/docker-desktop/
- Windows：https://www.docker.com/products/docker-desktop/

安装后打开 Docker Desktop，确保状态栏图标显示 **running**（绿色）。

> 如果你使用 **Rancher Desktop**，需要在设置中启用 **Use dockerd (moby)**。

验证：

```bash
docker -v
# 应输出 Docker version 2x.x.x

docker compose version
# 应输出 Docker Compose version v2.x.x
```

---

## 二、获取项目代码

假设你已经拿到了项目代码文件夹，在终端中进入该目录：

```bash
cd /path/to/icet
```

---

## 三、启动基础设施（数据库、缓存、文件存储）

项目依赖 3 个基础服务，全部通过 Docker 一键启动：

```bash
docker compose up -d
```

这条命令会启动：
- **PostgreSQL 16**（数据库）— 端口 5433
- **Redis 7**（缓存）— 端口 6379
- **MinIO**（文件存储）— 端口 9000（API）+ 9001（管理控制台）

验证服务是否正常：

```bash
docker compose ps
```

三个服务的 STATUS 都应该是 `running`（或 `Up`）。

> **MinIO 管理控制台**：浏览器打开 http://localhost:9001 ，账号密码都是 `minioadmin`。

---

## 四、配置环境变量

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

这会创建两个 `.env` 文件。**默认配置已经可以正常使用，不需要修改任何内容。**

如果你好奇各配置项的含义：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `DATABASE_URL` | `postgresql://icet:icet123@127.0.0.1:5433/icet` | 数据库连接 |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis 连接 |
| `S3_ENDPOINT` | `http://127.0.0.1:9000` | MinIO 文件存储 |
| `JWT_SECRET` | `your-jwt-secret-change-in-production` | 登录令牌密钥（仅开发用） |

---

## 五、安装项目依赖

```bash
pnpm install
```

等待安装完成（首次约 1-3 分钟，取决于网络）。

> 如果下载速度慢，可以配置公司内部镜像源，参考项目根目录 `.npmrc` 文件。

---

## 六、初始化数据库

### 6.1 执行数据库迁移

```bash
pnpm --filter @icet/api db:migrate
```

这会创建所有数据表。看到 `✔ Generate Prisma Client` 表示成功。

### 6.2 导入测试账号

```bash
pnpm --filter @icet/api db:seed
```

成功后会输出：

```
🌱 开始数据库初始化...
✅ 组织已创建: 默认组织
✅ 管理员已创建: admin@icet.dev (密码: admin123)
✅ 测试用户已创建: tester@icet.dev (密码: tester123)
✅ 审阅人已创建: reviewer@icet.dev (密码: reviewer123)
🎉 数据库初始化完成！
```

**请记下这 3 个测试账号，后面登录要用。**

---

## 七、启动项目

### 方式一：同时启动后端和前端（推荐）

```bash
pnpm dev
```

这会同时启动：
- 后端 API：http://localhost:3000
- 前端页面：http://localhost:5173

### 方式二：分别启动

终端 1（后端）：

```bash
pnpm --filter @icet/api dev
```

终端 2（前端）：

```bash
pnpm --filter @icet/web dev
```

---

## 八、开始使用

浏览器打开 **http://localhost:5173** ，使用测试账号登录：

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | `admin@icet.dev` | `admin123` |
| 测试执行人 | `tester@icet.dev` | `tester123` |
| 审阅人 | `reviewer@icet.dev` | `reviewer123` |

### 基本操作流程

1. **登录** → 用上述任一账号登录
2. **创建业务场景** → 侧边栏「业务场景」→ 填写名称和流程层级
3. **上传规章制度** → 侧边栏「规章制度」→ 上传 PDF 文件
4. **创建测试任务** → 侧边栏「测试任务」→ 新建任务 → 选择场景
5. **填写测试计划** → 进入任务详情 →「测试计划」Tab → 添加测试步骤
6. **上传样本材料** →「样本与执行」Tab → 上传 PDF
7. **填写执行结果** → 在矩阵中选择 ✓（通过）/ ×（不通过）/ N/A（不适用）
8. **生成工作底稿** →「工作底稿」Tab → 生成 → 导出 Excel

---

## 九、停止项目

- 停止后端和前端：在运行 `pnpm dev` 的终端按 `Ctrl + C`
- 停止基础设施：`docker compose down`（数据不会丢失）
- 彻底清除数据：`docker compose down -v`（⚠️ 数据库数据会被删除）

---

## 十、常见问题

### Q: `docker compose up -d` 报错 "Cannot connect to the Docker daemon"

Docker Desktop 没有启动。打开 Docker Desktop 应用，等待状态变为 running 后重试。

### Q: `pnpm install` 报错 `ERR_PNPM_ENOENT` 或 `copyfile` 失败

项目已配置 `.npmrc` 解决此问题。如果仍然报错，尝试：

```bash
# 清理后重装
rm -rf node_modules
pnpm install
```

### Q: `db:migrate` 报错 `P1001: Can't reach database server`

1. 确认 Docker 容器在运行：`docker compose ps`
2. 确认 `.env` 中 `DATABASE_URL` 用的是 `127.0.0.1` 而不是 `localhost`
3. 确认端口 5433 没有被其他程序占用

### Q: `db:migrate` 报错 `P1010: User was denied access`

本机可能运行了其他 PostgreSQL 实例占用了 5432 端口。本项目使用 5433 端口，确认 `.env` 中配置正确。

### Q: 前端页面打开后空白或报网络错误

1. 确认后端在运行（终端没有报错，显示 `Server running on port 3000`）
2. 确认前端在运行（终端显示 `Local: http://localhost:5173`）
3. 打开浏览器开发者工具（F12）→ Console 查看具体错误

### Q: 登录后提示 401 或 "未授权"

重新执行数据库初始化：

```bash
pnpm --filter @icet/api db:migrate
pnpm --filter @icet/api db:seed
```

### Q: 上传文件失败

确认 MinIO 在运行：`docker compose ps`，确认 `icet-minio` 状态为 running。

---

## 十一、端口一览

| 服务 | 端口 | 用途 |
|------|------|------|
| 前端 | 5173 | 浏览器访问页面 |
| 后端 API | 3000 | API 接口 |
| PostgreSQL | 5433 | 数据库（宿主机端口） |
| Redis | 6379 | 缓存 |
| MinIO API | 9000 | 文件上传/下载 |
| MinIO Console | 9001 | 文件管理界面（浏览器） |
