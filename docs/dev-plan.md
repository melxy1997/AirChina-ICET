# ICET 开发计划 — 详细逻辑链路拆解

---

## 总览：阶段与模块矩阵

```
         │ Phase 0 │ Phase 1 │ Phase 2 │ Phase 3 │ Phase 4
─────────┼─────────┼─────────┼─────────┼─────────┼─────────
工程基础  │   ████  │         │         │         │
认证体系  │         │   ████  │         │         │
场景/规章 │         │   ████  │         │         │
任务管理  │         │   ████  │         │         │
文件系统  │         │   ████  │         │         │
Excel导出 │         │   ████  │         │         │
消息队列  │         │         │   ████  │         │
AI基础    │         │         │   ████  │         │
Agent核心 │         │         │         │   ████  │
底稿汇总  │         │         │         │         │  ████
审阅归档  │         │         │         │         │  ████
```

---

## Phase 0 — 工程基础搭建

### 0-A：Monorepo 脚手架

**目标**：所有包可互相引用，开发命令统一，类型安全

```
任务序列：

0-A-1  初始化根目录
       ├── 创建 pnpm-workspace.yaml
       ├── 创建根 package.json (private: true, scripts: dev/build/lint/typecheck)
       ├── 创建 turbo.json
       │     pipeline:
       │       build: dependsOn [^build], outputs [dist/**]
       │       dev:   cache false, persistent true
       │       typecheck: dependsOn [^build]
       │       lint: outputs []
       └── 创建 tsconfig.base.json
             compilerOptions: strict, moduleResolution bundler,
             target ES2022, paths 待各包补充

0-A-2  创建 packages/shared
       ├── package.json  name: @icet/shared
       ├── tsconfig.json  extends ../../tsconfig.base.json
       ├── src/types/
       │     entities.ts   ← 所有实体接口
       │     api.ts        ← Request/Response 类型
       │     ai.ts         ← AI相关类型
       │     index.ts      ← 统一 re-export
       ├── src/constants/
       │     status.ts     ← TaskStatus/AIJobStatus 枚举值数组
       │     index.ts
       └── src/utils/
             date.ts       ← formatDate / parseDate
             validators.ts ← 通用校验函数

       验收：
         import { TestTask } from '@icet/shared' 在其他包中可用

0-A-3  创建 packages/excel-generator
       ├── package.json  name: @icet/excel-generator
       │     dependencies: xlsx
       │     peerDependencies: @icet/shared
       └── src/
             index.ts         ← export buildWorkbook(data: WorkingPaper): Buffer
             builders/
               worksheet.ts   ← buildSheet(d) → XLSX.WorkSheet
               styles.ts      ← 颜色常量 / makeStyle()
               merge-helper.ts← 合并单元格辅助

       验收：
         buildWorkbook(mockData) 返回有效 xlsx Buffer

0-A-4  脚手架 apps/api
       ├── package.json  name: @icet/api
       │     dependencies: express, prisma, @prisma/client,
       │                   bullmq, ioredis, socket.io,
       │                   @langchain/openai, @langchain/langgraph,
       │                   multer, zod, jsonwebtoken, bcryptjs
       │     devDependencies: tsx, @types/express, vitest
       ├── tsconfig.json
       ├── src/main.ts        ← 入口：启动 http server + socket.io
       ├── src/app.ts         ← Express 实例、中间件注册
       └── prisma/schema.prisma ← 初始 schema（仅 User + Organization）

0-A-5  脚手架 apps/web
       ├── 使用 create vite --template react-ts 生成
       ├── 安装: react-router-dom, @tanstack/react-query,
       │         zustand, axios, socket.io-client,
       │         tailwindcss, shadcn/ui
       ├── 配置 vite.config.ts
       │     resolve.alias: @/* → src/*
       │     proxy: /api → localhost:3001
       └── 初始化 tailwind + shadcn/ui

0-A-6  docker-compose.yml
       services:
         postgres:
           image: postgres:16-alpine
           env: POSTGRES_USER/PASSWORD/DB
           ports: 5432:5432
           volumes: pgdata:/var/lib/postgresql/data
         redis:
           image: redis:7-alpine
           ports: 6379:6379
         minio:
           image: minio/minio
           command: server /data --console-address :9001
           ports: 9000:9000, 9001:9001
           volumes: miniodata:/data

       验收：
         docker compose up -d
         docker compose ps  → 全部 running
```

---

### 0-B：数据库 Schema 完整定义

**目标**：一次性定义全量 Prisma Schema，后续 migrate 追加

```
任务序列：

0-B-1  完整 prisma/schema.prisma
       按以下顺序定义 model：

       model Organization {
         id, name, code, parentId?, createdAt
         relations: users[], scenarios[], regulations[]
       }

       model User {
         id, orgId, name, email, passwordHash,
         role (enum UserRole), isActive, createdAt
         relations: org, tasksAsTester[], tasksAsReviewer[]
       }

       model BusinessScenario {
         id, orgId, name,
         processLevel1, processLevel2, processLevel3?
         isActive, createdBy, createdAt, updatedAt
         relations: org, creator, tasks[], scenarioRegulations[]
       }

       model Regulation {
         id, orgId, title, version,
         effectiveDate?, expiryDate?
         fileRefId, parseStatus (enum AIJobStatus),
         parsedAt?, createdBy, createdAt, updatedAt
         relations: fileRef, controlPoints[], scenarioRegulations[]
       }

       model ControlPoint {
         id, regulationId, controlId (C1/C2...),
         title, description,
         suggestedSteps Json?,   ← string[]
         confidence Float,
         pageRefs Json?,         ← number[]
         createdAt
         relations: regulation
       }

       model ScenarioRegulation {  ← M:N 显式连接表
         scenarioId, regulationId
         @@id([scenarioId, regulationId])
       }

       model FileReference {
         id, originalName, storagePath,
         fileType, mimeType, sizeBytes,
         checksum, pageCount?,
         uploadedBy, uploadedAt
         relations: uploader
       }

       model TestTask {
         id, orgId, scenarioId,
         paperId, unitName,
         testerId, reviewerId?,
         completionDate?,
         status (enum TaskStatus),
         sampling Json,          ← SamplingConfig
         testPlanId?, sampleSetId?, workingPaperId?,
         createdBy, createdAt, updatedAt
         relations: org, scenario, tester, reviewer,
                    plan?, sampleSet?, paper?,
                    regulations[], statusHistory[],
                    anomalies[]
       }

       model TaskStatusHistory {
         id, taskId, status,
         changedBy, changedAt, comment?
       }

       model TaskRegulation {     ← M:N
         taskId, regulationId
         @@id([taskId, regulationId])
       }

       model TestPlan {
         id, taskId (unique),
         controlDescription, controlIds Json,
         generatedBy, aiJobId?,
         generatedAt, reviewStatus,
         reviewedBy?, reviewedAt?, reviewComment?,
         version, previousVersionId?
         relations: task, steps[], aiJob?
       }

       model TestStep {
         id, planId, index,
         description, executionConfig Json
         relations: plan, executions[]
       }

       model SampleSet {
         id, taskId (unique), createdAt, updatedAt
         relations: task, samples[]
       }

       model Sample {
         id, setId, no, content,
         parsedContent Json?,
         remark?, addedBy, addedAt
         relations: set, adder, fileRefs[], stepExecutions[]
       }

       model SampleFileRef {       ← M:N
         sampleId, fileRefId
         @@id([sampleId, fileRefId])
       }

       model StepExecution {
         id, sampleId, stepId,
         result, executedBy,
         aiJobId?, aiReasoning?,
         aiEvidence Json?, aiConfidence?,
         humanOverride, humanOverrideBy?,
         humanOverrideAt?, humanNote?,
         anomalyId?, executedAt
         @@unique([sampleId, stepId])
         relations: sample, step, anomaly?
       }

       model AnomalyRecord {
         id, taskId, stepExecutionId,
         findingNo, description,
         stepNo, sampleNo, supportingDoc,
         severity?, status,
         resolvedBy?, resolvedAt?, resolution?,
         createdBy, createdAt, updatedAt
       }

       model WorkingPaper {
         id, taskId (unique),
         snapshotData Json,      ← 完整 WorkingPaper 快照
         status,
         submittedBy?, submittedAt?,
         approvedBy?, approvedAt?, approvalComment?,
         createdAt, updatedAt
       }

       model AIJob {
         id, type, inputEntityType, inputEntityId,
         status, agentType, modelUsed?,
         tokensUsed?, durationMs?,
         progress?, currentStep?,
         outputEntityType?, outputEntityId?,
         errorMessage?, checkpointState?,
         startedAt?, completedAt?, createdAt
       }

0-B-2  执行初始迁移
       pnpm prisma migrate dev --name init_full_schema

       验收：
         psql 中查看所有表已创建
         pnpm prisma studio 可浏览

0-B-3  Seed 数据
       prisma/seed.ts：
         ├── 创建 1 个 Organization（大连航空有限责任公司）
         ├── 创建 3 个 User（admin/tester/reviewer）
         └── 创建 2 个 BusinessScenario（餐食采购 / 账单付款）

       验收：
         pnpm prisma db seed
         数据库中可查到种子数据
```

---

## Phase 1 — 核心 CRUD

### 1-A：API 公共基础设施

```
任务序列：

1-A-1  HTTP Server 结构
       src/main.ts：
         const app = createApp()
         const httpServer = createServer(app)
         httpServer.listen(PORT)
         initSocketIO(httpServer)   ← Phase 2 再实现，此处仅占位

       src/app.ts：
         ├── helmet()               ← 安全头
         ├── cors({ origin, credentials: true })
         ├── express.json({ limit: '10mb' })
         ├── express.urlencoded()
         ├── morgan('dev')          ← 请求日志
         ├── /health 路由           ← { status: 'ok', timestamp }
         ├── /api/v1 路由挂载
         └── errorMiddleware        ← 全局错误处理

1-A-2  错误处理中间件
       src/middleware/error.middleware.ts：

       class AppError extends Error {
         constructor(
           message: string,
           public statusCode: number = 500,
           public code?: string
         ) { super(message) }
       }

       errorMiddleware(err, req, res, next):
         if err instanceof AppError:
           return res.status(err.statusCode).json({
             success: false, message: err.message, code: err.code
           })
         // 未知错误
         console.error(err)
         res.status(500).json({ success: false, message: 'Internal Server Error' })

       asyncHandler(fn):  ← 包装 async controller，自动 next(err)
         return (req, res, next) => fn(req, res, next).catch(next)

1-A-3  Prisma 客户端单例
       src/db/prisma.ts：
         const prisma = new PrismaClient({ log: ['error'] })
         export default prisma

         graceful shutdown:
           process.on('SIGINT', async () => {
             await prisma.$disconnect()
             process.exit(0)
           })

1-A-4  Zod 响应封装
       src/utils/response.ts：
         success<T>(res, data: T, statusCode = 200)
         created<T>(res, data: T)
         paginated<T>(res, data: T[], total, page, pageSize)

       验收：
         GET /health → { status: 'ok' }
         任意路径错误 → { success: false, message: '...' }
```

---

### 1-B：认证体系

```
任务序列：

1-B-1  密码工具
       src/utils/crypto.ts：
         hashPassword(plain: string): Promise<string>  ← bcrypt.hash, rounds=10
         verifyPassword(plain, hash): Promise<boolean>

1-B-2  JWT 工具
       src/utils/jwt.ts：
         interface JwtPayload { userId: ID; role: UserRole; orgId: ID }

         signToken(payload): string
           ← jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

         verifyToken(token): JwtPayload
           ← jwt.verify(token, JWT_SECRET) as JwtPayload

1-B-3  认证中间件
       src/middleware/auth.middleware.ts：

         authenticate(req, res, next):
           1. 读取 req.cookies.token 或 Authorization: Bearer <token>
           2. verifyToken(token) → payload
           3. req.user = payload
           4. next()
           5. 任何异常 → next(new AppError('未授权', 401))

         requireRole(...roles: UserRole[]):
           return (req, res, next) =>
             if !roles.includes(req.user.role) → 403
             next()

1-B-4  认证路由与控制器
       POST /api/v1/auth/login
         controller:
           1. zod 校验 { email, password }
           2. prisma.user.findUnique({ where: { email } })
           3. verifyPassword → false → 401
           4. !user.isActive → 403
           5. signToken({ userId, role, orgId })
           6. res.cookie('token', token, { httpOnly, secure, maxAge })
           7. return { user: { id, name, email, role } }

       POST /api/v1/auth/logout
         res.clearCookie('token')
         return { success: true }

       GET /api/v1/auth/me  [authenticate]
         return req.user 对应的 User 记录

       验收：
         POST /auth/login 正确凭据 → 200 + cookie
         GET /auth/me 无 token → 401
         GET /auth/me 有 token → 200 + user info
```

---

### 1-C：文件存储服务

```
任务序列：

1-C-1  MinIO 客户端初始化
       src/storage/minio.client.ts：
         const client = new Minio.Client({
           endPoint, port, useSSL,
           accessKey, secretKey
         })

         async ensureBucket(bucket: string):
           ← client.bucketExists() → client.makeBucket()

         async uploadBuffer(
           buffer: Buffer,
           key: string,
           mimeType: string,
           bucket = STORAGE_BUCKET
         ): Promise<string>  ← 返回存储路径

         async getSignedUrl(key, expiry = 3600): Promise<string>

         async deleteObject(key): Promise<void>

1-C-2  文件上传 Multer 中间件
       src/middleware/upload.middleware.ts：
         const upload = multer({
           storage: multer.memoryStorage(),
           limits: { fileSize: 50MB },
           fileFilter: (req, file, cb) =>
             允许: pdf, png, jpg, jpeg, xlsx
             其余: cb(new AppError('不支持的文件类型', 400))
         })

         export const uploadSingle = upload.single('file')
         export const uploadMultiple = upload.array('files', 10)

1-C-3  FileService
       src/services/file.service.ts：

         async saveUploadedFile(
           file: Express.Multer.File,
           userId: ID
         ): Promise<FileReference>

           流程：
           1. 计算 checksum = md5(file.buffer)
           2. 查重：prisma.fileReference.findFirst({ where: { checksum } })
              ← 如已存在直接返回（去重）
           3. 生成 key = `${uuid()}.${ext}`
           4. minioClient.uploadBuffer(file.buffer, key, file.mimetype)
           5. if PDF: pageCount = await getPdfPageCount(file.buffer)
           6. prisma.fileReference.create({
                originalName, storagePath: key, fileType,
                mimeType, sizeBytes, checksum, pageCount, uploadedBy
              })
           7. return fileRef

         async getDownloadUrl(fileRefId: ID): Promise<string>
           ← minioClient.getSignedUrl(fileRef.storagePath)

         async deleteFile(fileRefId: ID, userId: ID): Promise<void>
           ← 权限校验 → minio 删除 → db 软删除

1-C-4  文件路由
       POST /api/v1/files/upload  [authenticate, uploadSingle]
         → fileService.saveUploadedFile → return FileReference

       GET /api/v1/files/:id/url  [authenticate]
         → fileService.getDownloadUrl → return { url }

       验收：
         上传 PDF → 返回 FileReference，MinIO bucket 中可见文件
         重复上传同文件 → 返回相同 FileReference.id（去重生效）
```

---

### 1-D：业务场景与规章制度 CRUD

```
任务序列：

1-D-1  ScenarioService
       src/services/scenario.service.ts：

         list(orgId, pagination): Promise<Paginated<BusinessScenario>>
           ← prisma.businessScenario.findMany({ where: { orgId, isActive: true } })

         getById(id, orgId): Promise<BusinessScenario>
           ← 找不到 → AppError 404

         create(data, userId): Promise<BusinessScenario>

         update(id, data, userId): Promise<BusinessScenario>
           ← 校验 orgId 归属

         softDelete(id, userId): Promise<void>
           ← isActive = false

1-D-2  RegulationService
       src/services/regulation.service.ts：

         list(orgId, pagination)
         getById(id, orgId)  ← include: controlPoints

         create(data: {
           title, version, effectiveDate?, expiryDate?,
           fileId  ← 已上传的 FileReference.id
         }, userId): Promise<Regulation>

           流程：
           1. 校验 fileId 存在且属于该用户/组织
           2. prisma.regulation.create({ parseStatus: 'QUEUED' })
           3. return regulation（不立即触发解析）

         triggerParse(regulationId, userId): Promise<AIJob>
           ← Phase 2 实现，此处返回 TODO stub

         updateControlPoint(cpId, data, userId): Promise<ControlPoint>

         deleteControlPoint(cpId, userId): Promise<void>

1-D-3  路由注册
       GET    /scenarios
       POST   /scenarios
       GET    /scenarios/:id
       PUT    /scenarios/:id
       DELETE /scenarios/:id

       GET    /regulations
       POST   /regulations        ← body: { title, version, fileId, ... }
       GET    /regulations/:id
       PUT    /regulations/:id
       DELETE /regulations/:id
       POST   /regulations/:id/parse  ← stub，Phase 2 补全

       验收：
         CRUD 全链路测试
         POST /regulations 不上传文件直接提交 fileId → 404 错误
```

---

### 1-E：测试任务 CRUD 与状态机

```
任务序列：

1-E-1  状态机定义
       src/constants/task-state-machine.ts：

         ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
           DRAFT:        ['PLANNING', 'CANCELLED'],
           PLANNING:     ['PLAN_REVIEW', 'DRAFT'],
           PLAN_REVIEW:  ['EXECUTING', 'PLANNING'],
           EXECUTING:    ['EXEC_REVIEW', 'PLAN_REVIEW'],
           EXEC_REVIEW:  ['PAPER_DRAFT', 'EXECUTING'],
           PAPER_DRAFT:  ['PAPER_REVIEW', 'EXEC_REVIEW'],
           PAPER_REVIEW: ['ARCHIVED', 'PAPER_DRAFT'],
           ARCHIVED:     [],
           CANCELLED:    []
         }

         canTransition(from, to): boolean

1-E-2  TaskService
       src/services/task.service.ts：

         create(req: CreateTaskRequest, userId): Promise<TestTask>
           事务：
           1. prisma.testTask.create({ status: 'DRAFT', ... })
           2. prisma.sampleSet.create({ taskId: task.id })
           3. prisma.taskRegulation.createMany({ taskId, regulationIds })
           return task

         getById(id, userId): Promise<TestTask & relations>
           ← include: scenario, tester, reviewer,
                       plan?, sampleSet.samples?, paper?
           ← 权限校验：属于同 org

         list(orgId, filters, pagination)
           filters: status?, scenarioId?, testerId?, dateRange?

         update(id, data, userId): Promise<TestTask>
           ← 仅 DRAFT/PLAN_REVIEW 状态允许修改基础信息

         advanceStatus(id, targetStatus, userId, comment?):
           1. getById → 校验 canTransition
           2. 事务：
              prisma.testTask.update({ status: targetStatus })
              prisma.taskStatusHistory.create(...)
           3. emitSocketEvent(id, 'task.status_changed', { newStatus })

1-E-3  Task 路由
       GET    /tasks
       POST   /tasks
       GET    /tasks/:id
       PUT    /tasks/:id
       PATCH  /tasks/:id/status     body: { targetStatus, comment? }

       验收：
         创建任务 → 自动创建 SampleSet
         PATCH /tasks/:id/status body: { targetStatus: 'PLANNING' } → 200
         非法状态转换 → 400 + 错误信息
```

---

### 1-F：样本管理 CRUD

```
任务序列：

1-F-1  SampleService
       src/services/sample.service.ts：

         addSample(taskId, data: AddSampleRequest, userId):
           1. 校验 task 存在 + 属于用户 org
           2. 校验 task.status in ['PLAN_REVIEW','EXECUTING'] or DRAFT
           3. 校验 fileIds 均存在
           4. 事务：
              a. prisma.sample.create({ setId, no, content, remark, addedBy })
              b. prisma.sampleFileRef.createMany({ sampleId, fileIds })
           5. return sample with fileRefs

         listSamples(taskId, userId): Promise<Sample[]>
           ← include: fileRefs, stepExecutions

         updateSample(sampleId, data, userId):
           ← 仅允许修改 content/remark/no

         removeSample(sampleId, userId):
           事务：
           1. 删除 StepExecution（若有）
           2. 删除 SampleFileRef
           3. 删除 Sample

         triggerParse(sampleId, userId): Promise<AIJob>
           ← Phase 2 实现

1-F-2  Sample 路由
       GET    /tasks/:id/samples
       POST   /tasks/:id/samples
       PUT    /tasks/:id/samples/:sid
       DELETE /tasks/:id/samples/:sid
       POST   /tasks/:id/samples/:sid/parse  ← stub

       验收：
         添加样本 → 关联文件正确存储
         删除样本 → 级联删除相关记录
```

---

### 1-G：测试计划 CRUD

```
任务序列：

1-G-1  PlanService (人工部分)
       src/services/plan.service.ts：

         getOrCreatePlan(taskId, userId): Promise<TestPlan>
           ← 有则返回，无则创建空 plan（reviewStatus: 'PENDING'）

         updatePlan(planId, data: {
           controlDescription?, controlIds?,
           steps?: { index, description, executionConfig }[]
         }, userId): Promise<TestPlan>

           流程：
           1. 版本递增 version++
           2. 将当前 plan 快照存为 previousVersion（可选）
           3. 事务：
              a. 更新 TestPlan 字段
              b. 删除旧 TestStep
              c. 批量创建新 TestStep
           4. 同步 StepExecution：
              ← 新增步骤 → 为所有现有 sample 创建 PENDING 的 StepExecution
              ← 删除步骤 → 删除对应 StepExecution

         approvePlan(planId, userId):
           ← reviewStatus = 'APPROVED'
           ← advanceStatus(taskId, 'EXECUTING')

         rejectPlan(planId, userId, comment):
           ← reviewStatus = 'REJECTED'

         generatePlan(taskId, userId): Promise<AIJob>
           ← Phase 2 实现

1-G-2  Plan 路由
       GET    /tasks/:id/plan
       PUT    /tasks/:id/plan
       POST   /tasks/:id/plan/generate    ← stub
       POST   /tasks/:id/plan/approve
       POST   /tasks/:id/plan/reject

       关键链路验证：
         手动填写步骤 → PUT /plan
         approve → task.status 变为 EXECUTING
         新增步骤后已有 sample → 自动创建 PENDING StepExecution
```

---

### 1-H：手动执行结果录入

```
任务序列：

1-H-1  ExecutionService (人工部分)
       src/services/execution.service.ts：

         getExecutionMatrix(taskId, userId):
           返回结构：
           {
             steps: TestStep[],
             rows: {
               sample: Sample,
               results: {
                 stepId: ID,
                 execution: StepExecution | null
               }[]
             }[]
           }

         setResult(data: UpdateStepResultRequest, userId):
           1. 校验 sampleId / stepId 合法性
           2. prisma.stepExecution.upsert({
                where: { sampleId_stepId },
                create: { result, executedBy: 'HUMAN', humanNote, executedAt }
                update: {
                  result, humanOverride: true,
                  humanOverrideBy: userId,
                  humanOverrideAt: now(),
                  humanNote
                }
              })
           3. if result === '×':
              ← 自动创建/更新 AnomalyRecord（stub，留 findingNo 为空）

1-H-2  Execution 路由
       GET    /tasks/:id/executions    ← 返回矩阵
       PATCH  /tasks/:id/executions/:eid   body: { result, humanNote? }

       验收：
         手动设置某 sample × step 的结果
         设置为 × → AnomalyRecord 自动创建
```

---

### 1-I：工作底稿生成与 Excel 导出

```
任务序列：

1-I-1  PaperService
       src/services/paper.service.ts：

         generateFromTask(taskId, userId, overrides?):

           流程（详细）：
           1. 加载 task + scenario + plan + plan.steps
           2. 加载 sampleSet.samples（含 stepExecutions）
           3. 加载 anomalies
           4. 加载 tester/reviewer User 记录（取 name 字段）

           5. 构建 steps 快照：
              plan.steps.sort(by index).map(s => ({
                index: s.index,
                description: s.description
              }))

           6. 构建 samples 快照：
              sampleSet.samples.sort(by no).map(sample => {
                stepResults = plan.steps.map(step => {
                  exec = sample.stepExecutions.find(e => e.stepId === step.id)
                  return exec?.result ?? 'PENDING'
                })
                return { no, content, stepResults, remark }
              })

           7. 构建 anomalies 快照

           8. 确定 testResult.result：
              hasAnyFail = samples.some(s =>
                s.stepResults.some(r => r === '×')
              )
              result = hasAnyFail ? '存在差异' : '无差异'

           9. 组装 WorkingPaper 对象

           10. prisma.workingPaper.upsert({
                 where: { taskId },
                 create: { snapshotData: JSON.stringify(paperData), status: 'DRAFT' }
                 update: { snapshotData: ..., updatedAt: now() }
               })

         getPaper(taskId, userId): Promise<WorkingPaper>

         updatePaper(paperId, updates, userId):
           ← 仅允许修改特定字段（controlDescription, testResult, anomalies）
           ← status 必须为 DRAFT

         submitForReview(paperId, userId):
           ← status = 'SUBMITTED'
           ← 校验所有步骤结果非 PENDING

         approvePaper(paperId, userId):
           ← requireRole('REVIEWER', 'ADMIN')
           ← status = 'APPROVED'
           ← advanceTask to ARCHIVED

         exportToExcel(paperId, userId): Promise<{ downloadUrl: string }>
           1. 加载 WorkingPaper.snapshotData
           2. buildWorkbook(data) → Buffer（调用 @icet/excel-generator）
           3. fileService.saveBuffer(buffer, filename, 'EXCEL', userId)
           4. return getDownloadUrl(fileRef.id)

1-I-2  Paper 路由
       GET    /tasks/:id/paper
       POST   /tasks/:id/paper/generate
       PUT    /tasks/:id/paper        ← 局部更新
       POST   /tasks/:id/paper/submit
       POST   /tasks/:id/paper/approve
       POST   /tasks/:id/paper/export ← 返回 { downloadUrl }

       验收：
         完整流程：创建任务 → 添加计划 → 添加样本 → 录入结果
         → generate paper → export → 下载 xlsx 文件可打开
         结果含 × → testResult.result = '存在差异'
         所有 ✓ → '无差异'

1-I-3  前端底稿编辑器集成
       将已有 HTML 原型重构为 React 组件：
       apps/web/src/components/paper-editor/
         PaperEditor.tsx         ← 主容器，接收 WorkingPaper 数据
         sections/
           BasicInfoSection.tsx  ← §1§2§3
           ControlDescSection.tsx← §4
           TestResultSection.tsx ← §5
           StepsSection.tsx      ← §6（动态步骤）
           SamplesSection.tsx    ← §7（矩阵表格）
           AnomaliesSection.tsx  ← §8
         ExportButton.tsx        ← 调用 POST /paper/export

       数据流：
         useQuery(['paper', taskId]) → PaperEditor props
         本地编辑状态 → useMutation(updatePaper)
         自动保存（debounce 2s）
```

---

## Phase 2 — AI 基础能力

### 2-A：消息队列基础设施

```
任务序列：

2-A-1  Redis 连接
       src/queue/redis.client.ts：
         const connection = new IORedis(REDIS_URL, {
           maxRetriesPerRequest: null  ← BullMQ 要求
         })
         export default connection

2-A-2  队列定义
       src/queue/queues.ts：
         export const aiJobQueue = new Queue<AIJobPayload>('ai-jobs', {
           connection,
           defaultJobOptions: {
             attempts: 3,
             backoff: { type: 'exponential', delay: 5000 },
             removeOnComplete: 100,
             removeOnFail: 200
           }
         })

         export type AIJobPayload = {
           jobId: ID              ← AIJob.id（数据库主键）
           type: AIJobType
           entityId: ID
         }

2-A-3  AIJobService
       src/services/ai-job.service.ts：

         create(type, entityType, entityId, agentType): Promise<AIJob>
           1. prisma.aIJob.create({ type, inputEntityType, inputEntityId,
                                    agentType, status: 'QUEUED', createdAt })
           2. aiJobQueue.add(type, { jobId: job.id, type, entityId })
           3. return job

         updateProgress(jobId, progress, currentStep):
           prisma.aIJob.update({ progress, currentStep, status: 'RUNNING' })
           emitSocketEvent('ai_job.progress', { jobId, progress, currentStep })

         complete(jobId, outputEntityType, outputEntityId, tokensUsed?):
           prisma.aIJob.update({
             status: 'COMPLETED', completedAt: now(),
             outputEntityType, outputEntityId, tokensUsed,
             durationMs: now() - job.startedAt
           })
           emitSocketEvent('ai_job.completed', { jobId })

         fail(jobId, error: Error):
           prisma.aIJob.update({
             status: 'FAILED',
             errorMessage: error.message,
             completedAt: now()
           })
           emitSocketEvent('ai_job.failed', { jobId, error: error.message })

         getById(jobId): Promise<AIJob>
         cancel(jobId, userId): Promise<void>

2-A-4  Worker 基础结构
       src/queue/worker.ts：

         const worker = new Worker<AIJobPayload>(
           'ai-jobs',
           async (job) => {
             const { jobId, type, entityId } = job.data
             await prisma.aIJob.update({
               where: { id: jobId },
               data: { status: 'RUNNING', startedAt: new Date() }
             })
             try {
               switch (type) {
                 case 'PARSE_REGULATION':
                   await runRegulationParser(jobId, entityId)
                   break
                 case 'PARSE_SAMPLE':
                   await runSampleParser(jobId, entityId)
                   break
                 case 'GENERATE_TEST_PLAN':
                   await runPlanGenerator(jobId, entityId)
                   break
                 case 'EXECUTE_STEP':
                 case 'EXECUTE_ALL_STEPS':
                   await runTestExecutor(jobId, entityId, type)
                   break
               }
             } catch (err) {
               await aiJobService.fail(jobId, err as Error)
               throw err  ← 让 BullMQ 记录失败
             }
           },
           { connection, concurrency: 3 }
         )

         worker.on('failed', (job, err) => console.error(...))

       验收：
         手动向队列 add 一条 job
         worker 接收并处理（打印日志）
         AIJob 状态从 QUEUED → RUNNING → COMPLETED
```

---

### 2-B：WebSocket 实时推送

```
任务序列：

2-B-1  Socket.io 服务端
       src/websocket/server.ts：

         let io: Server

         export function initSocketIO(httpServer):
           io = new Server(httpServer, {
             cors: { origin: WEB_ORIGIN, credentials: true },
             path: '/ws'
           })

           io.use((socket, next) => {
             ← 从 socket.handshake.auth.token 或 cookie 验证 JWT
             ← next(err) if invalid
           })

           io.on('connection', (socket) => {
             socket.on('join:task', (taskId) => {
               ← 校验用户有权限访问该 task
               socket.join(`task:${taskId}`)
             })
             socket.on('leave:task', (taskId) => {
               socket.leave(`task:${taskId}`)
             })
           })

         export function emitToTask(taskId, event, data):
           io.to(`task:${taskId}`).emit(event, data)

         // 在 aiJobService 中调用：
         // emitToTask(taskId, 'ai_job.progress', { jobId, progress, currentStep })

2-B-2  前端 Socket Hook
       apps/web/src/hooks/useTaskSocket.ts：

         export function useTaskSocket(taskId: string) {
           const socket = useRef<Socket | null>(null)
           const queryClient = useQueryClient()

           useEffect(() => {
             socket.current = io(WS_URL, {
               auth: { token: getStoredToken() },
               path: '/ws'
             })
             socket.current.emit('join:task', taskId)

             socket.current.on('ai_job.progress', ({ jobId, progress, currentStep }) => {
               queryClient.setQueryData(['ai-job', jobId], (old) => ({
                 ...old, progress, currentStep, status: 'RUNNING'
               }))
             })

             socket.current.on('ai_job.completed', ({ jobId }) => {
               queryClient.invalidateQueries(['ai-job', jobId])
               queryClient.invalidateQueries(['task', taskId])
               queryClient.invalidateQueries(['executions', taskId])
             })

             socket.current.on('task.status_changed', ({ newStatus }) => {
               queryClient.invalidateQueries(['task', taskId])
             })

             return () => {
               socket.current?.emit('leave:task', taskId)
               socket.current?.disconnect()
             }
           }, [taskId])
         }

2-B-3  AI任务进度组件
       apps/web/src/components/ai-job-monitor/AIJobMonitor.tsx：
         props: jobId, onComplete, onFail
         显示: ProgressBar + currentStep 文字 + 状态图标

       验收：
         触发任何 AI job → 前端实时显示进度条
         job 完成 → 相关 query 自动刷新
```

---

### 2-C：SampleParserAgent

```
任务序列：

2-C-1  PDF 文本提取工具
       src/agents/tools/pdf-extractor.ts：

         async extractPdfText(buffer: Buffer): Promise<PageContent[]>
           1. pdf-parse(buffer)
           2. 按页拆分文本
           3. return [{ pageNumber, text }]

         async extractWithOCR(buffer: Buffer): Promise<PageContent[]>
           1. 将 PDF 页面转为图片（pdf2pic 或 sharp）
           2. Tesseract.js 对每页 OCR
           3. return [{ pageNumber, text, imageUrl }]

         async smartExtract(buffer: Buffer): Promise<PageContent[]>
           ← 先尝试原生提取，文本量不足则 fallback 到 OCR

2-C-2  结构化提取 LLM Chain
       src/agents/sample-parser/parser.chain.ts：

         const EXTRACTION_PROMPT = `
         你是一个文档结构分析专家。
         请从以下文档文本中提取：
         1. 所有检测到的签名/盖章（签名人角色、位置描述、是否存在）
         2. 所有日期（字段名、日期值）
         3. 所有金额（字段名、金额值、币种）
         4. 文档整体结构描述（100字以内）
         5. 文档摘要（200字以内）

         输出严格的 JSON 格式，符合 SampleParsedContent schema。
         `

         async extractStructured(
           pages: PageContent[],
           llm: BaseChatModel
         ): Promise<SampleParsedContent>
           1. 将 pages 拼接为文本（注意 token 限制，超长则分批）
           2. llm.invoke([system: EXTRACTION_PROMPT, user: text])
           3. JSON.parse(response) → SampleParsedContent
           4. 校验 zod schema

2-C-3  SampleParserAgent 主逻辑
       src/agents/sample-parser/index.ts：

         export async function runSampleParser(jobId: ID, sampleId: ID):

           1. 加载 Sample + fileRefs
           2. aiJobService.updateProgress(jobId, 10, '加载文件...')

           3. for each fileRef:
              a. buffer = await minioClient.getObject(fileRef.storagePath)
              b. aiJobService.updateProgress(jobId, 20+i*20, `解析文件 ${i+1}...`)
              c. pages = await smartExtract(buffer)

           4. aiJobService.updateProgress(jobId, 70, 'AI 结构化提取...')

           5. allPages = merge pages from all files
           6. parsedContent = await extractStructured(allPages, llm)
           7. parsedContent.pages = allPages
           8. parsedContent.parsedAt = now()

           9. prisma.sample.update({
                where: { id: sampleId },
                data: { parsedContent: JSON.stringify(parsedContent) }
              })

           10. aiJobService.complete(jobId, 'Sample', sampleId)
           11. aiJobService.updateProgress(jobId, 100, '完成')

2-C-4  触发接口补全
       POST /tasks/:id/samples/:sid/parse
         controller:
           1. 校验 task + sample 归属
           2. aiJobService.create('PARSE_SAMPLE', 'Sample', sampleId, 'SAMPLE_PARSER')
           3. return { jobId }

       验收：
         上传 PDF → POST /parse → 轮询 GET /ai-jobs/:id
         最终 sample.parsedContent 包含 signatures/dates/amounts
         前端实时看到进度条推进到 100%
```

---

### 2-D：RegulationParserAgent

```
任务序列：

2-D-1  控制点提取 Chain
       src/agents/regulation-parser/extractor.chain.ts：

         CONTROL_POINT_PROMPT = `
         你是内部控制审计专家。
         请从以下规章制度文本中识别并提取所有"控制点"。

         控制点的特征：
         - 通常有明确的控制编号（如 C1、C2、编号1.1 等）
         - 描述了某个业务流程中的关键控制机制
         - 涉及：何人执行、何时执行、执行什么操作、如何审批

         对每个控制点，提取：
         1. controlId: 控制编号
         2. title: 简短标题
         3. description: 详细描述（保留原文）
         4. responsible: 责任人/岗位
         5. approvalChain: 审批流程（数组）
         6. suggestedTestSteps: 建议的3-5个测试步骤（可执行的检查动作）
         7. pageReferences: 来源页码

         输出 JSON 数组。
         `

2-D-2  RegulationParserAgent 主逻辑
       src/agents/regulation-parser/index.ts：

         export async function runRegulationParser(jobId: ID, regulationId: ID):

           1. 加载 Regulation + fileRef
           2. buffer = minioClient.getObject(fileRef.storagePath)
           3. pages = smartExtract(buffer)

           4. 分批处理（每批 ~3000 token 的文本）：
              for each batch:
                aiJobService.updateProgress(jobId, progress, `处理第${i}页...`)
                partial = await extractControlPoints(batch, llm)
                allControls.push(...partial)

           5. 去重合并（相同 controlId 合并）

           6. 事务：
              prisma.regulation.update({ parseStatus: 'COMPLETED', parsedAt: now() })
              prisma.controlPoint.createMany({ data: allControls.map(c => ({
                regulationId, ...c,
                suggestedSteps: JSON.stringify(c.suggestedTestSteps),
                pageRefs: JSON.stringify(c.pageReferences)
              })) })

           7. aiJobService.complete(jobId, 'Regulation', regulationId)

       验收：
         上传含 C1/C2/C3 控制点的 PDF → 触发解析
         解析完成 → GET /regulations/:id → controlPoints 已填充
```

---

## Phase 3 — 核心 AI Agent

### 3-A：PlanGeneratorAgent

```
任务序列：

3-A-1  测试计划生成 Chain
       src/agents/plan-generator/generator.chain.ts：

         PLAN_GENERATION_PROMPT = `
         你是内部控制评价测试专家。
         基于以下控制点列表，设计一份测试计划。

         要求：
         1. 控制点描述：整合所有控制点，形成连贯的叙述文本
         2. 测试步骤：设计 3-8 个具体可执行的测试步骤
            每个步骤必须是可以对一份具体文件执行的检查动作
            例如：
            - "查看[文件]中是否存在[角色]的签字/盖章"
            - "核对[字段A]与[字段B]是否一致"
            - "检查[日期字段]是否在规定期限内"
         3. 每个步骤配置执行类型（checkType）和检查参数

         输出 JSON，格式如下：
         {
           "controlDescription": "...",
           "controlIds": ["C1", "C2"],
           "steps": [{
             "index": 1,
             "description": "...",
             "executionConfig": {
               "checkType": "SIGNATURE_PRESENCE",
               "signatureCheck": { "requiredSigners": ["总经理"] }
             }
           }]
         }
         `

3-A-2  PlanGeneratorAgent 主逻辑
       src/agents/plan-generator/index.ts：

         export async function runPlanGenerator(jobId: ID, taskId: ID):

           1. 加载 task.regulations → controlPoints
           2. aiJobService.updateProgress(jobId, 20, '分析控制点...')

           3. controlPointsText = formatControlPoints(controlPoints)
           4. result = await generatePlan(controlPointsText, llm)

           5. aiJobService.updateProgress(jobId, 70, '生成测试步骤...')

           6. 事务：
              plan = await planService.getOrCreatePlan(taskId)
              await planService.updatePlan(plan.id, {
                controlDescription: result.controlDescription,
                controlIds: result.controlIds,
                steps: result.steps
              }, SYSTEM_USER_ID)
              prisma.testPlan.update({
                generatedBy: 'AI',
                aiJobId: jobId,
                reviewStatus: 'PENDING'
              })

           7. aiJobService.complete(jobId, 'TestPlan', plan.id)

           ← advanceTask to PLAN_REVIEW

       验收：
         POST /tasks/:id/plan/generate
         计划生成 → 前端「计划」标签出现步骤列表
         reviewStatus = PENDING，等待人工审核
```

---

### 3-B：TestExecutorAgent（核心）

```
任务序列：

3-B-1  工具集实现
       src/agents/test-executor/tools/

       search-text.tool.ts：
         Tool: search_text(query, pageRange?, sampleContent)
         实现：遍历 pages，indexOf 搜索，返回上下文片段

       check-signature.tool.ts：
         Tool: check_signature(signerRole, sampleContent)
         实现：
           1. 在 parsedContent.signatures 中模糊匹配 signerRole
           2. 若匹配到且 isPresent=true → found: true
           3. 若无 AI 预解析结果，fallback: 在文本中搜索签名关键词

       extract-field.tool.ts：
         Tool: extract_field(fieldName, fieldType, sampleContent)
         fieldType: 'date' | 'amount' | 'text'
         实现：在对应的 dates/amounts 数组中查找

       compare-values.tool.ts：
         Tool: compare_values(value1, value2, tolerance?)
         实现：数值/日期/字符串比较，返回 matches/difference

       check-document-completeness.tool.ts：
         Tool: check_completeness(requiredFields, sampleContent)
         实现：检查必需字段列表是否全部存在

3-B-2  LangGraph 状态图
       src/agents/test-executor/graph.ts：

       State 定义（参考设计文档，补充细节）：
         interface ExecutorState {
           // 不可变输入
           step: TestStep
           sample: Sample
           parsedContent: SampleParsedContent

           // 可变执行状态
           executionPlan: string[]        ← Plan节点生成
           planStepIndex: number
           toolCallHistory: ToolCall[]    ← 每次工具调用记录
           maxToolCalls: number           ← 默认 10，防死循环

           // 输出
           finalResult: StepResultValue | null
           reasoning: string
           evidence: EvidenceItem[]
           confidence: number
           isComplete: boolean
         }

       节点 plan_node：
         输入：step + parsedContent
         LLM prompt：
           "基于步骤要求和文档摘要，列出3-5个检查动作"
         输出：executionPlan: string[]

       节点 execute_node：
         输入：当前 executionPlan[planStepIndex] + parsedContent
         LLM with tools（bindTools）
         执行工具调用
         输出：toolCallHistory 追加，planStepIndex+1

       节点 judge_node：
         输入：step.description + toolCallHistory（完整证据链）
         LLM prompt：
           "综合以上所有检查结果，判断步骤是否通过"
         输出：finalResult, reasoning, evidence, confidence

       边逻辑：
         START → plan_node
         plan_node → execute_node
         execute_node →
           if planStepIndex < executionPlan.length
             AND toolCallHistory.length < maxToolCalls:
             → execute_node（继续）
           else:
             → judge_node
         judge_node → END

       编译：
         graph.compile({
           checkpointer: new SqliteSaver(DB_PATH)
         })

3-B-3  单步执行入口
       src/agents/test-executor/index.ts：

         export async function executeStep(
           step: TestStep,
           sample: Sample,
           parsedContent: SampleParsedContent,
           jobId: ID
         ): Promise<{
           result: StepResultValue
           reasoning: string
           evidence: EvidenceItem[]
           confidence: number
         }>

           1. const graph = buildExecutorGraph()
           2. const threadId = `${sample.id}-${step.id}`
           3. result = await graph.invoke({
                step, sample, parsedContent,
                executionPlan: [], planStepIndex: 0,
                toolCallHistory: [], maxToolCalls: 10,
                finalResult: null, reasoning: '', evidence: [], confidence: 0,
                isComplete: false
              }, {
                configurable: { thread_id: threadId }
              })
           4. return {
                result: result.finalResult,
                reasoning: result.reasoning,
                evidence: result.evidence,
                confidence: result.confidence
              }

3-B-4  批量执行逻辑
       src/agents/test-executor/batch-executor.ts：

         export async function runTestExecutor(
           jobId: ID,
           taskId: ID,
           type: 'EXECUTE_STEP' | 'EXECUTE_ALL_STEPS'
         ):

           1. 加载 plan.steps + sampleSet.samples（含 parsedContent）

           2. 校验所有 sample.parsedContent 已就绪
              ← 未就绪的 → 先触发 parse，等待完成
              （或抛错要求先解析）

           3. 构建执行任务列表：
              tasks = [] （sample × step 的笛卡尔积）
              过滤：跳过已有非 PENDING 且非 HUMAN 的执行结果

           4. 进度计算：total = tasks.length

           5. 并发执行（p-limit，concurrency=3）：
              for each { sample, step } in tasks:
                try:
                  execResult = await executeStep(step, sample, parsedContent, jobId)

                  await prisma.stepExecution.upsert({
                    where: { sampleId_stepId: { sampleId, stepId } },
                    create: {
                      result: execResult.result,
                      executedBy: 'AI',
                      aiJobId: jobId,
                      aiReasoning: execResult.reasoning,
                      aiEvidence: JSON.stringify(execResult.evidence),
                      aiConfidence: execResult.confidence,
                      executedAt: now()
                    },
                    update: { ... }  ← 仅更新非人工覆盖的
                  })

                  if execResult.result === '×':
                    await createAnomalyFromExecution(stepExec, sample, step, taskId)

                  completed++
                  await aiJobService.updateProgress(
                    jobId,
                    Math.round(completed / total * 100),
                    `执行 样本${sample.no} × 步骤${step.index}...`
                  )

                catch err:
                  记录错误，不中断其他任务

           6. aiJobService.complete(jobId, 'TestTask', taskId)
           7. advanceTask(taskId, 'EXEC_REVIEW')

3-B-5  异常自动创建
       src/services/execution.service.ts 补充：

         async createAnomalyFromExecution(
           execution: StepExecution,
           sample: Sample,
           step: TestStep,
           taskId: ID
         ):
           findingNo = auto-increment within task
           prisma.anomalyRecord.upsert({
             where: { taskId_stepExecutionId },
             create: {
               taskId,
               stepExecutionId: execution.id,
               findingNo: String(nextNo),
               description: execution.aiReasoning || '待填写',
               stepNo: `步骤${step.index}`,
               sampleNo: String(sample.no),
               supportingDoc: '',     ← 待人工填写
               status: 'OPEN',
               createdBy: SYSTEM_USER_ID
             }
           })

       验收关键链路：
         完整执行 TestExecutorAgent：
         1. 上传包含"总经理签字"的 PDF
         2. 步骤描述："查看是否有总经理审批签字"
         3. AI 执行 → 应返回 ✓ + reasoning: "在第X页发现总经理签字"
         4. 上传缺少签字的 PDF
         5. 同一步骤 → 应返回 × + 自动创建 AnomalyRecord
```

---

### 3-C：前端执行矩阵 UI

```
任务序列：

3-C-1  ExecutionMatrix 组件
       apps/web/src/components/execution-matrix/

       ExecutionMatrix.tsx：
         props: taskId
         数据：useQuery(['executions', taskId]) → 矩阵结构

         布局：
           表头：样本序号 | 样本内容 | 步骤1标题 | 步骤2标题 | ... | 备注
           每行：样本数据 + 每步骤 ResultCell

       ResultCell.tsx：
         props: execution: StepExecution | null, stepId, sampleId, taskId
         显示：
           PENDING → 灰色「待执行」
           ✓ (AI) → 绿色 ✓ + AI置信度徽标
           × (AI) → 红色 × + AI置信度徽标 + 「查看问题」按钮
           N/A → 黄色 N/A
           人工覆盖 → 对应颜色 + 「人工」标记

         交互：
           点击结果 → 弹出 EvidenceDrawer
           右键/下拉 → 人工覆盖选择（✓/×/N/A）

3-C-2  EvidenceDrawer 组件
       显示 AI 执行详情：
         - AI 推理过程（reasoning）
         - 证据列表（evidence items）
         - 置信度进度条
         - 原始工具调用历史（可折叠）
         - 人工备注输入

3-C-3  批量执行按钮
       RunAllButton.tsx：
         onClick → POST /tasks/:id/executions/run-all
         触发后 → useTaskSocket 监听进度
         显示整体进度条（完成 x/total 步骤）

       验收：
         所有样本未执行 → 矩阵全灰
         点击「AI全量执行」→ 进度条推进
         执行完成 → 矩阵自动刷新，颜色更新
         点击某个单元格 → 查看 AI 证据与推理
         手动点击覆盖结果 → 单元格显示「人工」标记
```

---

## Phase 4 — 完整流程与归档

### 4-A：异常管理完善

```
任务序列：

4-A-1  AnomalyService
       src/services/anomaly.service.ts：

         list(taskId, userId): Promise<AnomalyRecord[]>

         create(data, userId): Promise<AnomalyRecord>
           ← 手动创建（补充 AI 未发现的异常）

         update(id, data, userId): Promise<AnomalyRecord>
           ← 允许修改：description, findingNo, supportingDoc, severity, status

         delete(id, userId): Promise<void>
           ← 仅 OPEN 状态可删除

         resolve(id, resolution, userId): Promise<AnomalyRecord>
           ← status = 'RESOLVED'

4-A-2  Anomaly 路由
       GET    /tasks/:id/anomalies
       POST   /tasks/:id/anomalies
       PUT    /tasks/:id/anomalies/:aid
       DELETE /tasks/:id/anomalies/:aid
       POST   /tasks/:id/anomalies/:aid/resolve

4-A-3  前端异常列表
       AnomaliesSection.tsx（在 PaperEditor 中已有）：
         从 GET /anomalies 加载
         内联编辑：findingNo, description, supportingDoc
         每行有「已解决」操作按钮
```

---

### 4-B：底稿审阅归档流程

```
任务序列：

4-B-1  完整审阅流程
       （PaperService 已有 submitForReview / approvePaper，此处补充细节）

         submitForReview 前置校验：
           ← 检查 samples.every(s => s.stepResults.every(r => r !== 'PENDING'))
           ← 不满足 → 400 '存在未执行的测试步骤'

         approvePaper 联动：
           ← 将 task.status 推进到 ARCHIVED
           ← 生成最终 Excel 文件并存储（快照附件）

4-B-2  归档列表页
       apps/web/src/pages/papers/

       PaperList.tsx：
         筛选：状态 / 时间范围 / 单位名称 / 底稿编号
         列：编号 | 业务场景 | 测试执行人 | 状态 | 完成日期 | 操作
         操作：查看详情 | 下载 Excel

       PaperDetail.tsx：
         显示完整底稿快照（只读）
         审阅人操作区：通过 / 退回
         下载历史导出记录

4-B-3  Dashboard
       apps/web/src/pages/dashboard/

       统计卡片：
         本月测试任务数 / 进行中 / 待审阅 / 已归档
         本月发现差异数

       任务状态分布图（简单饼图）
       最近任务列表（快速跳转）
       待我审阅项目列表（仅 REVIEWER 角色显示）
```

---

## 全链路集成测试计划

```
TC-001：完整正常路径（无差异场景）
─────────────────────────────────────────────────
步骤：
  1. 管理员登录 → 创建业务场景
  2. 上传规章制度 PDF → 触发解析 → 验证控制点提取
  3. 创建测试任务（关联场景+规章制度）
  4. 触发 AI 生成测试计划 → 人工审核通过
  5. 上传 2 份样本 PDF → 触发解析
  6. 触发 AI 全量执行
  7. 所有结果为 ✓
  8. 生成底稿 → 导出 Excel
  9. 提交审阅 → 审阅人登录 → 批准归档

期望结果：
  Excel 文件可正常打开
  testResult = '无差异'
  anomalies 为空行
  task.status = 'ARCHIVED'

TC-002：含差异场景
─────────────────────────────────────────────────
步骤：
  在 TC-001 基础上，第 6 步 AI 对样本2返回 ×
  验证：
    AnomalyRecord 自动创建
    底稿 testResult = '存在差异'
    §8 异常说明有内容
    Excel 第8节有填写

TC-003：人工覆盖 AI 结果
─────────────────────────────────────────────────
  AI 返回 × → 人工判断实为 ✓（有合理解释）
  PATCH /executions/:id { result: '✓', humanNote: '...' }
  验证：
    humanOverride = true
    execution.result = '✓'
    底稿该单元格显示 ✓

TC-004：断点续传
─────────────────────────────────────────────────
  AI 执行一半时强制杀死 worker 进程
  重启 worker
  BullMQ 重试机制恢复任务
  LangGraph Checkpointer 从中断点继续
  验证：最终结果完整，无重复执行
```

---

## 模块间依赖图

```
packages/shared
    ↑ (types)
    ├── packages/excel-generator
    ├── apps/api/src/services/
    └── apps/web/src/api/

apps/api 内部依赖链：
    routes → controllers → services → db/repositories
                                ↓
                           agents/ (AI层)
                                ↓
                    queue/worker (异步调度)
                                ↓
                    websocket/server (结果推送)

apps/web 内部依赖链：
    pages → components → hooks → api/
                                  ↓
                          React Query cache
                                  ↑
                          websocket (invalidate)
```

---

## 环境变量完整清单

```bash
# apps/api/.env

# ── 服务 ──────────────────────────────────────
PORT=3001
NODE_ENV=development

# ── 数据库 ────────────────────────────────────
DATABASE_URL="postgresql://icet:icet_password@localhost:5432/icet_db"

# ── Redis ─────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── MinIO ─────────────────────────────────────
STORAGE_ENDPOINT="localhost"
STORAGE_PORT=9000
STORAGE_USE_SSL=false
STORAGE_ACCESS_KEY="minioadmin"
STORAGE_SECRET_KEY="minioadmin"
STORAGE_BUCKET="icet-files"

# ── JWT ───────────────────────────────────────
JWT_SECRET="change-this-in-production-min-32-chars"
JWT_EXPIRES_IN="7d"

# ── CORS ──────────────────────────────────────
WEB_ORIGIN="http://localhost:5173"

# ── LLM ───────────────────────────────────────
OPENAI_API_KEY="sk-..."
LLM_MODEL="Qwen-2.5-VL"
LLM_TEMPERATURE=0
LLM_MAX_TOKENS=4096

# ── Agent ─────────────────────────────────────
AGENT_CONCURRENCY=3            # 并发执行步骤数
AGENT_MAX_TOOL_CALLS=10        # 单步最大工具调用次数
LANGGRAPH_CHECKPOINT_DB="./data/checkpoints.db"

# ── 系统用户（用于 AI 操作的系统身份） ──────
SYSTEM_USER_ID="00000000-0000-0000-0000-000000000001"
```