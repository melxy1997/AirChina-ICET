# ICET 系统 — 项目背景、目标与上下文交接文档

---

## 一、业务背景

### 1.1 什么是内部控制评价测试

企业每年需要对内部业务流程进行**内部控制评价测试**（Internal Control Evaluation Testing）。这是一项法规要求的合规工作，目的是验证公司各业务流程中的"控制机制"是否真实有效地在执行。

**举例**：以"餐食采购"业务场景为例：

> 规定：采购预算每年由客舱服务部助理拟定，经客舱服务部总经理审批签字后，递交规划财务部逐级上报执行。
> 
> 测试目标：验证"总经理审批签字"这一控制点在实际业务中是否真实执行了。

### 1.2 现实世界的人工测试流程

```
第一步：准备阶段
  测试人员拿到一份规章制度PDF
  → 人工阅读全文，识别其中的"控制点"（如C1、C2...）
  → 理解每个控制点描述的业务逻辑和审批链

第二步：设计阶段
  根据控制点，人工设计"测试步骤"
  例如针对C1设计：
    步骤1：查看年度预算编制是否依据当年机供品成本水平制定
    步骤2：查看预算编制是否经总经理审批签字后报规划财务部

第三步：执行阶段
  收集本期实际业务的样本材料（PDF文件）
  例如：2025年机供品采购计划.pdf
  对每份样本，逐步骤人工检查：
    步骤1 → ✓（有，符合）
    步骤2 → ✓（有签字）
    步骤3 → N/A（不适用本样本）

第四步：记录阶段
  将所有结果填入标准格式Excel表格（称为"工作底稿"）
  底稿包含：测试信息、控制点描述、测试步骤、
            每个样本的每个步骤结果、异常说明
  提交给审阅人复核，通过后归档
```

### 1.3 当前痛点

| 痛点 | 具体表现 |
|------|----------|
| **重复劳动** | 每期测试都要重新阅读同一份规章制度，步骤设计高度相似 |
| **效率低下** | 一份底稿人工处理需要数小时到数天 |
| **人为差异** | 不同测试人员对同一控制点理解不同，步骤设计质量参差不齐 |
| **材料繁杂** | 样本材料是PDF文件，手工翻阅查找签名、日期、金额费时费力 |
| **格式维护** | Excel模板格式复杂（合并单元格、多级表头），手工填写容易出错 |
| **追溯困难** | 测试依据、证据分散，不成体系 |

---

## 二、系统定位

**ICET（Internal Control Evaluation Testing System）** 是一套将上述全流程自动化的全栈智能系统。

```
传统流程（全人工）              →    ICET自动化流程
─────────────────────────────────────────────────────
人工阅读规章制度PDF              →    AI解析PDF，自动提取控制点
人工设计测试步骤                 →    AI生成测试计划，人工审核确认
人工逐份查阅样本PDF              →    AI解析样本，结构化识别签名/日期/金额
人工逐步骤核查每份材料           →    AI Agent自动执行，附带证据和置信度
人工填写Excel工作底稿            →    系统自动生成底稿，一键导出
```

**核心价值主张**：AI承担高重复性的"查文件、找证据、做判断"工作，人工聚焦在"审核AI结果、处理异常、最终确认"。

---

## 三、核心概念词汇表

理解这套系统必须先掌握以下概念，它们贯穿整个代码库和业务逻辑：

### 业务场景（Business Scenario）
一个具体的业务领域，对应公司的流程层级体系。
- 例：`一级流程=采购与资产管理` / `二级流程=餐食、机上供应品`
- 一个场景可以绑定多份规章制度
- 一个场景可以进行多次测试任务（不同年度、不同期间）

### 规章制度（Regulation）
上传的PDF文档，是测试的"依据"来源。
- 内容特征：用自然语言描述业务流程，其中嵌入了多个控制点（C1、C2...）
- AI任务：从PDF中提取所有控制点，结构化存储

### 控制点（Control Point）
从规章制度中提取的单个控制机制，是测试的最小单元。
- 有编号（C1/C2/C9...）
- 描述：何人、何时、做何事、如何审批
- AI会为每个控制点建议测试思路

### 测试任务（Test Task）
一次完整的内部控制评价测试的执行单元，最终产出一份工作底稿。
- 绑定：业务场景 + 规章制度 + 执行人 + 审阅人
- 有完整的状态机生命周期（见下文）
- 每个任务创建时自动初始化一个空的样本集（SampleSet）

### 测试计划（Test Plan）
由AI基于控制点生成，人工审核后执行的结构化测试方案。
- 包含：控制点描述（富文本）+ 测试步骤列表
- 每个步骤有执行配置（告诉AI如何检查）

### 测试步骤（Test Step）
可以对一份具体文件执行的单个检查动作。
- 例："查看是否有总经理审批签字"
- 有 `checkType`（签名检查、内容检查、日期检查等）
- 有执行配置（需要哪些签名人、什么关键词等）

### 样本（Sample）
一份具体的测试材料，对应现实中的一个业务单据。
- 例：`2025年机供品采购计划.pdf`
- 可以关联多个PDF文件（一个样本可能有主单+附件）
- AI会先解析样本，提取签名、日期、金额等结构化信息

### 步骤执行记录（Step Execution）
某个样本在某个测试步骤上的执行结果，是数据库中的核心记录。
- 结果值：`✓`（通过）/ `×`（不通过）/ `N/A`（不适用）/ `PENDING`（待执行）
- 可以是AI执行（附带置信度、证据）或人工执行
- 人工可以覆盖AI结果（`humanOverride=true`）
- 对应Excel底稿中的每一个"格子"（样本行×步骤列的交叉单元格）

### 异常记录（Anomaly Record）
当步骤执行结果为`×`时自动创建，对应Excel底稿第8节。
- 包含：缺陷序号、情况说明、步骤号、样本序号、支持性文档
- 需要人工填写情况说明和支持文档

### 工作底稿（Working Paper）
最终产物，汇总所有测试数据，生成标准格式Excel文件。
- **快照设计**：归档时将完整数据JSON快照存储，归档后永久不变（不依赖源数据）
- Excel格式严格，含合并单元格、多级表头、颜色样式、图例说明

---

## 四、任务状态机（完整生命周期）

```
DRAFT           ← 初始状态，刚创建
  ↓ 触发AI生成计划
PLANNING        ← AI正在解析规章制度、生成测试计划
  ↓ AI完成，等待人工确认
PLAN_REVIEW     ← 人工审核测试步骤（可修改）
  ↓ 审核通过
EXECUTING       ← AI/人工正在逐样本执行测试
  ↓ 执行完成，等待人工复核
EXEC_REVIEW     ← 人工复核AI执行结果（可覆盖）
  ↓ 确认结果
PAPER_DRAFT     ← 底稿草稿，可编辑工作底稿
  ↓ 提交审阅
PAPER_REVIEW    ← 审阅人审阅底稿
  ↓ 批准
ARCHIVED        ← 归档完成，最终状态

可从任何状态 → CANCELLED（取消）
```

---

## 五、AI Agent体系

这是系统的核心能力，也是最复杂的部分。系统有四个Agent：

### Agent 1：RegulationParserAgent
- **输入**：规章制度PDF（Buffer）
- **处理**：分批读取页面文本 → LLM提取控制点 → 去重合并
- **输出**：`ControlPoint[]` 写入数据库
- **触发**：用户上传规章制度后点击"触发解析"
- **模式**：顺序处理（不是图结构），直接LLM调用

### Agent 2：PlanGeneratorAgent
- **输入**：任务关联的所有规章制度的控制点列表
- **处理**：LLM整合控制点 → 生成控制点描述文本 + 测试步骤列表 + 每步骤执行配置
- **输出**：`TestPlan` + `TestStep[]` 写入数据库，状态置为PENDING等待人工审核
- **触发**：用户在测试计划页面点击"AI生成计划"
- **注意**：生成后必须人工审核通过才能进入执行阶段

### Agent 3：SampleParserAgent
- **输入**：样本材料PDF（可多个文件）
- **处理**：PDF文本提取 → OCR（扫描件fallback）→ LLM结构化提取
- **输出**：`SampleParsedContent`（签名列表、日期列表、金额列表、文档摘要）存入`sample.parsedContent`
- **触发**：用户上传样本后点击"解析"
- **重要**：这个结果是TestExecutorAgent的输入，必须先完成

### Agent 4：TestExecutorAgent（核心，最复杂）
- **输入**：一个`TestStep` + 一个`Sample`（含已解析的`parsedContent`）
- **处理**：LangGraph状态图，三个节点循环
  - `plan_node`：理解步骤要求，制定3-5个检查子任务
  - `execute_node`：调用工具执行一个检查子任务（循环直到计划执行完）
  - `judge_node`：综合所有工具调用结果，做最终判断
- **工具集**：`search_text`（文本搜索）、`check_signature`（签名检查）、`extract_field`（字段提取）、`compare_values`（值比较）、`check_completeness`（完整性检查）
- **输出**：`StepExecution`（结果`✓/×/N/A` + 推理过程 + 证据列表 + 置信度）
- **批量执行**：`batch-executor.ts` 用p-limit并发执行所有`样本×步骤`组合（concurrency=3）
- **断点续传**：LangGraph SqliteCheckpointer，进程中断后可从断点继续
- **触发**：用户点击"AI全量执行"，或针对单个样本执行

---

## 六、数据模型核心关系

```
Organization (组织)
  └── User[] (用户：ADMIN/TESTER/REVIEWER)
  └── BusinessScenario[] (业务场景)
        └── [M:N] Regulation[] (规章制度)
              └── ControlPoint[] (控制点，AI提取)
        └── TestTask[] (测试任务)
              ├── TestPlan (测试计划)
              │     └── TestStep[] (测试步骤)
              ├── SampleSet (样本集)
              │     └── Sample[] (样本)
              │           ├── FileReference[] (关联PDF文件)
              │           ├── parsedContent (AI解析结果JSON)
              │           └── StepExecution[] (步骤执行结果)
              │                 └── AnomalyRecord? (异常记录，×时自动创建)
              └── WorkingPaper (工作底稿，归档快照)
```

**关键设计决策**：
- `StepExecution` 有唯一约束 `UNIQUE(sampleId, stepId)`，每个格子只有一个最终结果
- `WorkingPaper.snapshotData` 是完整JSON快照，归档后与源数据解耦，历史永久不变
- 样本数量不存储，始终通过 `samples.length` 动态计算

---

## 七、技术栈总览

```
Monorepo：pnpm workspaces + Turborepo
语言：TypeScript 全栈

前端（apps/web）：
  React 18 + Vite + React Router v6
  TanStack Query（服务端状态）+ Zustand（客户端状态）
  shadcn/ui + Tailwind CSS
  Socket.io-client（AI进度实时推送）
  SheetJS/xlsx（前端Excel导出，已有完整实现）

后端（apps/api）：
  Express.js + TypeScript
  Prisma ORM → PostgreSQL
  BullMQ + Redis（AI任务异步队列）
  Socket.io（WebSocket进度广播）
  Multer + MinIO（文件上传与对象存储）
  JWT（httpOnly Cookie认证）
  Zod（运行时参数校验）

AI层（apps/api/src/agents）：
  LangGraph.js（Agent状态图，断点续传）
  LangChain.js（LLM统一接口，可切换模型）
  Qwen 3.5 VL（默认LLM，视觉能力处理PDF图像）
  pdf-parse + Tesseract.js（PDF文本提取+OCR）

共享包（packages）：
  @icet/shared：所有TypeScript类型定义、枚举、工具函数
  @icet/excel-generator：SheetJS底稿构建逻辑（纯函数，前后端通用）
```

---

## 八、已完成的工作

### 已完整实现并验证（原型阶段）
1. **Excel底稿生成**：完整的单HTML文件原型，包含：
   - 数据收集表单（动态步骤、样本矩阵、差异记录）
   - SheetJS生成标准格式Excel（合并单元格、颜色样式、图例行）
   - 样本数量自动关联计算（`samples.length`动态绑定）
   - 默认值填充，便于调试

2. **数据模型**：完整TypeScript类型定义（`system-design.md`）

3. **设计文档**：
   - 数据建模文档（含完整ER图、Prisma Schema设计）
   - 系统架构设计文档
   - 详细开发计划（逐任务拆解到函数级别）
   - README.md

### ✅ Phase 0：Monorepo 脚手架（已完成）

> 完成时间：2026-04-06
> 分支：`feature/solo`
> 提交数：7 个逻辑提交

#### 完成内容

| 模块 | 提交信息 | 说明 |
|------|----------|------|
| Monorepo 根配置 | `chore: init monorepo with pnpm + turbo` | pnpm workspaces + Turborepo + tsconfig.base.json + .gitignore + .env.example |
| packages/shared | `feat(shared): add types, constants and utilities` | 全部 TypeScript 类型定义（base/entities/api/ai 四个文件）、常量（状态机转换规则）、工具函数（日期/验证） |
| packages/excel-generator | `feat(excel-generator): add Excel generation package` | SheetJS 底稿构建：工作底稿主表 + 差异记录表 + 图例说明表 |
| apps/api | `feat(api): init Express server with Prisma schema` | Express 应用框架 + 完整 Prisma Schema（15 个模型） + 6 组路由（tasks/samples/regulations/papers/files/ai） + 3 个中间件（error/auth/upload） + WebSocket 服务 + Prisma 客户端单例 |
| apps/web | `feat(web): init React app with routing and layout` | React 18 + Vite + React Router v7 + Tailwind CSS + 侧边栏布局 + 6 个路由占位 |
| Docker Compose | `chore: add Docker Compose for local infrastructure` | PostgreSQL 16 + Redis 7 + MinIO（含 Console 端口 9001） |
| 构建修复 | `fix: resolve build issues` | tsconfig composite、zod 版本降级、WebSocket null check |

#### 实现细节

**packages/shared**（共享类型包）：
- `src/types/base.ts` — 基础类型：ID、Timestamp、TaskStatus、StepResultValue、AIJobStatus 等 10 个类型
- `src/types/entities.ts` — 全部 11 个章节的实体接口：Organization → User → BusinessScenario → Regulation → ControlPoint → FileReference → TestTask → TestPlan → TestStep → SampleSet → Sample → StepExecution → AnomalyRecord → WorkingPaper → AIJob
- `src/types/api.ts` — API 请求/响应类型：PaginatedRequest/Response、CreateTaskRequest、AddSampleRequest 等
- `src/types/ai.ts` — AI Agent 相关类型：ExecutorState、Observation
- `src/constants/index.ts` — 常量：任务状态中文标签、状态转换规则矩阵、AI 并发数、系统用户 ID
- `src/utils/date.ts` — 日期工具：now()、formatDate()、formatDateCN()
- `src/utils/validators.ts` — 验证工具：isTransitionAllowed()、isValidStepResult()、isValidUUID()

**packages/excel-generator**（Excel 生成包）：
- `src/index.ts` — 纯函数 `buildWorkbook(data: WorkingPaper): ArrayBuffer`
- 生成 3 个 Sheet：工作底稿主表（含合并单元格标题行）、差异记录表、图例说明表
- 列宽自适应配置

**apps/api**（后端 API）：
- `prisma/schema.prisma` — 完整数据模型，15 个 Prisma Model，包含所有关系（1:N、M:N）、唯一约束、级联删除
- `src/app.ts` — Express 应用工厂函数，配置 helmet/cors/morgan/json 解析
- `src/middleware/error.middleware.ts` — AppError 类 + asyncHandler 包装器 + 统一错误处理
- `src/middleware/auth.middleware.ts` — requireAuth / requireAdmin（开发模式跳过认证）
- `src/middleware/upload.middleware.ts` — multer 内存/磁盘双模式，100MB 限制，文件类型白名单
- `src/routes/` — 6 组路由文件，所有端点已挂载，返回 TODO 占位响应
- `src/websocket/server.ts` — Socket.IO 服务，支持任务房间加入/离开，broadcast() 广播函数
- `src/db/prisma.ts` — Prisma 客户端单例，开发模式打印 query 日志

**apps/web**（前端 React）：
- Vite 配置：路径别名 `@/`、API 代理 `/api` → `localhost:3000`、WS 代理
- Tailwind CSS + PostCSS 配置
- Layout 组件：深色侧边栏 + NavLink 高亮 + Outlet 主内容区
- 6 个路由占位：Dashboard、业务场景、规章制度、测试任务、任务详情、底稿归档

**Docker Compose**：
- PostgreSQL 16 Alpine（**宿主机端口 5433** 映射到容器内 5432，用户/库 `icet` / 密码见 `.env.example`；见下文「端口冲突」）
- Redis 7 Alpine（端口 6379）
- MinIO latest（API 端口 9000，Console 端口 9001，用户 minioadmin/minioadmin）
- 命名卷持久化：pgdata、redisdata、miniodata

#### 遇到的问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `pnpm install` 报 `ERR_PNPM_ENOENT: copyfile` | 在部分 VM、网络盘或受限文件系统上，pnpm 默认的 symlink / hardlink / reflink 与包内大量小文件的解压拷贝组合易失败；报错栈里的包名（如 `fast-check`、`engine.io-parser`）多为**连带失败**，不宜当作根因 | 在仓库根目录 `.npmrc` 中设置 `node-linker=hoisted` 与 `package-import-method=copy`（见文件内注释） |
| `tsc` 报 `Referenced project must have setting "composite": true` | 使用 TypeScript **工程引用**（`references`）时，被引用工程必须 `composite: true`，才能产出可供下游引用的构建信息与声明 | 在 `packages/shared/tsconfig.json` 的 `compilerOptions` 中设置 `"composite": true`，并保持 `outDir` / `rootDir` 与引用链一致 |
| `tsc` 报 `'io' is possibly 'null'` | 模块级 `io` 可为 `null`，对可空变量赋值后，控制流分析未必将后续使用收窄为非 null | 在 `initWebSocket` 内使用局部变量 `const socketServer = new Server(...)`，对 `socketServer.on(...)` 注册事件，再赋给 `io`，避免非空断言 `!` |
| 误以为需「降级 zod」才能装上依赖 | zod 新版本可能声明对 `fast-check` 等 peer；若安装仍因**同一类**文件系统问题在解压这些包时失败，易被误判为版本问题 | **优先**确认 `.npmrc` 已生效并重装；`^3.23` 与 `^3.24` 都会解析到当前 3.x，**不必**为规避 peer 刻意锁死旧版；仍失败时再查权限、杀毒或同步软件对 `node_modules` 的占用 |
| `prisma migrate dev` 报 `P1012`：`Environment variable not found: DATABASE_URL` | Prisma 在 `apps/api` 下执行，只自动加载**含 `prisma/` 目录的包根目录**下的 `.env`；仅复制根目录 `.env.example` 为根目录 `.env` 时，若未同步 `apps/api/.env`，迁移脚本读不到变量 | 将 `.env.example` 复制为 **`apps/api/.env`**（并保留根目录 `.env` 供其他工具使用）；`DATABASE_URL` 等需与 `docker-compose` 中 Postgres 一致 |
| Docker 无法使用 / `Cannot connect to the Docker daemon` | 本机未启动容器运行时或未暴露 Docker socket | 使用 **Rancher Desktop** 时，在设置中启用 **Use dockerd (moby)**，并确保应用处于运行状态后再执行 `docker compose` |
| `prisma` 报 `P1001: Can't reach database server at localhost:5432`（容器已启动） | 在 macOS 上，`localhost` 常解析为 **IPv6（`::1`）**，而 Docker 端口映射多落在 **IPv4（`127.0.0.1`）**；客户端连 `::1` 时可能无服务监听 | 连接串中使用 **`127.0.0.1`** 代替 `localhost`（`.env.example` 已按此写法） |
| `prisma` / `schema-engine` 报 `P1010: User was denied access on the database (not available)`（`psql` 进容器、或换工具却正常） | **宿主机 5432 上已有其他 PostgreSQL 或 SSH 端口转发**，与 Compose 映射竞争；Prisma 连 `127.0.0.1:5432` 时实际连到**本机**实例，而非容器内的 `icet` 库，Prisma 将底层错误映射为 P1010，故提示中的库名可能显示为 `(not available)` | **推荐**：将 Compose 中 Postgres 的宿主机端口改为 **5433**（`"5433:5432"`），`DATABASE_URL` 使用 `127.0.0.1:5433`（见当前 `docker-compose.yml` 与 `.env.example`）。**备选**：停掉本机 `postgres` 服务及占用 5432 的 SSH 隧道，再改回 `5432:5432` |
| `pnpm --filter @icet/api db:migrate` 后出现 `prisma migrate dev "#" "生成" ...` 等奇怪参数 | 终端中命令与中文注释在同一行粘贴时，若换行/注释被截断，`shell` 可能把注释内容当作额外参数传给 `pnpm`，进而传给 `prisma` | 迁移命令单独一行执行，例如：`pnpm --filter @icet/api exec prisma migrate dev --name init`；需要迁移名时用 Prisma 的 `--name`，勿与行尾 `#` 注释粘在一起 |

##### 本地数据库与 Prisma：排查要点（调研摘要）

1. **确认实际连的是哪台 Postgres**：在宿主机执行 `lsof -nP -iTCP:5432 -sTCP:LISTEN`（或 `5433`），若存在本机 `postgres` 进程或 `ssh` 监听 `*:5432`，则 `127.0.0.1:5432` 未必指向容器。
2. **验证 Prisma 引擎能否连通**：在 `node_modules/@prisma/engines/` 下找到本机对应的 `schema-engine-*` 可执行文件，执行 `cli --datasource '<DATABASE_URL>' can-connect-to-database`（退出码 0 表示连接串可用）；或直接运行 `pnpm exec prisma db execute --stdin --url='...' <<< 'SELECT 1'` 做等价验证。
3. **容器内数据库正常 ≠ 宿主机 Prisma 正常**：`docker exec icet-postgres psql ...` 仅证明容器内实例可用；若宿主机端口被占用，Prisma 仍可能连错库。

#### 当前项目结构

```
icet/
├── apps/
│   ├── api/                          # 后端 Express API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env                      # 本地配置（Prisma CLI 加载；由 .env.example 复制）
│   │   ├── prisma/
│   │   │   └── schema.prisma         # 15 个模型
│   │   └── src/
│   │       ├── main.ts               # 入口
│   │       ├── app.ts                # 应用工厂
│   │       ├── db/prisma.ts          # Prisma 客户端
│   │       ├── middleware/            # error / auth / upload
│   │       ├── routes/               # 6 组路由（TODO 占位）
│   │       └── websocket/server.ts   # Socket.IO
│   └── web/                          # 前端 React 应用
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── src/
│           ├── main.tsx
│           ├── App.tsx               # 路由配置
│           └── components/layout/Layout.tsx  # 侧边栏布局
├── packages/
│   ├── shared/                       # 共享类型与工具
│   │   └── src/
│   │       ├── types/                # base / entities / api / ai
│   │       ├── constants/            # 状态机规则、系统配置
│   │       └── utils/                # date / validators
│   └── excel-generator/              # Excel 底稿生成
│       └── src/index.ts              # buildWorkbook()
├── docker-compose.yml                # PG + Redis + MinIO
├── turbo.json                        # Turborepo 配置
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .npmrc                            # node-linker=hoisted
├── .env.example                      # 模板；复制为根 .env 与 apps/api/.env
└── readme.md
```

#### 构建验证结果

| 包 | tsc | vite build | 状态 |
|----|-----|------------|------|
| @icet/shared | ✅ | — | 通过 |
| @icet/excel-generator | ✅ | — | 通过 |
| @icet/api | ✅ | — | 通过 |
| @icet/web | ✅ | ✅ (182KB gzip:60KB) | 通过 |

### ✅ Phase 1：核心 CRUD（已完成）

> 完成时间：2026-04-06
> 分支：`feature/solo`
> 新增提交：3 个

#### 完成内容

| Commit | 说明 |
|--------|------|
| `feat(api): add JWT authentication with register, login and seed data` | JWT 认证完整实现 + 数据库种子脚本 |
| `feat(api): add CRUD services and routes for scenarios, tasks, samples, regulations, papers` | 6 个 Service + 7 组路由全部接入真实逻辑 |
| `feat(web): add login, scenario, task, regulation pages with auth and API client` | 前端登录 + 4 个业务页面 + API 客户端 + 认证上下文 |

#### 实现细节

**后端 — JWT 认证模块**：
- `src/services/auth.service.ts` — register()、login()、me()、verifyToken()，bcrypt 加密密码，jsonwebtoken 签发 JWT
- `src/routes/auth.routes.ts` — POST /auth/register、POST /auth/login、GET /auth/me，Zod 校验请求体
- `src/middleware/auth.middleware.ts` — requireAuth 从 Bearer token 提取并验证 JWT，requireAdmin 检查角色
- `prisma/seed.ts` — 创建默认组织 + 3 个测试账号（admin/tester/reviewer）

**后端 — 6 个 CRUD Service**：
- `scenario.service.ts` — 业务场景列表/详情/创建/更新/软删除 + 规章制度关联/取消关联
- `regulation.service.ts` — 规章制度列表/详情/创建（同步生成 FileReference）/删除，MIME 类型自动映射
- `task.service.ts` — 测试任务列表（支持状态/执行人筛选）/详情（含全部子资源 eager load）/创建（事务内关联规章制度）/更新/状态转换（校验状态机规则）
- `sample.service.ts` — 样本集自动创建（getOrCreate）/列表/添加（支持关联文件）/更新/删除
- `execution.service.ts` — 步骤执行结果 upsert（校验结果值合法性）/批量更新
- `paper.service.ts` — 工作底稿生成（从任务数据构建 WorkingPaper 快照）/Excel 导出（调用 @icet/excel-generator）/提交/审批

**后端 — 7 组路由**：
- `/auth/*` — 公开路由，不需要认证
- `/scenarios/*` — 业务场景 CRUD + 规章制度关联管理
- `/tasks/*` — 测试任务 CRUD + 状态流转 PATCH
- `/tasks/:id/samples/*` — 样本管理 + 步骤结果更新 + 批量执行
- `/tasks/:id/paper/*` — 底稿生成/查询/导出/提交/审批
- `/regulations/*` — 规章制度上传（multer）+ 列表/详情/删除
- `/files/*`、`/ai-jobs/*` — 保留占位，Phase 2 实现

**前端 — 基础设施**：
- `src/lib/api.ts` — 封装 fetch 的 API 客户端，自动附加 JWT token，支持 JSON/文件上传/文件下载
- `src/lib/auth.tsx` — AuthProvider + useAuth hook，token 持久化到 localStorage，启动时自动校验 /auth/me

**前端 — 5 个页面**：
- `LoginPage` — 邮箱+密码登录表单，预填测试账号
- `ScenarioListPage` — 业务场景列表 + 内联新建表单，点击行跳转详情
- `TaskListPage` — 测试任务列表，状态筛选标签（使用 @icet/shared 的 TASK_STATUS_LABELS），异常数量高亮
- `TaskDetailPage` — 三 Tab 页面（基本信息/样本与执行/工作底稿），状态流转按钮（使用 ALLOWED_TRANSITIONS），样本执行矩阵子组件（下拉选择 ✓/×/N/A/PENDING），底稿生成与 Excel 导出
- `RegulationListPage` — 规章制度列表 + PDF 上传，解析状态展示

**前端 — 路由与布局**：
- App.tsx 集成 AuthProvider，公开路由 /login，受保护路由自动跳转登录页
- Layout 侧边栏底部显示用户名/角色/退出登录按钮

#### 遇到的问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| pnpm 在 SOLO 沙箱中反复 copyfile 失败 | 沙箱文件系统不支持 reflink/hardlink，且网络层间歇性超时导致重装加剧问题 | `.npmrc` 配置 `node-linker=hoisted` + `package-import-method=copy`；**教训：不要无脑 rm -rf node_modules，应诊断后精准修复** |
| rollup 缺少 linux-arm64-gnu native module | pnpm hoisted 模式下 optional dependencies 平台检测异常 | 根 package.json 添加 `pnpm.supportedArchitectures` 配置 |
| 新增 bcryptjs/jsonwebtoken 后需重新 pnpm install | Phase 1 新增了 4 个运行时/类型依赖 | **约定：依赖安装命令告诉用户执行，不在沙箱中自行操作** |

### ✅ Phase 1 补丁（已完成）

> 完成时间：2026-04-06
> 分支：`feature/solo`
> 新增提交：5 个
> 前置条件：需执行 `pnpm install` 安装新增依赖后验证

#### 完成内容

| Commit | 说明 |
|--------|------|
| `feat(api): integrate MinIO S3 file storage for upload/download` | file.service.ts + files 路由真实实现 + regulations 路由接入 S3 |
| `feat(web): migrate from useEffect+fetch to TanStack Query` | @tanstack/react-query + hooks.ts 集中管理 query keys |
| `feat(web): add Toast notifications, ConfirmDialog, and global error handling` | ToastProvider + useConfirm + QueryErrorHandler |
| `feat(web): add task creation page with scenario selector and sampling config` | TaskNewPage + /tasks/new 路由 |
| `feat(api): add rate limiting and pagination parameter validation` | 内存级 rate limiter + 分页参数 clamp |

#### 实现细节

**后端 — MinIO/S3 文件存储**：
- `src/services/file.service.ts` — S3Client 单例、ensureBucket() 启动时创建桶、uploadFile() 上传到 S3 + 创建 FileReference 记录、getDownloadUrl() 预签名 URL（1小时有效）、getFileStream() 直接下载流、deleteFile() 删除文件+记录
- `src/routes/files.routes.ts` — POST /files/upload（multer memory → S3）、GET /files/:id（返回预签名 URL）、GET /files/:id/download（流式下载）、DELETE /files/:id
- `src/routes/regulations.routes.ts` — 上传时先调用 fileService.uploadFile()，再创建 Regulation 记录
- `src/services/regulation.service.ts` — createRegulation() 改为接受外部 fileRefId，不再内部创建 FileReference
- `src/main.ts` — 启动时调用 ensureBucket()

**后端 — Rate Limiting + 分页校验**：
- `src/app.ts` — 内存级 rate limiter（100 req/min per user），响应头 X-RateLimit-Limit / X-RateLimit-Remaining；分页参数校验：page >= 1, pageSize 1-100

**前端 — TanStack Query 迁移**：
- `src/lib/hooks.ts` — 集中定义 queryKeys + 14 个 hooks（useScenarios/useCreateScenario/useTasks/useTransitionStatus/useSamples/useUpdateStepResult 等），所有 mutation onSuccess 自动 invalidateQueries
- `src/main.tsx` — QueryClientProvider 包裹，staleTime 30s, retry 1, refetchOnWindowFocus false
- 4 个页面全部从 useEffect+fetch 迁移到 hooks

**前端 — UI 组件**：
- `src/components/ui/toast.tsx` — ToastProvider + useToast，4 种样式（default/success/error/warning），4 秒自动消失
- `src/components/ui/confirm-dialog.tsx` — ConfirmDialog + useConfirm hook（promise-based，支持 await）
- `src/lib/query-error-handler.tsx` — TanStack Query 全局 mutation 错误处理器
- `src/pages/TaskNewPage.tsx` — 底稿编号 + 测试单位 + 业务场景下拉选择 + 抽样方法/期间/来源

#### 新增依赖

| 包 | 版本 | 位置 |
|----|------|------|
| @aws-sdk/client-s3 | ^3.700.0 | apps/api |
| @aws-sdk/s3-request-presigner | ^3.700.0 | apps/api |
| @tanstack/react-query | ^5.62.0 | apps/web |

#### 当前弱点与改进记录

> 以下问题在 Phase 1 补丁中已修复

| 弱点 | 状态 | 修复方式 |
|------|------|----------|
| **orgId 硬编码为 'TODO'** | ✅ 已修复 | auth middleware 查 User.organizationId 挂载 req.orgId，所有路由统一使用 |
| **MinIO 文件上传未实现** | ✅ 已修复 | 集成 @aws-sdk/client-s3，file.service.ts 封装 upload/download/delete，regulations 路由接入真实上传 |
| **前端无全局错误处理** | ✅ 已修复 | Toast 组件 + QueryErrorHandler 自动展示 mutation 错误 |
| **前端无 TanStack Query** | ✅ 已修复 | 迁移全部页面到 @tanstack/react-query，集中 query keys + hooks |
| **无新建任务页面** | ✅ 已修复 | TaskNewPage：底稿编号 + 测试单位 + 场景选择 + 抽样配置 |
| **API 无分页参数校验** | ✅ 已修复 | app.ts 中间件 clamp page>=1, pageSize 1-100 |
| **无请求速率限制** | ✅ 已修复 | 内存级 rate limiter 100 req/min，响应头 X-RateLimit-* |

> 以下问题尚未修复

| 弱点 | 说明 | 计划解决时机 |
|------|------|------------|
| **前端无 loading 骨架屏** | 数据加载只显示"加载中..."文字 | 引入骨架屏组件 |
| **无 Zustand 状态管理** | 复杂状态（如任务筛选条件）未持久化 | 按需引入 Zustand store |
| **seed 脚本未用 tsx 执行** | prisma/seed.ts 使用了 ESM import 但 prisma seed 命令可能需要额外配置 | 在 package.json 中配置 prisma.seed 或直接用 tsx 执行 |
| **rate limiting 基于内存** | 多实例部署时无法共享计数 | 迁移到 Redis-based rate limiter |
| **前端无 shadcn/ui 完整组件库** | 当前只有手写 Toast 和 ConfirmDialog | 按需引入 shadcn/ui 组件 |

#### 当前项目结构（Phase 1 后）

```
icet/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # 15 个模型
│   │   │   ├── seed.ts                # 种子数据（3 个测试账号）
│   │   │   └── migrations/            # 数据库迁移
│   │   └── src/
│   │       ├── main.ts                # 入口
│   │       ├── app.ts                 # 应用工厂
│   │       ├── db/prisma.ts           # Prisma 客户端
│   │       ├── middleware/            # error / auth / upload
│   │       ├── services/              # ★ 6 个 CRUD Service
│   │       │   ├── auth.service.ts
│   │       │   ├── scenario.service.ts
│   │       │   ├── regulation.service.ts
│   │       │   ├── task.service.ts
│   │       │   ├── sample.service.ts
│   │       │   ├── execution.service.ts
│   │       │   └── paper.service.ts
│   │       ├── routes/                # ★ 7 组路由（全部接入真实 Service）
│   │       │   ├── index.ts
│   │       │   ├── auth.routes.ts
│   │       │   ├── scenarios.routes.ts
│   │       │   ├── tasks.routes.ts
│   │       │   ├── samples.routes.ts
│   │       │   ├── regulations.routes.ts
│   │       │   ├── papers.routes.ts
│   │       │   ├── files.routes.ts
│   │       │   └── ai.routes.ts
│   │       └── websocket/server.ts
│   └── web/
│       └── src/
│           ├── App.tsx                # ★ 路由 + AuthProvider
│           ├── lib/                   # ★ API 客户端 + Auth 上下文
│           │   ├── api.ts
│           │   └── auth.tsx
│           ├── pages/                 # ★ 5 个页面
│           │   ├── LoginPage.tsx
│           │   ├── ScenarioListPage.tsx
│           │   ├── TaskListPage.tsx
│           │   ├── TaskDetailPage.tsx
│           │   └── RegulationListPage.tsx
│           └── components/layout/Layout.tsx
├── packages/
│   ├── shared/src/                    # 类型 + 常量 + 工具
│   └── excel-generator/src/           # Excel 底稿生成
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── .npmrc                             # node-linker=hoisted
└── .env.example
```

### ✅ 测试计划人工填写功能（已完成）

> 完成时间：2026-04-06
> 分支：`feature/solo`

#### 完成内容

| 模块 | 说明 |
|------|------|
| 后端 Service | `plan.service.ts` 实现 TestPlan 和 TestStep 的 CRUD，支持审核逻辑与状态自动流转 |
| 后端 Routes | `plan.routes.ts` 提供 `GET/POST /tasks/:id/plan` 及 `POST /tasks/:id/plan/approve` 接口 |
| 前端 组件 | `PlanTab.tsx` 实现步骤编辑器，支持增删改、排序及执行配置选择 |
| 前端 页面 | `TaskDetailPage.tsx` 集成测试计划 Tab，根据角色（执行人/审阅人）动态控制权限 |

#### 实现细节

**后端 — 测试计划服务**：
- **CRUD 逻辑**：支持 `upsert` 测试计划，并同步更新测试步骤。
- **状态流转**：创建计划自动流转至 `PLANNING`；审核通过流转至 `EXECUTING`；审核退回流转至 `PLANNING`。
- **权限校验**：严格校验 `organizationId`。

**前端 — 步骤编辑器**：
- **交互**：支持实时添加、删除、上下移动排序。
- **配置**：支持选择 `checkType`（签名/日期/金额/内容/人工）。
- **审核流**：审阅人支持一键审核通过或退回并填写意见。
- **状态管理**：集成 TanStack Query 保证数据一致性。

### 尚未开始开发
- **Phase 2**：消息队列（BullMQ + Worker）、WebSocket 进度推送集成、SampleParserAgent、RegulationParserAgent
- **Phase 3**：PlanGeneratorAgent、TestExecutorAgent（LangGraph 核心图）、前端执行矩阵 UI 优化
- **Phase 4**：异常管理、审阅归档流程、Dashboard 统计

---

## 九、项目约定与关键决策记录

| 约定 | 内容 |
|------|------|
| **ID类型** | 全部使用UUID v4字符串，类型别名`type ID = string` |
| **时间戳** | ISO 8601字符串，类型别名`type Timestamp = string` |
| **结果枚举** | `'✓' \| '×' \| 'N/A' \| 'PENDING'`，直接使用Unicode字符，与Excel展示一致 |
| **样本数量** | 不存储，始终`samples.length`计算，防止不一致 |
| **底稿存储** | 归档使用JSON快照（`snapshotData`字段），与源数据解耦 |
| **AI结果可覆盖** | `humanOverride`标记+保留AI原始数据，支持准确率分析 |
| **文件去重** | 按MD5 checksum去重，同一文件重复上传返回同一FileReference |
| **并发控制** | Agent执行concurrency=3，防止LLM费用失控 |
| **断点续传** | LangGraph使用SQLite Checkpointer，与主数据库隔离 |
| **系统用户** | AI操作使用`SYSTEM_USER_ID`（环境变量），标识非人工操作 |
| **错误处理** | 所有async controller用`asyncHandler`包装，统一走`errorMiddleware` |
| **状态机** | 状态转换规则集中在`task-state-machine.ts`，服务层强制校验 |
| **步骤同步** | 新增/删除TestStep时，自动同步所有现有Sample的StepExecution记录 |

---

## 十、接手后的第一步建议

```
1. 先理解Excel底稿格式
   打开已实现的 HTML 原型，填写数据，导出Excel
   对照设计稿截图，理解每个字段在底稿中的位置
   这是系统所有工作的最终产物，先建立感性认识

2. 搭建本地环境
   docker compose up -d（启动 PG+Redis+MinIO；PostgreSQL 宿主机端口为 5433）
   cp .env.example .env && cp .env.example apps/api/.env
   pnpm install
   pnpm --filter @icet/api exec prisma migrate dev --name init

3. 从 packages/shared/src/types/ 开始读代码
   所有业务概念都在这里定义
   理解每个接口之间的关系

4. 按Phase 0 → 1顺序开发
   不要跳过CRUD直接做AI
   Phase 1完成后整个基础流程可以人工操作跑通
   Phase 2-3再叠加AI能力

5. AI部分从SampleParserAgent开始
   比TestExecutorAgent简单
   可以快速验证PDF解析+LLM调用的基础链路是否工作
```

---

## 十一、外部依赖与账号清单

| 依赖 | 用途 | 获取方式 | 是否必须 |
|------|------|----------|----------|
| Docker Desktop / Rancher Desktop | 本地基础设施（PG/Redis/MinIO）；Rancher 需启用 dockerd (moby) | docker.com / rancherdesktop.io | **必须** |
| Node.js 20 LTS | 运行时 | nodejs.org | **必须** |