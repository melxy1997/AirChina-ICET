Phase 2 — AI 基础能力 实施计划                                                                                                                                                           │
                                                                                                                                                                                         │
Context                                                                                                                                                                                  │
                                                                                                                                                                                         │
Phase 0（工程基础）和 Phase 1（核心 CRUD）已完成。当前 web 手工测试流程可用。现在进入 Phase 2，搭建 AI 基础能力框架，包含消息队列、WebSocket 实时推送、SampleParserAgent 和              │
RegulationParserAgent。                                                                                                                                                                  │
                                                                                                                                                                                         │
每个逻辑模块对应一个 commit，形成清晰的历史记录（不写入 Co-Authored-By）。                                                                                                               │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
现状总结（调研结论）                                                                                                                                                                     │
                                                                                                                                                                                         │
已就绪                                                                                                                                                                                   │
┌─────────────────────────┬──────────────────────────────────────────────────────────────────┐                                                                                           │
│          组件           │                               状态                               │                                                                                           │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤                                                                                           │
│ Prisma AIJob 模型       │ ✅ 已定义并迁移                                                  │                                                                                           │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤                                                                                           │
│ packages/shared AI 类型 │ ✅ ExecutorState、AIJobType、AgentType 等全部定义                │                                                                                           │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤                                                                                           │
│ packages/shared 常量    │ ✅ AI_EXECUTION_CONCURRENCY=3、MAX_TOOL_CALLS=10、SYSTEM_USER_ID │                                                                                           │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤                                                                                           │
│ Redis 客户端            │ ✅ lib/redis.ts，已设 maxRetriesPerRequest: null（BullMQ 兼容）  │                                                                                           │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤                                                                                           │
│ socket.io 服务端        │ ✅ 已安装，websocket/server.ts 骨架存在                          │                                                                                           │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤                                                                                           │
│ ENV 变量                │ ✅ OPENAI_API_KEY、OPENAI_BASE_URL、LLM_MODEL 均已配置           │                                                                                           │
└─────────────────────────┴──────────────────────────────────────────────────────────────────┘                                                                                           │
待实现（Phase 2 全部缺口）                                                                                                                                                               │
┌──────────────────┬─────────────────────────────────────────────────────────────────────────────┐                                                                                       │
│       组件       │                                    状态                                     │                                                                                       │
├──────────────────┼─────────────────────────────────────────────────────────────────────────────┤                                                                                       │
│ BullMQ           │ ❌ 未安装、无 queue/ 目录                                                   │                                                                                       │
├──────────────────┼─────────────────────────────────────────────────────────────────────────────┤                                                                                       │
│ openai SDK       │ ❌ 未安装                                                                   │                                                                                       │
├──────────────────┼─────────────────────────────────────────────────────────────────────────────┤                                                                                       │
│ pdf-parse        │ ❌ 未安装                                                                   │                                                                                       │
├──────────────────┼─────────────────────────────────────────────────────────────────────────────┤                                                                                       │
│ socket.io-client │ ❌ web 端未安装                                                             │                                                                                       │
├──────────────────┼─────────────────────────────────────────────────────────────────────────────┤                                                                                       │
│ WebSocket 初始化 │ ❌ initWebSocket 从未调用；main.ts 用 app.listen() 而非 httpServer.listen() │                                                                                       │
├──────────────────┼─────────────────────────────────────────────────────────────────────────────┤                                                                                       │
│ AIJobService     │ ❌ 仅路由 stub，返回 "Not implemented yet"                                  │                                                                                       │
├──────────────────┼─────────────────────────────────────────────────────────────────────────────┤                                                                                       │
│ BullMQ Worker    │ ❌ 无 worker.ts                                                             │                                                                                       │
├──────────────────┼─────────────────────────────────────────────────────────────────────────────┤                                                                                       │
│ agents/ 目录     │ ❌ 完全不存在                                                               │                                                                                       │
├──────────────────┼─────────────────────────────────────────────────────────────────────────────┤                                                                                       │
│ 前端 socket hook │ ❌ 无 useTaskSocket                                                         │                                                                                       │
├──────────────────┼─────────────────────────────────────────────────────────────────────────────┤                                                                                       │
│ AI 进度组件      │ ❌ 无 AIJobMonitor                                                          │                                                                                       │
└──────────────────┴─────────────────────────────────────────────────────────────────────────────┘                                                                                       │
关键代码模式（需遵循）                                                                                                                                                                   │
                                                                                                                                                                                         │
- 错误：throw new AppError(statusCode, message, details?)                                                                                                                                │
- 路由包装：asyncHandler(async (req, res) => { ... })                                                                                                                                    │
- Service 导出：函数而非 class                                                                                                                                                           │
- 分页返回：{ data, total, page, pageSize, totalPages }                                                                                                                                  │
- WebSocket 广播：broadcast(taskId, event, data) → room task:${taskId}                                                                                                                   │
- 模块系统：ESM（"type": "module"），import 后缀用 .js                                                                                                                                   │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
架构决策                                                                                                                                                                                 │
┌───────────────────┬──────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────┐           │
│      决策点       │                               选择                               │                                        理由                                         │           │
├───────────────────┼──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤           │
│ LLM SDK           │ openai 直接调用                                                  │ Phase 2 只需简单 prompt→response 链，轻量无冗余；Phase 3 再引入 LangChain/LangGraph │           │
├───────────────────┼──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤           │
│ Worker 模式       │ 同进程                                                           │ 一个 pnpm dev 命令；共享 Prisma 和 Socket.IO 实例；生产时可独立拆分                 │           │
├───────────────────┼──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤           │
│ PDF 解析          │ pdf-parse，不做 OCR                                              │ 基础文本提取够用；OCR 留到后续 phase                                                │           │
├───────────────────┼──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤           │
│ WebSocket 房间    │ task 用 task:${taskId}，regulation 用 regulation:${regulationId} │ Regulation 是组织级资源，不属于某个 task                                            │           │
├───────────────────┼──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤           │
│ BullMQ Connection │ 复用 lib/redis.ts 的单例                                         │ 已有 maxRetriesPerRequest: null，直接传给 Queue 和 Worker                           │           │
├───────────────────┼──────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────┤           │
│ Worker Agent 加载 │ 动态 import                                                      │ 避免启动时加载全部 agent 代码，保持启动速度                                         │           │
└───────────────────┴──────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────┘           │
---                                                                                                                                                                                      │
实施计划（12 commits）                                                                                                                                                                   │
                                                                                                                                                                                         │
Commit 1 — 安装 Phase 2 依赖                                                                                                                                                             │
                                                                                                                                                                                         │
消息： feat(deps): install bullmq, openai, pdf-parse for Phase 2 AI infrastructure                                                                                                       │
                                                                                                                                                                                         │
pnpm --filter @icet/api add bullmq openai pdf-parse                                                                                                                                      │
pnpm --filter @icet/api add -D @types/pdf-parse                                                                                                                                          │
pnpm --filter @icet/web add socket.io-client                                                                                                                                             │
                                                                                                                                                                                         │
修改文件：apps/api/package.json、apps/web/package.json（pnpm 自动写入）                                                                                                                  │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 2 — BullMQ 队列定义 + AIJobService                                                                                                                                                │
                                                                                                                                                                                         │
消息： feat(api): add BullMQ queue definition and AIJobService                                                                                                                           │
                                                                                                                                                                                         │
新建：                                                                                                                                                                                   │
- apps/api/src/queue/ai-job.queue.ts                                                                                                                                                     │
                                                                                                                                                                                         │
import { Queue } from 'bullmq';                                                                                                                                                          │
import { redis } from '../lib/redis.js';                                                                                                                                                 │
                                                                                                                                                                                         │
export interface AIJobPayload {                                                                                                                                                          │
  jobId: string;                                                                                                                                                                         │
  type: string;                                                                                                                                                                          │
  entityId: string;                                                                                                                                                                      │
}                                                                                                                                                                                        │
                                                                                                                                                                                         │
export const aiJobQueue = new Queue<AIJobPayload>('ai-jobs', {                                                                                                                           │
  connection: redis,                                                                                                                                                                     │
  defaultJobOptions: {                                                                                                                                                                   │
    attempts: 3,                                                                                                                                                                         │
    backoff: { type: 'exponential', delay: 5000 },                                                                                                                                       │
    removeOnComplete: 100,                                                                                                                                                               │
    removeOnFail: 200,                                                                                                                                                                   │
  },                                                                                                                                                                                     │
});                                                                                                                                                                                      │
                                                                                                                                                                                         │
- apps/api/src/services/ai-job.service.ts                                                                                                                                                │
  - createJob(type, inputEntityType, inputEntityId, agentType) → 写 DB + 入队                                                                                                            │
  - updateProgress(jobId, progress, currentStep) → 更新 DB + broadcast()                                                                                                                 │
  - completeJob(jobId, outputEntityType, outputEntityId, tokensUsed?) → 更新 DB + broadcast                                                                                              │
  - failJob(jobId, error) → 更新 DB + broadcast                                                                                                                                          │
  - getJobById(jobId) → 查 DB                                                                                                                                                            │
  - cancelJob(jobId) → 更新 DB status=CANCELLED                                                                                                                                          │
                                                                                                                                                                                         │
修改：                                                                                                                                                                                   │
- apps/api/src/routes/ai.routes.ts — 替换两个 stub 为真实实现                                                                                                                            │
  - GET /:id → aiJobService.getJobById(id)                                                                                                                                               │
  - POST /:id/cancel → aiJobService.cancelJob(id)                                                                                                                                        │
                                                                                                                                                                                         │
broadcast 此时调用 io?.to(...) — WebSocket 还未初始化故 no-op，不影响编译                                                                                                                │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 3 — BullMQ Worker 骨架 + main.ts 启动                                                                                                                                             │
                                                                                                                                                                                         │
消息： feat(api): add BullMQ worker with job type dispatcher                                                                                                                             │
                                                                                                                                                                                         │
新建：                                                                                                                                                                                   │
- apps/api/src/queue/worker.ts                                                                                                                                                           │
  - 导出 startWorker(): Worker                                                                                                                                                           │
  - switch/case 按 type 分发（目前 PARSE_SAMPLE / PARSE_REGULATION 均 throw "not implemented"）                                                                                          │
  - catch 块调用 aiJobService.failJob() + 重新 throw                                                                                                                                     │
                                                                                                                                                                                         │
修改：                                                                                                                                                                                   │
- apps/api/src/main.ts                                                                                                                                                                   │
  - 启动后调用 startWorker()                                                                                                                                                             │
  - 打印 [ICET API] AI job worker started                                                                                                                                                │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 4 — 修复 WebSocket 初始化                                                                                                                                                         │
                                                                                                                                                                                         │
消息： feat(api): initialize Socket.IO with HTTP server for real-time AI progress events                                                                                                 │
                                                                                                                                                                                         │
修改：                                                                                                                                                                                   │
- apps/api/src/websocket/server.ts — 完整重写                                                                                                                                            │
  - 改为 ESM 静态 import（去掉 require()）                                                                                                                                               │
  - 添加 broadcastRegulation(regulationId, event, data) 函数（regulation 房间）                                                                                                          │
  - 添加 regulation:join / regulation:leave socket 事件处理                                                                                                                              │
- apps/api/src/main.ts                                                                                                                                                                   │
  - import { createServer } from 'node:http'                                                                                                                                             │
  - const httpServer = createServer(app)                                                                                                                                                 │
  - initWebSocket(httpServer)                                                                                                                                                            │
  - httpServer.listen(PORT, ...) 替换 app.listen(PORT, ...)                                                                                                                              │
- apps/api/src/app.ts                                                                                                                                                                    │
  - 删除已无用的 createHttpServer 导入和重导出                                                                                                                                           │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 5 — 前端 socket.io-client + useTaskSocket                                                                                                                                         │
                                                                                                                                                                                         │
消息： feat(web): add socket.io-client singleton and useTaskSocket hook                                                                                                                  │
                                                                                                                                                                                         │
新建：                                                                                                                                                                                   │
- apps/web/src/lib/socket.ts — Socket 单例管理，getSocket() / disconnectSocket()                                                                                                         │
- apps/web/src/hooks/useTaskSocket.ts                                                                                                                                                    │
  - useEffect 中 join/leave task 房间                                                                                                                                                    │
  - 监听 ai_job.progress → queryClient.setQueryData(['ai-job', jobId], ...)                                                                                                              │
  - 监听 ai_job.completed → invalidate task + samples query                                                                                                                              │
  - 监听 ai_job.failed → invalidate ai-job query                                                                                                                                         │
  - 监听 task.status_changed → invalidate task query                                                                                                                                     │
                                                                                                                                                                                         │
修改：                                                                                                                                                                                   │
- apps/web/vite.config.ts — 添加 /socket.io WebSocket 代理                                                                                                                               │
                                                                                                                                                                                         │
proxy: {                                                                                                                                                                                 │
  '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },                                                                                                                       │
  '/socket.io': { target: 'ws://127.0.0.1:3000', ws: true },                                                                                                                             │
},                                                                                                                                                                                       │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 6 — AIJobMonitor 组件 + TaskDetailPage 接入                                                                                                                                       │
                                                                                                                                                                                         │
消息： feat(web): add AIJobMonitor component and wire useTaskSocket into TaskDetailPage                                                                                                  │
                                                                                                                                                                                         │
新建：                                                                                                                                                                                   │
- apps/web/src/components/AIJobMonitor.tsx                                                                                                                                               │
  - props: jobId: string; onComplete?: () => void; onFail?: (err: string) => void                                                                                                        │
  - 展示：进度条（0-100%）+ currentStep 文字 + 状态标识                                                                                                                                  │
  - 通过 useQuery(['ai-job', jobId]) 读状态（由 socket 实时更新）                                                                                                                        │
                                                                                                                                                                                         │
修改：                                                                                                                                                                                   │
- apps/web/src/lib/hooks.ts — 添加 useAIJob(jobId) query hook                                                                                                                            │
- apps/web/src/pages/TaskDetailPage.tsx — 顶层加一行 useTaskSocket(id)                                                                                                                   │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 7 — OpenAI 客户端封装                                                                                                                                                             │
                                                                                                                                                                                         │
消息： feat(api): add OpenAI client wrapper and structured JSON extraction utility                                                                                                       │
                                                                                                                                                                                         │
新建：                                                                                                                                                                                   │
- apps/api/src/lib/llm.ts                                                                                                                                                                │
  - getOpenAIClient() — 单例 OpenAI 实例（读 env 配置）                                                                                                                                  │
  - callLLM({ system, user, model?, temperature?, maxTokens?, jsonMode? }) → { content, tokensUsed }                                                                                     │
      - jsonMode=true 时传 response_format: { type: 'json_object' }                                                                                                                      │
  - extractJSON<T>(text) — 剥除 markdown 代码块后 JSON.parse                                                                                                                             │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 8 — PDF 文本提取工具                                                                                                                                                              │
                                                                                                                                                                                         │
消息： feat(api): add PDF text extraction utility using pdf-parse                                                                                                                        │
                                                                                                                                                                                         │
新建：                                                                                                                                                                                   │
- apps/api/src/agents/tools/pdf-extractor.ts                                                                                                                                             │
  - extractPdfText(buffer: Buffer): Promise<PageContent[]> — 按 \f 分页                                                                                                                  │
  - extractPdfFullText(buffer: Buffer): Promise<string> — 返回全文                                                                                                                       │
                                                                                                                                                                                         │
建立 agents/ 目录树第一个文件                                                                                                                                                            │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 9 — SampleParserAgent                                                                                                                                                             │
                                                                                                                                                                                         │
消息： feat(api): implement SampleParserAgent for structured PDF sample parsing                                                                                                          │
                                                                                                                                                                                         │
新建：                                                                                                                                                                                   │
- apps/api/src/agents/sample-parser/prompts.ts — 中文提取 prompt，要求输出 {signatures, dates, amounts, structureSummary, summary} JSON                                                  │
- apps/api/src/agents/sample-parser/index.ts — runSampleParser(jobId, sampleId)                                                                                                          │
  a. 加载 Sample + fileRefs（通过 getFileStream）                                                                                                                                        │
  b. extractPdfText 每个文件，合并 allPages                                                                                                                                              │
  c. callLLM(EXTRACTION_PROMPT, fullText, jsonMode:true)                                                                                                                                 │
  d. 组装 SampleParsedContent 对象（含 pages / parsedAt）                                                                                                                                │
  e. prisma.sample.update({ parsedContent })                                                                                                                                             │
  f. aiJobService.completeJob()                                                                                                                                                          │
                                                                                                                                                                                         │
修改：                                                                                                                                                                                   │
- apps/api/src/queue/worker.ts — PARSE_SAMPLE case：await import('../agents/sample-parser/index.js') → runSampleParser                                                                   │
- apps/api/src/routes/samples.routes.ts — 新增端点：                                                                                                                                     │
                                                                                                                                                                                         │
POST /tasks/:id/samples/:sid/parse                                                                                                                                                       │
  → aiJobService.createJob('PARSE_SAMPLE', 'Sample', sampleId, 'SAMPLE_PARSER')                                                                                                          │
  → res.status(202).json({ jobId })                                                                                                                                                      │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 10 — RegulationParserAgent                                                                                                                                                        │
                                                                                                                                                                                         │
消息： feat(api): implement RegulationParserAgent for control point extraction                                                                                                           │
                                                                                                                                                                                         │
新建：                                                                                                                                                                                   │
- apps/api/src/agents/regulation-parser/prompts.ts — 中文控制点提取 prompt，输出 ControlPoint[] JSON 数组                                                                                │
- apps/api/src/agents/regulation-parser/index.ts — runRegulationParser(jobId, regulationId)                                                                                              │
  a. 加载 Regulation + fileRef，getFileStream                                                                                                                                            │
  b. extractPdfText → 按 ~8000 字符分批                                                                                                                                                  │
  c. 每批 callLLM(CONTROL_POINT_PROMPT, batch, jsonMode:true)，累积控制点                                                                                                                │
  d. deduplicateControls（按 controlId 去重）                                                                                                                                            │
  e. 事务：deleteMany 旧控制点 → createMany 新控制点 → 更新 parseStatus=COMPLETED                                                                                                        │
  f. aiJobService.completeJob()                                                                                                                                                          │
                                                                                                                                                                                         │
修改：                                                                                                                                                                                   │
- apps/api/src/queue/worker.ts — PARSE_REGULATION case：动态 import → runRegulationParser                                                                                                │
- apps/api/src/routes/regulations.routes.ts — 新增端点：                                                                                                                                 │
                                                                                                                                                                                         │
POST /regulations/:id/parse                                                                                                                                                              │
  → aiJobService.createJob('PARSE_REGULATION', 'Regulation', regulationId, 'REGULATION_PARSER')                                                                                          │
  → res.status(202).json({ jobId })                                                                                                                                                      │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 11 — 前端解析触发 UI                                                                                                                                                              │
                                                                                                                                                                                         │
消息： feat(web): add parse trigger buttons and AI progress display for regulations and samples                                                                                          │
                                                                                                                                                                                         │
修改：                                                                                                                                                                                   │
- apps/web/src/lib/hooks.ts — 新增：                                                                                                                                                     │
  - useAIJob(jobId) query hook（GET /ai-jobs/:id）                                                                                                                                       │
  - useParseRegulation() mutation → POST /regulations/:id/parse                                                                                                                          │
  - useParseSample() mutation → POST /tasks/:id/samples/:sid/parse                                                                                                                       │
- apps/web/src/pages/RegulationListPage.tsx                                                                                                                                              │
  - 每行添加「解析」按钮（parseStatus 非 COMPLETED 时显示）                                                                                                                              │
  - 点击后显示 <AIJobMonitor jobId={jobId} />                                                                                                                                            │
- apps/web/src/pages/TaskDetailPage.tsx SamplesPanel                                                                                                                                     │
  - 每个样本添加「AI 解析」按钮                                                                                                                                                          │
  - 点击后显示 <AIJobMonitor jobId={jobId} />                                                                                                                                            │
  - 解析完成后样本行显示「已解析」标识                                                                                                                                                   │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
Commit 12 — shared WebSocket 事件类型 + 收尾                                                                                                                                             │
                                                                                                                                                                                         │
消息： feat(shared): add WebSocket event types and finalize Phase 2 integration                                                                                                          │
                                                                                                                                                                                         │
新建：                                                                                                                                                                                   │
- packages/shared/src/types/ws-events.ts — AIJobProgressEvent、AIJobCompletedEvent、AIJobFailedEvent、TaskStatusChangedEvent、WSEventMap                                                 │
                                                                                                                                                                                         │
修改：                                                                                                                                                                                   │
- packages/shared/src/types/index.ts — re-export ws-events                                                                                                                               │
- apps/web/src/lib/api-types.ts — 新增 AIJobView 接口                                                                                                                                    │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
文件变更总览                                                                                                                                                                             │
                                                                                                                                                                                         │
apps/api/src/                                                                                                                                                                            │
├── agents/                              [全部新建]                                                                                                                                      │
│   ├── tools/pdf-extractor.ts           Commit 8                                                                                                                                        │
│   ├── sample-parser/                                                                                                                                                                   │
│   │   ├── index.ts                     Commit 9                                                                                                                                        │
│   │   └── prompts.ts                   Commit 9                                                                                                                                        │
│   └── regulation-parser/                                                                                                                                                               │
│       ├── index.ts                     Commit 10                                                                                                                                       │
│       └── prompts.ts                   Commit 10                                                                                                                                       │
├── lib/                                                                                                                                                                                 │
│   └── llm.ts                           Commit 7  [新建]                                                                                                                                │
├── queue/                                                                                                                                                                               │
│   ├── ai-job.queue.ts                  Commit 2  [新建]                                                                                                                                │
│   └── worker.ts                        Commit 3  [新建], 修改于 9、10                                                                                                                  │
├── services/                                                                                                                                                                            │
│   └── ai-job.service.ts               Commit 2  [新建], 修改于 4                                                                                                                       │
├── routes/                                                                                                                                                                              │
│   ├── ai.routes.ts                     Commit 2  [修改]                                                                                                                                │
│   ├── samples.routes.ts                Commit 9  [修改]                                                                                                                                │
│   └── regulations.routes.ts            Commit 10 [修改]                                                                                                                                │
├── websocket/server.ts                  Commit 4  [重写]                                                                                                                                │
├── main.ts                              Commit 3、4 [修改]                                                                                                                              │
└── app.ts                               Commit 4  [修改]                                                                                                                                │
                                                                                                                                                                                         │
apps/web/src/                                                                                                                                                                            │
├── components/AIJobMonitor.tsx          Commit 6  [新建]                                                                                                                                │
├── hooks/                                                                                                                                                                               │
│   ├── useTaskSocket.ts                 Commit 5  [新建]                                                                                                                                │
│   └── useAIJob.ts                      Commit 6  [新建]                                                                                                                                │
├── lib/                                                                                                                                                                                 │
│   ├── socket.ts                        Commit 5  [新建]                                                                                                                                │
│   ├── hooks.ts                         Commit 6、11 [修改]                                                                                                                             │
│   └── api-types.ts                     Commit 12 [修改]                                                                                                                                │
├── pages/                                                                                                                                                                               │
│   ├── RegulationListPage.tsx           Commit 11 [修改]                                                                                                                                │
│   └── TaskDetailPage.tsx              Commit 6、11 [修改]                                                                                                                              │
└── vite.config.ts                       Commit 5  [修改]                                                                                                                                │
                                                                                                                                                                                         │
packages/shared/src/types/                                                                                                                                                               │
├── ws-events.ts                         Commit 12 [新建]                                                                                                                                │
└── index.ts                             Commit 12 [修改]                                                                                                                                │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
依赖安装汇总                                                                                                                                                                             │
┌────────┬────────────────────────┬──────────┬──────────┐                                                                                                                                │
│ Commit │           包           │   位置   │ 是否已装 │                                                                                                                                │
├────────┼────────────────────────┼──────────┼──────────┤                                                                                                                                │
│ 1      │ bullmq                 │ apps/api │ ❌       │                                                                                                                                │
├────────┼────────────────────────┼──────────┼──────────┤                                                                                                                                │
│ 1      │ openai                 │ apps/api │ ❌       │                                                                                                                                │
├────────┼────────────────────────┼──────────┼──────────┤                                                                                                                                │
│ 1      │ pdf-parse              │ apps/api │ ❌       │                                                                                                                                │
├────────┼────────────────────────┼──────────┼──────────┤                                                                                                                                │
│ 1      │ @types/pdf-parse (dev) │ apps/api │ ❌       │                                                                                                                                │
├────────┼────────────────────────┼──────────┼──────────┤                                                                                                                                │
│ 5      │ socket.io-client       │ apps/web │ ❌       │                                                                                                                                │
├────────┼────────────────────────┼──────────┼──────────┤                                                                                                                                │
│ —      │ socket.io              │ apps/api │ ✅ 已装  │                                                                                                                                │
├────────┼────────────────────────┼──────────┼──────────┤                                                                                                                                │
│ —      │ ioredis                │ apps/api │ ✅ 已装  │                                                                                                                                │
└────────┴────────────────────────┴──────────┴──────────┘                                                                                                                                │
---                                                                                                                                                                                      │
数据流示意                                                                                                                                                                               │
                                                                                                                                                                                         │
[前端] RegulationListPage                                                                                                                                                                │
  点击「解析」→ POST /regulations/:id/parse                                                                                                                                              │
                    ├── aiJobService.createJob()  →  ai_jobs 表 (QUEUED)                                                                                                                 │
                    └── aiJobQueue.add(payload)   →  Redis BullMQ                                                                                                                        │
                                                                                                                                                                                         │
[Worker] 拾取 job                                                                                                                                                                        │
  runRegulationParser(jobId, regulationId)                                                                                                                                               │
    ├── getFileStream() → S3 PDF buffer                                                                                                                                                  │
    ├── extractPdfText(buffer) → PageContent[]                                                                                                                                           │
    ├── callLLM(batches) → ControlPoint[]                                                                                                                                                │
    ├── prisma 事务写入 control_points                                                                                                                                                   │
    └── aiJobService.completeJob()                                                                                                                                                       │
          └── broadcast('regulation:${id}', 'ai_job.completed', ...)                                                                                                                     │
                └── io.to(room).emit(...)                                                                                                                                                │
                                                                                                                                                                                         │
[前端] useTaskSocket / useRegulationSocket                                                                                                                                               │
  监听 ai_job.progress → setQueryData(['ai-job', jobId])                                                                                                                                 │
  监听 ai_job.completed → invalidateQueries(['regulations'])                                                                                                                             │
  → AIJobMonitor 进度条自动更新至 100%，regulation 行刷新控制点数量                                                                                                                      │
                                                                                                                                                                                         │
---                                                                                                                                                                                      │
验证方法                                                                                                                                                                                 │
                                                                                                                                                                                         │
1. 队列基础：手动向 aiJobQueue 入队一条 job，验证 Worker 接收、AIJob DB 状态从 QUEUED → RUNNING                                                                                          │
2. WebSocket：打开 TaskDetailPage，Network 面板看到 101 Switching Protocols 到 /socket.io/                                                                                               │
3. Regulation 解析：上传一份包含 C1/C2 编号的规章 PDF，点击解析，等待完成后 GET /regulations/:id 返回 controlPoints 已填充                                                               │
4. Sample 解析：上传一份签字 PDF，触发解析，sample.parsedContent 中含 signatures[]                                                                                                       │
5. 实时推送：在 TaskDetailPage 触发解析，前端进度条从 0% 推进到 100%，无需手动刷新      