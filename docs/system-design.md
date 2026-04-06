# 自动化内部控制评价测试系统 — 完整设计文档
## 文档目录
1. [系统概述](#1-系统概述)
2. [业务流程分析](#2-业务流程分析)
3. [数据建模文档](#3-数据建模文档)
4. [系统架构设计](#4-系统架构设计)
5. [详细设计文档](#5-详细设计文档)
6. [AI Agent 设计](#6-ai-agent-设计)
7. [项目工程规划](#7-项目工程规划)
# 1. 系统概述
## 1.1 系统定位
**ICET（Internal Control Evaluation Testing）系统** — 一套将内部控制评价测试流程从人工操作自动化的全栈智能系统。
```
┌─────────────────────────────────────────────────────────────────────┐
│                         系统价值链                                    │
│                                                                     │
│  人工耗时 ──────────────────────────────────────────► 自动化程度      │
│                                                                     │
│  ① 查阅规章制度   ──► AI解析PDF → 提取控制点 + 测试逻辑              │
│  ② 设计测试步骤   ──► AI生成测试计划 → 人工审核确认                   │
│  ③ 准备测试材料   ──► 上传PDF → AI解析样本内容                        │
│  ④ 执行测试步骤   ──► AI Agent逐步骤检查每份样本                      │
│  ⑤ 记录测试结果   ──► 自动填写底稿 → 人工复核异常                     │
│  ⑥ 归档底稿       ──► 自动生成Excel → 归档管理                       │
└─────────────────────────────────────────────────────────────────────┘
```
## 1.2 核心用户角色
| 角色 | 职责 | 主要操作 |
|------|------|----------|
| **测试执行人** | 日常测试操作 | 创建测试任务、上传材料、触发AI、复核结果 |
| **测试审阅人** | 质量把关 | 审阅底稿、批准归档、标注问题 |
| **系统管理员** | 配置维护 | 管理业务场景、规章制度库、用户权限 |

# 2. 业务流程分析
## 2.1 完整业务流程图
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        内部控制评价测试完整流程                               │
└─────────────────────────────────────────────────────────────────────────────┘
  阶段一：准备        阶段二：计划         阶段三：执行         阶段四：归档
  ────────────       ────────────        ────────────        ────────────
  选择业务场景          解析规章制度          执行测试步骤          生成工作底稿
      │                    │                    │                    │
      ▼                    ▼                    ▼                    ▼
  ┌────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
  │Business│          │Regulation│          │ Sample  │          │ Working │
  │Scenario│──选择──► │  PDF    │──AI解析──►│Material │──AI检查──►│  Paper  │
  │        │          │         │           │  PDF    │           │  Excel  │
  └────────┘          └─────────┘          └─────────┘          └─────────┘
      │                    │                    │                    │
      │               提取控制点            逐步骤检查            人工复核异常
      │               生成测试计划          记录✓/×/N/A           批准归档
      │                    │                    │
      ▼                    ▼                    ▼
  上传测试材料         人工审核步骤         AI自动填写结果
  (PDF/图片)          确认/修改            或人工覆盖
```
## 2.2 关键业务概念拆解
### 业务场景（Business Scenario）
- 代表一个具体的业务领域，如"餐食采购"、"账单审核与付款"
- 对应一套规章制度文件
- 对应固定的流程层级（一/二/三级）
### 规章制度（Regulation）
- PDF文档，描述该业务场景的控制点（C1、C2...）
- 每个控制点说明：何人、何时、做何事、如何审批
- AI需要从中提取：控制编号、控制描述、对应的测试逻辑
### 测试计划（Test Plan）
- 基于规章制度生成的结构化测试方案
- 包含：测试步骤列表、每步骤的检查逻辑、预期证据
### 测试材料样本（Sample Material）
- 每次测试的实际材料，如"采购计划PDF"、"付款申请单PDF"
- 每份材料对应一个样本序号
- AI需要从中提取/验证：签名、日期、金额、审批链等信息
### 测试工作底稿（Working Paper）
- 最终产物，标准格式Excel
- 记录：哪些样本通过了哪些步骤的检查
# 3. 数据建模文档
## 3.1 实体关系总览
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              ER 关系图                                        │
│                                                                              │
│  Organization ──1:N──► User                                                  │
│       │                                                                      │
│       └──1:N──► BusinessScenario ──1:N──► Regulation                         │
│                       │                       │                              │
│                       └──1:N──► TestTask ◄─────┘ (使用)                      │
│                                    │                                         │
│                          ┌─────────┼──────────┐                              │
│                          ▼         ▼           ▼                             │
│                      TestPlan  SampleSet   WorkingPaper                      │
│                          │         │           │                             │
│                          │    ┌────┘           │                             │
│                          ▼    ▼                ▼                             │
│                       TestStep  Sample    PaperRecord                        │
│                          │         │           │                             │
│                          └────┬────┘           │                             │
│                               ▼                │                             │
│                          StepExecution ────────┘ (汇总)                      │
│                               │                                              │
│                               ▼                                              │
│                          AnomalyRecord                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```
## 3.2 完整 TypeScript 数据模型
```typescript
// ===
//  FILE: packages/shared/src/types/index.ts
//  完整业务数据模型
// ===
// ───
//  §0  基础类型与枚举
// ───
/** 通用ID类型（UUID v4） */
type ID = string;
/** ISO 8601 时间戳字符串 */
type Timestamp = string;
/** 步骤执行结果 */
type StepResultValue = '✓' | '×' | 'N/A' | 'PENDING';
/** 测试任务整体状态机 */
type TaskStatus =
  | 'DRAFT'           // 草稿：刚创建，未开始
  | 'PLANNING'        // 规划中：AI正在解析规章制度
  | 'PLAN_REVIEW'     // 计划审核：等待人工确认测试步骤
  | 'EXECUTING'       // 执行中：AI/人工正在逐样本测试
  | 'EXEC_REVIEW'     // 结果审核：等待人工复核AI结果
  | 'PAPER_DRAFT'     // 底稿草稿：可编辑工作底稿
  | 'PAPER_REVIEW'    // 底稿审阅：提交给审阅人
  | 'ARCHIVED'        // 已归档：流程完成
  | 'CANCELLED';      // 已取消
/** AI处理任务状态 */
type AIJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
/** 文件类型 */
type FileType = 'PDF' | 'IMAGE' | 'EXCEL' | 'WORD' | 'OTHER';
/** 抽样方法 */
type SamplingMethod = '随机抽样' | '系统抽样' | '判断抽样' | '全量检查';
/** 用户角色 */
type UserRole = 'ADMIN' | 'TESTER' | 'REVIEWER' | 'VIEWER';
// ───
//  §1  组织与用户
// ───
/** 组织（公司/部门） */
interface Organization {
  id: ID;
  name: string;                 // 组织名称，如"大连航空有限责任公司"
  code: string;                 // 组织编码
  parentId?: ID;                // 支持树形组织结构
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
/** 系统用户 */
interface User {
  id: ID;
  organizationId: ID;
  name: string;                 // 姓名
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
// ───
//  §2  业务场景（Business Scenario）
// ───
/**
 * 业务场景
 * 代表一个业务领域，如"采购与资产管理-餐食采购"
 * 一个场景可以有多次测试任务（不同年度/期间）
 */
interface BusinessScenario {
  id: ID;
  organizationId: ID;
  // 流程层级（对应Excel中流程名称区域）
  processLevel1: string;        // 一级流程: "采购与资产管理"
  processLevel2: string;        // 二级流程: "餐食、机上供应品"
  processLevel3?: string;       // 三级流程: "NA" 或具体名称
  name: string;                 // 场景名称（显示用，通常=一级+二级）
  description?: string;         // 场景描述
  isActive: boolean;
  // 关联的规章制度（可多个）
  regulationIds: ID[];
  createdBy: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
// ───
//  §3  规章制度（Regulation）
// ───
/**
 * 规章制度文件
 * 上传的PDF，AI从中解析控制点
 */
interface Regulation {
  id: ID;
  organizationId: ID;
  title: string;                // 文件标题
  version: string;              // 版本号
  effectiveDate?: string;       // 生效日期
  expiryDate?: string;          // 失效日期
  // 文件存储信息
  fileRef: FileReference;
  // AI解析结果
  parseStatus: AIJobStatus;
  parsedAt?: Timestamp;
  extractedControls: ControlPoint[];   // AI提取的控制点列表
  rawParseResult?: string;             // AI原始输出（JSON字符串）
  createdBy: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
/**
 * 控制点（从规章制度中提取）
 * 每个控制点描述一个需要被测试的内部控制机制
 */
interface ControlPoint {
  id: ID;
  regulationId: ID;
  controlId: string;            // 控制编号，如 "C1", "C2", "C9"
  title: string;                // 控制点标题，如"采购预算的编制"
  description: string;          // 详细描述（富文本）
  // AI提取的结构化信息
  responsible?: string;         // 责任人/岗位
  timing?: string;              // 执行时机/频率
  approvalChain?: string[];     // 审批链
  // AI建议的测试思路
  suggestedTestObjective?: string;    // 测试目标
  suggestedTestSteps?: string[];      // 建议测试步骤
  suggestedEvidenceTypes?: string[];  // 预期证据类型
  confidence: number;           // AI提取置信度 0-1
  pageReferences?: number[];    // 来源页码
  createdAt: Timestamp;
}
// ───
//  §4  文件系统
// ───
/** 文件引用（存储在对象存储/本地文件系统） */
interface FileReference {
  id: ID;
  originalName: string;         // 原始文件名
  storagePath: string;          // 存储路径或URL
  fileType: FileType;
  mimeType: string;
  sizeBytes: number;
  checksum: string;             // MD5/SHA256，用于去重
  // PDF专属
  pageCount?: number;
  uploadedBy: ID;
  uploadedAt: Timestamp;
}
// ───
//  §5  测试任务（TestTask）— 核心聚合根
// ───
/**
 * 测试任务
 * 一次完整的内部控制评价测试的执行单元
 * 对应最终产出的一份工作底稿
 */
interface TestTask {
  id: ID;
  organizationId: ID;
  scenarioId: ID;
  // ── 底稿基础信息（对应Excel头部区域）──
  paperId: string;              // 测试底稿编号，如 "机供品TOC-01"
  unitName: string;             // 测试单位名称
  testerId: ID;                 // 测试执行人
  reviewerId?: ID;              // 测试审阅人
  completionDate?: string;      // 完成日期
  // ── 任务状态 ──
  status: TaskStatus;
  statusHistory: TaskStatusRecord[];
  // ── 规章制度引用 ──
  regulationIds: ID[];          // 本次测试使用的规章制度
  // ── 抽样设置 ──
  sampling: SamplingConfig;
  // ── 关联子实体（通过ID关联，不内嵌） ──
  testPlanId?: ID;              // 测试计划
  sampleSetId?: ID;             // 样本集
  // ── 最终工作底稿 ──
  workingPaperId?: ID;
  createdBy: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
/** 任务状态变更记录 */
interface TaskStatusRecord {
  status: TaskStatus;
  changedBy: ID;
  changedAt: Timestamp;
  comment?: string;
}
/** 抽样配置 */
interface SamplingConfig {
  method: SamplingMethod;
  period: string;               // 抽样期间描述
  sampleSource: string;         // 样本来源描述
  // sampleCount 由 SampleSet.samples.length 动态计算
}
// ───
//  §6  测试计划（TestPlan）
// ───
/**
 * 测试计划
 * 由AI基于规章制度生成，人工审核后执行
 */
interface TestPlan {
  id: ID;
  taskId: ID;
  // 控制点描述（对应Excel §4，富文本）
  controlDescription: string;
  // 关联的控制编号（对应Excel §5）
  controlIds: string[];         // ["C1","C2"]
  // 测试步骤列表（对应Excel §6）
  steps: TestStep[];
  // AI生成信息
  generatedBy: 'AI' | 'HUMAN';
  aiJobId?: ID;
  generatedAt: Timestamp;
  // 审核信息
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
  reviewedBy?: ID;
  reviewedAt?: Timestamp;
  reviewComment?: string;
  // 版本（人工修改后版本号递增）
  version: number;
  previousVersionId?: ID;
}
/**
 * 测试步骤
 * 描述针对每份样本需要执行的一个检查动作
 */
interface TestStep {
  id: ID;
  planId: ID;
  index: number;                // 步骤序号（1-based，对应"步骤1"）
  description: string;          // 步骤描述，如"查看是否经总经理审批签字"
  // AI执行配置
  executionConfig: StepExecutionConfig;
}
/**
 * 步骤执行配置
 * 告诉AI Agent如何检查这个步骤
 */
interface StepExecutionConfig {
  checkType: StepCheckType;
  // 签名检查配置
  signatureCheck?: {
    requiredSigners: string[];  // 必须签名的角色，如["总经理","财务部长"]
    signatureFieldHints: string[]; // 签名位置提示
  };
  // 关键词/内容检查配置
  contentCheck?: {
    requiredKeywords?: string[];
    forbiddenKeywords?: string[];
    patternMatch?: string;      // 正则表达式
  };
  // 日期检查配置
  dateCheck?: {
    fieldName: string;          // 日期字段名
    rangeDescription?: string;  // 日期范围描述
  };
  // 金额/数值检查配置
  amountCheck?: {
    fieldName: string;
    tolerance?: number;
  };
  // 自由文本检查（通用AI判断）
  freeFormCheck?: {
    prompt: string;             // 给AI的具体指令
    expectedEvidence: string;   // 期望找到的证据描述
  };
}
/** 步骤检查类型 */
type StepCheckType =
  | 'SIGNATURE_PRESENCE'   // 检查签名是否存在
  | 'SIGNATURE_CHAIN'      // 检查完整审批链
  | 'CONTENT_EXISTENCE'    // 检查内容是否存在
  | 'CONTENT_MATCH'        // 检查内容是否匹配规则
  | 'DATE_VALIDITY'        // 检查日期合法性
  | 'AMOUNT_MATCH'         // 检查金额匹配
  | 'DOCUMENT_COMPLETENESS'// 检查文档完整性
  | 'FREE_FORM_AI';        // 自由AI判断
// ───
//  §7  样本集（SampleSet）与样本（Sample）
// ───
/**
 * 样本集
 * 一次测试任务的所有测试材料的集合
 */
interface SampleSet {
  id: ID;
  taskId: ID;
  samples: Sample[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
/**
 * 单个测试样本
 * 对应Excel §7 中的一行
 */
interface Sample {
  id: ID;
  sampleSetId: ID;
  no: number;                   // 样本序号（1, 2, 3...）
  content: string;              // 样本内容描述，如"2025年机供品采购计划"
  // 关联的文件（可多个，一个样本可能有多份材料）
  fileRefs: FileReference[];
  // AI解析结果（对材料内容的结构化理解）
  parsedContent?: SampleParsedContent;
  // 该样本所有步骤的执行结果
  stepExecutions: StepExecution[];
  // 样本级备注
  remark?: string;
  addedBy: ID;
  addedAt: Timestamp;
}
/**
 * AI对样本材料的结构化解析结果
 * 提前解析，供各步骤执行时复用
 */
interface SampleParsedContent {
  // 检测到的签名信息
  signatures: DetectedSignature[];
  // 检测到的日期
  dates: DetectedDate[];
  // 检测到的金额
  amounts: DetectedAmount[];
  // 文档结构摘要
  structureSummary: string;
  // 原始提取的文本（按页）
  pages: PageContent[];
  // 整体摘要（AI生成）
  summary: string;
  parsedAt: Timestamp;
  parserVersion: string;
}
interface DetectedSignature {
  signerHint: string;           // 推断的签名人身份，如"总经理"
  location: PageLocation;       // 签名位置
  confidence: number;
  isPresent: boolean;
}
interface DetectedDate {
  value: string;                // 日期字符串
  fieldContext: string;         // 上下文，如"审批日期"
  location: PageLocation;
}
interface DetectedAmount {
  value: number;
  currency: string;
  fieldContext: string;
  location: PageLocation;
}
interface PageLocation {
  page: number;
  x?: number; y?: number;       // 坐标（像素）
  width?: number; height?: number;
}
interface PageContent {
  pageNumber: number;
  text: string;                 // OCR/提取的文本
  imageUrl?: string;            // 页面截图URL（用于展示）
}
// ───
//  §8  步骤执行记录（StepExecution）
// ───
/**
 * 步骤执行记录
 * 某个样本在某个测试步骤上的执行结果
 * 对应Excel §7 中 sample行 × 步骤列 的交叉单元格
 */
interface StepExecution {
  id: ID;
  sampleId: ID;
  stepId: ID;                   // 关联 TestStep.id
  // ── 执行结果 ──
  result: StepResultValue;
  // ── AI执行信息 ──
  executedBy: 'AI' | 'HUMAN';
  aiJobId?: ID;
  // AI判断依据
  aiReasoning?: string;         // AI的推理过程
  aiEvidence?: EvidenceItem[];  // AI找到的证据
  aiConfidence?: number;        // AI置信度 0-1
  // ── 人工操作信息 ──
  humanOverride?: boolean;      // 是否人工覆盖了AI结果
  humanOverrideBy?: ID;
  humanOverrideAt?: Timestamp;
  humanNote?: string;           // 人工备注
  // ── 异常关联 ──
  anomalyId?: ID;               // 若结果为×，关联异常记录
  executedAt: Timestamp;
}
/**
 * AI证据条目
 * AI执行步骤时找到的具体证据
 */
interface EvidenceItem {
  type: 'TEXT' | 'SIGNATURE' | 'DATE' | 'AMOUNT' | 'ABSENCE';
  description: string;          // 证据描述
  location?: PageLocation;      // 在文档中的位置
  extractedValue?: string;      // 提取的具体值
  meetsCriteria: boolean;       // 是否满足检查标准
}
// ───
//  §9  异常记录（AnomalyRecord）
// ───
/**
 * 测试差异/异常记录
 * 对应Excel §8
 */
interface AnomalyRecord {
  id: ID;
  taskId: ID;
  stepExecutionId: ID;
  // 对应Excel §8 的各列
  findingNo: string;            // 缺陷汇总表序号（如"1"、"A-01"）
  description: string;          // 情况说明
  stepNo: string;               // 步骤号，如"步骤1"
  sampleNo: string;             // 样本序号
  supportingDoc: string;        // 支持性文档名称
  // 严重程度
  severity?: 'MAJOR' | 'MINOR' | 'OBSERVATION';
  // 处理状态
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ACCEPTED_RISK';
  resolvedBy?: ID;
  resolvedAt?: Timestamp;
  resolution?: string;
  createdBy: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
// ───
//  §10  工作底稿（WorkingPaper）
// ───
/**
 * 工作底稿
 * 汇总所有测试数据，对应最终Excel文件
 */
interface WorkingPaper {
  id: ID;
  taskId: ID;
  // ── 底稿头部信息 ──
  documentName: '内部控制评价测试工作底稿';   // 固定值
  unitName: string;
  processLevel1: string;
  processLevel2: string;
  processLevel3: string;
  paperId: string;
  testerName: string;           // 非ID，直接存姓名（归档后不依赖User记录）
  reviewerName: string;
  completionDate: string;
  // ── 抽样信息 ──
  sampling: {
    method: SamplingMethod;
    period: string;
    sampleCount: number;        // 快照值
    sampleSource: string;
  };
  // ── 控制点描述 ──
  controlDescription: string;
  // ── 测试结果汇总 ──
  testResult: {
    controlIds: string;         // "C1、C2"
    result: string;             // "无差异"
  };
  // ── 测试步骤（快照） ──
  steps: PaperStep[];
  // ── 样本记录（快照） ──
  samples: PaperSample[];
  // ── 差异说明 ──
  anomalies: PaperAnomaly[];
  // ── 底稿状态 ──
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ARCHIVED';
  submittedBy?: ID;
  submittedAt?: Timestamp;
  approvedBy?: ID;
  approvedAt?: Timestamp;
  approvalComment?: string;
  // ── 导出的文件 ──
  exportedFiles: ExportedFile[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
/** 底稿中的步骤快照（与TestStep解耦，归档后不变） */
interface PaperStep {
  index: number;
  description: string;
}
/** 底稿中的样本快照 */
interface PaperSample {
  no: number;
  content: string;
  stepResults: StepResultValue[];  // 与 steps[] 索引对应
  remark?: string;
}
/** 底稿中的异常快照 */
interface PaperAnomaly {
  findingNo: string;
  description: string;
  stepNo: string;
  sampleNo: string;
  supportingDoc: string;
}
/** 已导出的文件记录 */
interface ExportedFile {
  id: ID;
  fileRef: FileReference;
  exportedBy: ID;
  exportedAt: Timestamp;
}
// ───
//  §11  AI任务（AIJob）
// ───
/**
 * AI处理任务
 * 跟踪所有AI操作的执行状态
 */
interface AIJob {
  id: ID;
  type: AIJobType;
  // 输入/输出
  inputRef: {
    entityType: 'Regulation' | 'SampleSet' | 'TestTask' | 'StepExecution';
    entityId: ID;
  };
  status: AIJobStatus;
  // 执行信息
  agentType: 'REGULATION_PARSER' | 'PLAN_GENERATOR' | 'SAMPLE_PARSER' | 'TEST_EXECUTOR';
  modelUsed?: string;           // 使用的模型，如"Qwen-2.5-VL"
  tokensUsed?: number;
  durationMs?: number;
  // 进度
  progress?: number;            // 0-100
  currentStep?: string;         // 当前执行步骤描述
  // 结果
  outputRef?: {
    entityType: string;
    entityId: ID;
  };
  errorMessage?: string;
  errorStack?: string;
  // LangGraph状态（用于断点续传）
  checkpointState?: string;     // JSON序列化的图状态
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}
type AIJobType =
  | 'PARSE_REGULATION'      // 解析规章制度PDF → 提取控制点
  | 'GENERATE_TEST_PLAN'    // 生成测试计划
  | 'PARSE_SAMPLE'          // 解析样本材料PDF
  | 'EXECUTE_STEP'          // 执行单个测试步骤
  | 'EXECUTE_ALL_STEPS'     // 批量执行所有步骤
  | 'GENERATE_SUMMARY';     // 生成测试结果摘要
// ───
//  §12  API Request/Response 类型
// ───
// ─ 分页通用 ─
interface PaginatedRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
// ─ TestTask API ─
interface CreateTaskRequest {
  scenarioId: ID;
  paperId: string;
  unitName: string;
  testerId: ID;
  reviewerId?: ID;
  regulationIds: ID[];
  sampling: SamplingConfig;
}
interface UpdateTaskRequest {
  paperId?: string;
  completionDate?: string;
  reviewerId?: ID;
  sampling?: Partial<SamplingConfig>;
}
// ─ Sample API ─
interface AddSampleRequest {
  no: number;
  content: string;
  fileIds: ID[];                // 关联已上传的文件
  remark?: string;
}
interface UpdateStepResultRequest {
  sampleId: ID;
  stepId: ID;
  result: StepResultValue;
  humanNote?: string;
}
// ─ WorkingPaper API ─
interface GeneratePaperRequest {
  taskId: ID;
  overrides?: {                 // 人工覆盖部分字段
    controlDescription?: string;
    testResult?: { controlIds: string; result: string };
    completionDate?: string;
  };
}
interface ExportPaperRequest {
  paperId: ID;
  format: 'XLSX' | 'PDF';
}
```
## 3.3 数据库表结构设计
```typescript
// ===
//  数据库表映射（以 Prisma Schema 风格描述）
//  数据库选型：PostgreSQL（推荐）或 SQLite（开发/小规模）
// ===
/*
TABLE: organizations
  id            UUID PK
  name          TEXT NOT NULL
  code          TEXT UNIQUE
  parent_id     UUID FK→organizations.id
  created_at    TIMESTAMPTZ
TABLE: users
  id            UUID PK
  org_id        UUID FK→organizations.id
  name          TEXT
  email         TEXT UNIQUE
  role          TEXT (ENUM)
  password_hash TEXT
  is_active     BOOL
  created_at    TIMESTAMPTZ
TABLE: business_scenarios
  id            UUID PK
  org_id        UUID FK
  name          TEXT
  process_l1    TEXT
  process_l2    TEXT
  process_l3    TEXT
  is_active     BOOL
  created_by    UUID FK→users.id
  created_at    TIMESTAMPTZ
TABLE: regulations
  id            UUID PK
  org_id        UUID FK
  title         TEXT
  version       TEXT
  file_ref_id   UUID FK→file_references.id
  parse_status  TEXT
  parsed_at     TIMESTAMPTZ
  created_by    UUID FK
  created_at    TIMESTAMPTZ
TABLE: control_points
  id            UUID PK
  regulation_id UUID FK
  control_id    TEXT            -- "C1"
  title         TEXT
  description   TEXT
  suggested_steps JSONB         -- string[]
  confidence    FLOAT
  page_refs     JSONB           -- number[]
  created_at    TIMESTAMPTZ
TABLE: scenario_regulations (M:N)
  scenario_id   UUID FK
  regulation_id UUID FK
  PRIMARY KEY (scenario_id, regulation_id)
TABLE: test_tasks
  id            UUID PK
  org_id        UUID FK
  scenario_id   UUID FK
  paper_id      TEXT
  unit_name     TEXT
  tester_id     UUID FK
  reviewer_id   UUID FK NULL
  completion_date TEXT NULL
  status        TEXT (ENUM)
  sampling      JSONB           -- SamplingConfig
  test_plan_id  UUID NULL
  sample_set_id UUID NULL
  working_paper_id UUID NULL
  created_by    UUID FK
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ
TABLE: test_task_regulations (M:N)
  task_id       UUID FK
  regulation_id UUID FK
TABLE: test_task_status_history
  id            UUID PK
  task_id       UUID FK
  status        TEXT
  changed_by    UUID FK
  changed_at    TIMESTAMPTZ
  comment       TEXT NULL
TABLE: test_plans
  id            UUID PK
  task_id       UUID FK UNIQUE
  control_description TEXT
  control_ids   JSONB           -- string[]
  generated_by  TEXT
  ai_job_id     UUID NULL
  generated_at  TIMESTAMPTZ
  review_status TEXT
  reviewed_by   UUID NULL FK
  reviewed_at   TIMESTAMPTZ NULL
  version       INT DEFAULT 1
  prev_version_id UUID NULL
TABLE: test_steps
  id            UUID PK
  plan_id       UUID FK
  index         INT
  description   TEXT
  execution_config JSONB        -- StepExecutionConfig
TABLE: sample_sets
  id            UUID PK
  task_id       UUID FK UNIQUE
  created_at    TIMESTAMPTZ
TABLE: samples
  id            UUID PK
  set_id        UUID FK
  no            INT
  content       TEXT
  parsed_content JSONB NULL     -- SampleParsedContent
  remark        TEXT NULL
  added_by      UUID FK
  added_at      TIMESTAMPTZ
TABLE: sample_file_refs (M:N)
  sample_id     UUID FK
  file_ref_id   UUID FK
TABLE: step_executions
  id            UUID PK
  sample_id     UUID FK
  step_id       UUID FK
  result        TEXT            -- '✓'|'×'|'N/A'|'PENDING'
  executed_by   TEXT            -- 'AI'|'HUMAN'
  ai_job_id     UUID NULL
  ai_reasoning  TEXT NULL
  ai_evidence   JSONB NULL      -- EvidenceItem[]
  ai_confidence FLOAT NULL
  human_override BOOL DEFAULT FALSE
  human_override_by UUID NULL FK
  human_override_at TIMESTAMPTZ NULL
  human_note    TEXT NULL
  anomaly_id    UUID NULL FK
  executed_at   TIMESTAMPTZ
  UNIQUE(sample_id, step_id)
TABLE: anomaly_records
  id            UUID PK
  task_id       UUID FK
  step_exec_id  UUID FK
  finding_no    TEXT
  description   TEXT
  step_no       TEXT
  sample_no     TEXT
  supporting_doc TEXT
  severity      TEXT NULL
  status        TEXT
  resolved_by   UUID NULL FK
  resolved_at   TIMESTAMPTZ NULL
  resolution    TEXT NULL
  created_by    UUID FK
  created_at    TIMESTAMPTZ
TABLE: working_papers
  id            UUID PK
  task_id       UUID FK UNIQUE
  snapshot_data JSONB           -- 完整WorkingPaper快照（归档不变）
  status        TEXT
  submitted_by  UUID NULL FK
  submitted_at  TIMESTAMPTZ NULL
  approved_by   UUID NULL FK
  approved_at   TIMESTAMPTZ NULL
  created_at    TIMESTAMPTZ
TABLE: file_references
  id            UUID PK
  original_name TEXT
  storage_path  TEXT
  file_type     TEXT
  mime_type     TEXT
  size_bytes    INT
  checksum      TEXT
  page_count    INT NULL
  uploaded_by   UUID FK
  uploaded_at   TIMESTAMPTZ
TABLE: ai_jobs
  id            UUID PK
  type          TEXT
  input_entity_type TEXT
  input_entity_id   UUID
  status        TEXT
  agent_type    TEXT
  model_used    TEXT NULL
  tokens_used   INT NULL
  duration_ms   INT NULL
  progress      INT NULL
  current_step  TEXT NULL
  output_entity_type TEXT NULL
  output_entity_id   UUID NULL
  error_message TEXT NULL
  checkpoint_state TEXT NULL    -- LangGraph状态
  started_at    TIMESTAMPTZ NULL
  completed_at  TIMESTAMPTZ NULL
  created_at    TIMESTAMPTZ
*/
```
# 4. 系统架构设计
## 4.1 整体架构
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           系统整体架构                                        │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         前端层 (React)                                │   │
│  │                                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐│   │
│  │  │ 业务场景  │  │ 测试任务  │  │  底稿编辑 │  │   实时任务监控        ││   │
│  │  │ 管理页面  │  │ 详情页   │  │  & 导出  │  │   (AI进度)           ││   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘│   │
│  └────────────────────────┬─────────────────────────────────────────────┘   │
│                           │ HTTP/WebSocket                                   │
│  ┌────────────────────────▼─────────────────────────────────────────────┐   │
│  │                      API 网关层 (Express)                              │   │
│  │                                                                      │   │
│  │  Authentication ─── Rate Limiting ─── Request Logging ─── CORS       │   │
│  └────────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                  │
│  ┌────────────────────────▼─────────────────────────────────────────────┐   │
│  │                     业务服务层                                         │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │   │
│  │  │  Task       │  │  Plan       │  │  Sample     │  │  Paper     │ │   │
│  │  │  Service    │  │  Service    │  │  Service    │  │  Service   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│  │  │  File       │  │  Auth       │  │       AI Job                │ │   │
│  │  │  Service    │  │  Service    │  │       Manager               │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │   │
│  └────────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                  │
│  ┌────────────────────────▼─────────────────────────────────────────────┐   │
│  │                     AI Agent 层                                       │   │
│  │                                                                      │   │
│  │  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │   │
│  │  │  RegulationParser │  │  PlanGenerator   │  │  TestExecutor    │ │   │
│  │  │  Agent            │  │  Agent           │  │  Agent           │ │   │
│  │  │  (PDF→控制点)     │  │  (控制点→步骤)   │  │  (步骤×样本→结果)│ │   │
│  │  └───────────────────┘  └──────────────────┘  └──────────────────┘ │   │
│  │                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │               LangGraph Runtime                               │  │   │
│  │  │  Graph State ─── Nodes ─── Edges ─── Checkpointer            │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └────────────────────────┬─────────────────────────────────────────────┘   │
│                           │                                                  │
│  ┌────────────────────────▼─────────────────────────────────────────────┐   │
│  │                     基础设施层                                         │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │   │
│  │  │  PostgreSQL  │  │  文件存储     │  │  LLM API                   │ │   │
│  │  │  (Prisma)    │  │  (本地/S3)   │  │  (OpenAI/Claude/本地模型)  │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────────────────────┘ │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐                                 │   │
│  │  │  Redis       │  │  消息队列     │                                 │   │
│  │  │  (缓存/会话)  │  │  (BullMQ)   │                                 │   │
│  │  └──────────────┘  └──────────────┘                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```
## 4.2 Monorepo 目录结构
```
icet/                                   # 项目根目录
├── package.json                        # 根 package.json（workspaces）
├── pnpm-workspace.yaml
├── turbo.json                          # Turborepo 配置
├── tsconfig.base.json                  # 共享 TS 配置
├── .env.example                        # 环境变量模板；开发时复制为根目录 .env 与 apps/api/.env
│
├── packages/                           # 共享包
│   ├── shared/                         # 共享类型与工具
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── types/                  # 所有 TypeScript 类型（§3.2）
│   │   │   │   ├── index.ts
│   │   │   │   ├── entities.ts
│   │   │   │   ├── api.ts
│   │   │   │   └── ai.ts
│   │   │   ├── constants/
│   │   │   │   └── index.ts            # 枚举值、固定配置
│   │   │   └── utils/
│   │   │       ├── date.ts
│   │   │       └── validators.ts
│   │   └── tsconfig.json
│   │
│   └── excel-generator/               # Excel生成逻辑（纯函数，前后端复用）
│       ├── package.json
│       ├── src/
│       │   ├── index.ts
│       │   └── builders/
│       │       ├── worksheet.builder.ts
│       │       └── styles.ts
│       └── tsconfig.json
│
├── apps/
│   ├── web/                           # 前端 React 应用
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── router.tsx             # React Router v6
│   │       │
│   │       ├── pages/                 # 路由页面
│   │       │   ├── dashboard/
│   │       │   ├── scenarios/
│   │       │   ├── tasks/
│   │       │   │   ├── TaskList.tsx
│   │       │   │   ├── TaskCreate.tsx
│   │       │   │   └── TaskDetail/
│   │       │   │       ├── index.tsx
│   │       │   │       ├── PlanTab.tsx
│   │       │   │       ├── SamplesTab.tsx
│   │       │   │       ├── ExecutionTab.tsx
│   │       │   │       └── PaperTab.tsx
│   │       │   ├── regulations/
│   │       │   └── papers/
│   │       │
│   │       ├── components/            # 共享组件
│   │       │   ├── layout/
│   │       │   ├── common/
│   │       │   ├── file-upload/
│   │       │   ├── ai-job-monitor/    # AI任务进度监控
│   │       │   └── paper-editor/      # 底稿编辑器
│   │       │
│   │       ├── hooks/                 # 自定义 Hooks
│   │       │   ├── useTask.ts
│   │       │   ├── useAIJob.ts        # WebSocket订阅AI进度
│   │       │   └── usePaper.ts
│   │       │
│   │       ├── stores/                # Zustand 状态管理
│   │       │   ├── taskStore.ts
│   │       │   └── authStore.ts
│   │       │
│   │       └── api/                   # API客户端（React Query）
│   │           ├── client.ts          # axios实例
│   │           ├── tasks.api.ts
│   │           ├── samples.api.ts
│   │           └── papers.api.ts
│   │
│   └── api/                           # 后端 Node.js API
│       ├── package.json
│       ├── .env                       # 本地环境变量（Prisma CLI 在此目录加载）
│       ├── src/
│       │   ├── main.ts                # 入口
│       │   ├── app.ts                 # Express 应用配置
│       │   │
│       │   ├── routes/                # 路由层
│       │   │   ├── index.ts
│       │   │   ├── tasks.routes.ts
│       │   │   ├── samples.routes.ts
│       │   │   ├── regulations.routes.ts
│       │   │   ├── papers.routes.ts
│       │   │   ├── files.routes.ts
│       │   │   └── ai.routes.ts
│       │   │
│       │   ├── controllers/           # 控制器层
│       │   │   ├── tasks.controller.ts
│       │   │   ├── samples.controller.ts
│       │   │   └── ...
│       │   │
│       │   ├── services/              # 业务逻辑层
│       │   │   ├── task.service.ts
│       │   │   ├── plan.service.ts
│       │   │   ├── sample.service.ts
│       │   │   ├── paper.service.ts
│       │   │   ├── file.service.ts
│       │   │   └── ai-job.service.ts
│       │   │
│       │   ├── agents/                # AI Agent层
│       │   │   ├── index.ts
│       │   │   ├── regulation-parser/ # 规章制度解析Agent
│       │   │   ├── plan-generator/    # 测试计划生成Agent
│       │   │   ├── sample-parser/     # 样本解析Agent
│       │   │   └── test-executor/     # 测试执行Agent
│       │   │
│       │   ├── db/                    # 数据库层
│       │   │   ├── prisma.ts          # Prisma客户端
│       │   │   └── repositories/      # 数据访问对象
│       │   │
│       │   ├── queue/                 # 消息队列
│       │   │   ├── worker.ts
│       │   │   └── jobs/
│       │   │
│       │   ├── websocket/             # WebSocket服务
│       │   │   └── server.ts
│       │   │
│       │   └── middleware/
│       │       ├── auth.middleware.ts
│       │       ├── error.middleware.ts
│       │       └── upload.middleware.ts
│       │
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
└── docs/                              # 文档
    ├── data-model.md                  # 本文档
    └── api-spec.md                    # API规格
```
# 5. 详细设计文档
## 5.1 前端页面规划
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           前端页面结构                                        │
│                                                                             │
│  /dashboard                    仪表盘（任务统计、待审项目）                   │
│  /scenarios                    业务场景管理列表                               │
│  /scenarios/new                新建业务场景                                  │
│  /regulations                  规章制度库列表                                 │
│  /regulations/:id              规章制度详情（控制点查看）                     │
│  /tasks                        测试任务列表                                   │
│  /tasks/new                    新建测试任务                                   │
│  /tasks/:id                    任务详情（多步骤标签页）                        │
│    ├── ?tab=plan               测试计划（步骤设计）                            │
│    ├── ?tab=samples            样本管理（上传/解析）                           │
│    ├── ?tab=execution          执行记录（AI执行/人工填写矩阵）                 │
│    └── ?tab=paper              工作底稿（预览/编辑/导出）                      │
│  /papers                       底稿归档列表                                   │
│  /papers/:id                   底稿详情                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```
## 5.2 任务详情页标签页设计
### Tab 1 — 测试计划（Plan）
```
┌────────────────────────────────────────────────────────────────┐
│  测试计划                        [🤖 AI生成计划] [✏️ 手动编辑]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  控制点描述                                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [AI解析结果，可编辑]                                       │ │
│  │ 1. 采购预算的编制                                          │ │
│  │ 1.1 ...（C1）                                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  测试步骤                                         [+ 添加步骤]  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  步骤1  查看年度预算编制是否依据当年成本水平...            │ │
│  │         [检查类型: 内容检查] [配置执行规则 ⚙]             │ │
│  │  步骤2  查看预算编制是否经总经理审批签字...               │ │
│  │         [检查类型: 签名检查] [配置执行规则 ⚙]             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  AI生成状态: ✅ 已生成（基于 机供品管理规定v2.0）               │
│                           [提交审核] [驳回重新生成]             │
└────────────────────────────────────────────────────────────────┘
```
### Tab 2 — 样本管理（Samples）
```
┌────────────────────────────────────────────────────────────────┐
│  测试样本                                   [📁 上传样本材料]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  #  内容描述              文件            解析状态    操作      │
│  ─────────────────────────────────────────────────────────── │
│  1  2025年机供品采购计划  采购计划.pdf    ✅ 已解析   [查看详情]│
│                           [AI解析摘要: 包含总经理签字、日期...]  │
│  2  7月付款申请清单       付款清单.pdf    🔄 解析中...          │
│                                                                │
│  [拖拽上传或点击选择文件]                                       │
└────────────────────────────────────────────────────────────────┘
```
### Tab 3 — 执行记录（Execution）
```
┌────────────────────────────────────────────────────────────────────────┐
│  执行记录             [🤖 AI全量执行] [📊 执行进度: 6/6 完成 100%]    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  样本     │ 步骤1           │ 步骤2           │ 步骤3      │ 备注      │
│           │ 查看预算是否...  │ 查看是否审批... │ 查看中期...│           │
│ ──────────┼─────────────────┼─────────────────┼────────────┼────────── │
│ 1  采购   │ ✓ [AI:95%]      │ ✓ [AI:88%]      │ N/A[人工]  │           │
│    计划   │ [查看证据]       │ [查看证据]       │            │           │
│ ──────────┼─────────────────┼─────────────────┼────────────┼────────── │
│ 2  付款   │ ✓ [AI:92%]      │ ×  [AI:76%]     │ ✓ [AI:85%] │ 缺少副署  │
│    清单   │                  │ [⚠查看问题]     │            │           │
│                                                                        │
│  注：[AI:xx%] = AI置信度，点击可查看推理过程和证据                      │
└────────────────────────────────────────────────────────────────────────┘
```
### Tab 4 — 工作底稿（Paper）
```
┌────────────────────────────────────────────────────────────────┐
│  工作底稿预览与编辑          [👁 预览Excel] [📥 导出Excel]      │
│                             [提交审阅] [批准归档]               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [嵌入式底稿编辑器 — 与已实现的单HTML表单一致]                  │
│  所有字段已从任务数据自动填充                                    │
│  仅允许修改：控制点描述/测试结果/备注/差异说明                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```
## 5.3 API 端点设计
```typescript
// ===
//  REST API 端点规划
//  Base: /api/v1
// ===
/*
────────────────────── 认证 ──────────────────────
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
────────────────────── 业务场景 ──────────────────────
GET    /scenarios                  获取列表（分页）
POST   /scenarios                  创建场景
GET    /scenarios/:id              获取详情
PUT    /scenarios/:id              更新场景
DELETE /scenarios/:id              删除场景（软删除）
────────────────────── 规章制度 ──────────────────────
GET    /regulations                获取列表
POST   /regulations                上传规章制度（multipart/form-data）
GET    /regulations/:id            获取详情（含控制点列表）
DELETE /regulations/:id            删除
# 触发AI解析
POST   /regulations/:id/parse      触发AI解析PDF
GET    /regulations/:id/controls   获取提取的控制点列表
PUT    /regulations/:id/controls/:cid  人工修改控制点
────────────────────── 测试任务 ──────────────────────
GET    /tasks                      获取列表（分页+筛选）
POST   /tasks                      创建任务
GET    /tasks/:id                  获取任务详情
PUT    /tasks/:id                  更新任务基础信息
PATCH  /tasks/:id/status           推进任务状态
# 测试计划
GET    /tasks/:id/plan             获取测试计划
PUT    /tasks/:id/plan             更新测试计划（人工编辑）
POST   /tasks/:id/plan/generate    触发AI生成测试计划
POST   /tasks/:id/plan/approve     审核通过测试计划
POST   /tasks/:id/plan/reject      驳回测试计划
# 样本管理
GET    /tasks/:id/samples          获取样本列表
POST   /tasks/:id/samples          添加样本（含文件上传）
PUT    /tasks/:id/samples/:sid     更新样本信息
DELETE /tasks/:id/samples/:sid     删除样本
POST   /tasks/:id/samples/:sid/parse  触发AI解析样本材料
# 执行记录
GET    /tasks/:id/executions       获取所有执行结果矩阵
POST   /tasks/:id/executions/run-all   触发AI执行所有步骤
POST   /tasks/:id/executions/run-sample/:sid  执行单个样本所有步骤
PATCH  /tasks/:id/executions/:eid  人工覆盖执行结果
# 异常记录
GET    /tasks/:id/anomalies        获取异常列表
POST   /tasks/:id/anomalies        创建异常记录
PUT    /tasks/:id/anomalies/:aid   更新异常记录
────────────────────── 工作底稿 ──────────────────────
GET    /tasks/:id/paper            获取工作底稿数据
POST   /tasks/:id/paper/generate   从任务数据生成底稿
PUT    /tasks/:id/paper            更新底稿（人工编辑）
POST   /tasks/:id/paper/submit     提交审阅
POST   /tasks/:id/paper/approve    批准归档
POST   /tasks/:id/paper/export     导出Excel/PDF（返回文件）
────────────────────── 文件 ──────────────────────
POST   /files/upload               上传文件
GET    /files/:id                  下载文件
GET    /files/:id/preview          获取文件预览（页面截图URL列表）
DELETE /files/:id                  删除文件
────────────────────── AI任务 ──────────────────────
GET    /ai-jobs/:id                获取AI任务状态
POST   /ai-jobs/:id/cancel         取消AI任务
────────────────────── WebSocket ──────────────────────
WS     /ws                         实时推送
  events:
    ai_job.progress                AI任务进度更新
    ai_job.completed               AI任务完成
    ai_job.failed                  AI任务失败
    task.status_changed            任务状态变更
*/
```
## 5.4 关键服务实现设计
```typescript
// ===
//  apps/api/src/services/task.service.ts  — 关键逻辑伪代码
// ===
class TaskService {
  
  /**
   * 创建测试任务
   * 同时初始化 SampleSet 空容器
   */
  async createTask(req: CreateTaskRequest, userId: ID): Promise<TestTask> {
    return await db.$transaction(async (tx) => {
      const task = await tx.testTask.create({ data: { ...req, createdBy: userId, status: 'DRAFT' } });
      await tx.sampleSet.create({ data: { taskId: task.id } });
      return task;
    });
  }
  /**
   * 推进任务状态机
   * 包含状态转换合法性验证
   */
  async advanceStatus(taskId: ID, targetStatus: TaskStatus, userId: ID): Promise<void> {
    const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
      DRAFT:       ['PLANNING', 'CANCELLED'],
      PLANNING:    ['PLAN_REVIEW', 'DRAFT'],
      PLAN_REVIEW: ['EXECUTING', 'PLANNING'],
      EXECUTING:   ['EXEC_REVIEW', 'PLAN_REVIEW'],
      EXEC_REVIEW: ['PAPER_DRAFT', 'EXECUTING'],
      PAPER_DRAFT: ['PAPER_REVIEW', 'EXEC_REVIEW'],
      PAPER_REVIEW:['ARCHIVED', 'PAPER_DRAFT'],
      ARCHIVED:    [],
      CANCELLED:   [],
    };
    
    const task = await this.getById(taskId);
    if (!ALLOWED_TRANSITIONS[task.status].includes(targetStatus)) {
      throw new AppError(`不允许从 ${task.status} 转换到 ${targetStatus}`, 400);
    }
    
    await db.$transaction(async (tx) => {
      await tx.testTask.update({ where: { id: taskId }, data: { status: targetStatus, updatedAt: new Date() } });
      await tx.taskStatusHistory.create({ data: { taskId, status: targetStatus, changedBy: userId, changedAt: new Date() } });
    });
    
    // 广播状态变更
    wsServer.broadcast(taskId, 'task.status_changed', { taskId, newStatus: targetStatus });
  }
}
// ===
//  apps/api/src/services/paper.service.ts
// ===
class PaperService {
  
  /**
   * 从任务数据自动生成工作底稿
   * 汇总 TestPlan + SampleSet + StepExecutions → WorkingPaper
   */
  async generateFromTask(taskId: ID, overrides?: Partial<WorkingPaper>): Promise<WorkingPaper> {
    
    // 1. 加载所有关联数据
    const task = await taskRepository.findWithRelations(taskId, {
      include: ['scenario', 'plan', 'sampleSet.samples.stepExecutions', 'anomalies', 'tester', 'reviewer']
    });
    
    // 2. 构建步骤快照
    const steps: PaperStep[] = task.plan.steps.map(s => ({
      index: s.index,
      description: s.description,
    }));
    
    // 3. 构建样本快照（包含步骤结果矩阵）
    const samples: PaperSample[] = task.sampleSet.samples.map(sample => ({
      no: sample.no,
      content: sample.content,
      stepResults: task.plan.steps.map(step => {
        const exec = sample.stepExecutions.find(e => e.stepId === step.id);
        return exec?.result ?? 'PENDING';
      }),
      remark: sample.remark ?? '',
    }));
    
    // 4. 构建异常快照
    const anomalies: PaperAnomaly[] = task.anomalies.map(a => ({
      findingNo: a.findingNo,
      description: a.description,
      stepNo: a.stepNo,
      sampleNo: a.sampleNo,
      supportingDoc: a.supportingDoc,
    }));
    
    // 5. 组装底稿数据，允许人工覆盖
    const paperData: WorkingPaper = {
      documentName: '内部控制评价测试工作底稿',
      unitName: task.unitName,
      processLevel1: task.scenario.processLevel1,
      processLevel2: task.scenario.processLevel2,
      processLevel3: task.scenario.processLevel3 ?? 'NA',
      paperId: task.paperId,
      testerName: task.tester.name,
      reviewerName: task.reviewer?.name ?? '',
      completionDate: task.completionDate ?? '',
      sampling: {
        method: task.sampling.method,
        period: task.sampling.period,
        sampleCount: samples.length, // 动态计算
        sampleSource: task.sampling.sampleSource,
      },
      controlDescription: task.plan.controlDescription,
      testResult: {
        controlIds: task.plan.controlIds.join('、'),
        result: anomalies.length === 0 ? '无差异' : '存在差异',
      },
      steps,
      samples,
      anomalies,
      status: 'DRAFT',
      exportedFiles: [],
      ...overrides,
    };
    
    // 6. 持久化
    return await db.workingPaper.upsert({
      where: { taskId },
      create: { taskId, snapshotData: JSON.stringify(paperData), status: 'DRAFT' },
      update: { snapshotData: JSON.stringify(paperData), updatedAt: new Date() },
    });
  }
  
  /**
   * 导出Excel文件
   * 调用共享包 excel-generator
   */
  async exportToExcel(paperId: ID, userId: ID): Promise<FileReference> {
    const paper = await db.workingPaper.findUniqueOrThrow({ where: { id: paperId } });
    const data = JSON.parse(paper.snapshotData) as WorkingPaper;
    
    const { buildWorkbook } = await import('@icet/excel-generator');
    const buffer = buildWorkbook(data);
    
    const filename = `内控测试底稿_${data.paperId}_${data.completionDate}.xlsx`;
    const fileRef = await fileService.saveBuffer(buffer, filename, 'EXCEL', userId);
    
    await db.workingPaper.update({
      where: { id: paperId },
      data: { exportedFiles: { push: { fileRefId: fileRef.id, exportedBy: userId, exportedAt: new Date() } } }
    });
    
    return fileRef;
  }
}
```
# 6. AI Agent 设计
## 6.1 Agent 总览与职责边界
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI Agent 生态                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Agent 1: RegulationParserAgent                                     │   │
│  │  输入: 规章制度PDF                                                   │   │
│  │  输出: ControlPoint[]（控制点列表）                                  │   │
│  │  模式: ReAct（逐页阅读→理解→提取）                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼ ControlPoint[]                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Agent 2: PlanGeneratorAgent                                        │   │
│  │  输入: ControlPoint[] + 历史测试计划（可选RAG）                      │   │
│  │  输出: TestPlan（含 TestStep[] + 每步骤的执行配置）                  │   │
│  │  模式: Plan-and-Execute（先规划整体，再细化每步骤）                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Agent 3: SampleParserAgent                                         │   │
│  │  输入: 样本材料PDF                                                   │   │
│  │  输出: SampleParsedContent（结构化解析）                             │   │
│  │  模式: 工具调用（PDF解析→OCR→结构化提取）                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼ SampleParsedContent                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Agent 4: TestExecutorAgent                                         │   │
│  │  输入: TestStep + SampleParsedContent                               │   │
│  │  输出: StepExecution（✓/×/N/A + 证据 + 置信度）                    │   │
│  │  模式: ReAct+Plan（理解步骤→检索证据→判断→输出）                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```
## 6.2 TestExecutorAgent LangGraph 图设计
```typescript
// ===
//  apps/api/src/agents/test-executor/graph.ts
//  最核心的 Agent — 执行测试步骤
// ===
import { StateGraph, END, START } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
// ── 图状态定义 ──────────────────────────────────────────────────
interface ExecutorState {
  // 输入
  step: TestStep;
  sample: Sample;
  parsedContent: SampleParsedContent;
  // 中间状态
  plan: string[];               // 执行计划（Plan节点生成）
  currentPlanStep: number;      // 当前执行第几个计划步骤
  observations: Observation[];  // 每次工具调用的观察结果
  toolCallCount: number;        // 防止无限循环
  // 输出
  result: StepResultValue | null;
  reasoning: string;
  evidence: EvidenceItem[];
  confidence: number;
}
interface Observation {
  tool: string;
  input: string;
  output: string;
  relevance: number;
}
// ── 节点定义 ────────────────────────────────────────────────────
/**
 * Plan节点：理解步骤要求，制定检查计划
 * 输出: 有序的检查子任务列表
 */
async function planNode(state: ExecutorState): Promise<Partial<ExecutorState>> {
  const llm = new ChatOpenAI({ model: 'Qwen-2.5-VL', temperature: 0 });
  
  const response = await llm.invoke([
    { role: 'system', content: `你是内部控制评价测试专家。
给定一个测试步骤和样本材料的解析摘要，制定一个具体的检查计划。
输出格式：JSON数组，每项是一个具体的检查动作。` },
    { role: 'user', content: `
测试步骤：${state.step.description}
样本内容摘要：${state.parsedContent.summary}
文档结构：${state.parsedContent.structureSummary}
检测到的签名：${JSON.stringify(state.parsedContent.signatures)}
请制定检查计划（3-5个步骤）。` }
  ]);
  
  const plan = JSON.parse(response.content as string);
  return { plan, currentPlanStep: 0, toolCallCount: 0 };
}
/**
 * Execute节点：执行当前计划步骤（调用工具）
 */
async function executeNode(state: ExecutorState): Promise<Partial<ExecutorState>> {
  const tools = [
    searchTextTool,       // 在文档文本中搜索关键词
    checkSignatureTool,   // 检查特定签名是否存在
    extractFieldTool,     // 提取特定字段的值
    checkDateTool,        // 验证日期格式和范围
    compareValuesTool,    // 比较两个值
  ];
  
  const llm = new ChatOpenAI({ model: 'Qwen-2.5-VL', temperature: 0 }).bindTools(tools);
  
  const currentTask = state.plan[state.currentPlanStep];
  const response = await llm.invoke([
    { role: 'system', content: '使用提供的工具检查文档内容，完成指定的检查任务。' },
    { role: 'user', content: `
当前检查任务: ${currentTask}
样本解析内容: ${JSON.stringify(state.parsedContent)}
已有观察结果: ${JSON.stringify(state.observations)}` }
  ]);
  
  // 执行工具调用，收集观察
  const newObservations = await executeToolCalls(response.tool_calls, state.parsedContent);
  
  return {
    observations: [...state.observations, ...newObservations],
    currentPlanStep: state.currentPlanStep + 1,
    toolCallCount: state.toolCallCount + 1,
  };
}
/**
 * Judge节点：综合所有观察，做出最终判断
 */
async function judgeNode(state: ExecutorState): Promise<Partial<ExecutorState>> {
  const llm = new ChatOpenAI({ model: 'Qwen-2.5-VL', temperature: 0 });
  
  const response = await llm.invoke([
    { role: 'system', content: `你是内部控制评价测试专家。
基于检查过程中收集的所有证据，对测试步骤做出最终判断。
判断标准：
- ✓ (通过): 找到满足要求的明确证据
- × (不通过): 发现明确的缺失或不符合情况
- N/A (不适用): 该步骤不适用于本样本
输出JSON格式。` },
    { role: 'user', content: `
测试步骤: ${state.step.description}
检查过程观察记录: ${JSON.stringify(state.observations)}
请输出:
{
  "result": "✓|×|N/A",
  "reasoning": "详细推理过程",
  "evidence": [...],
  "confidence": 0.0-1.0
}` }
  ]);
  
  return JSON.parse(response.content as string);
}
// ── 条件边：是否继续执行计划 ────────────────────────────────────
function shouldContinue(state: ExecutorState): 'execute' | 'judge' {
  // 计划步骤未执行完，且未超过最大工具调用次数
  if (state.currentPlanStep < state.plan.length && state.toolCallCount < 10) {
    return 'execute';
  }
  return 'judge';
}
// ── 构建图 ──────────────────────────────────────────────────────
export function buildExecutorGraph() {
  const graph = new StateGraph<ExecutorState>({
    channels: {
      step: null,
      sample: null,
      parsedContent: null,
      plan: { default: () => [] },
      currentPlanStep: { default: () => 0 },
      observations: { default: () => [] },
      toolCallCount: { default: () => 0 },
      result: { default: () => null },
      reasoning: { default: () => '' },
      evidence: { default: () => [] },
      confidence: { default: () => 0 },
    }
  });
  graph
    .addNode('plan',    planNode)
    .addNode('execute', executeNode)
    .addNode('judge',   judgeNode)
    .addEdge(START,     'plan')
    .addEdge('plan',    'execute')
    .addConditionalEdges('execute', shouldContinue, { execute: 'execute', judge: 'judge' })
    .addEdge('judge',   END);
  return graph.compile({
    checkpointer: new SqliteCheckpointer(), // 支持断点续传
  });
}
```
## 6.3 Agent 工具清单
```typescript
// ===
//  apps/api/src/agents/test-executor/tools.ts
// ===
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
/** 工具1：在文档文本中搜索 */
export const searchTextTool = tool(
  async ({ query, pages, sampleContent }) => {
    const results = [];
    const targetPages = pages ?? sampleContent.pages.map(p => p.pageNumber);
    for (const pageNum of targetPages) {
      const page = sampleContent.pages.find(p => p.pageNumber === pageNum);
      if (!page) continue;
      if (page.text.toLowerCase().includes(query.toLowerCase())) {
        const idx = page.text.toLowerCase().indexOf(query.toLowerCase());
        results.push({
          page: pageNum,
          context: page.text.slice(Math.max(0, idx - 100), idx + 200),
          found: true,
        });
      }
    }
    return JSON.stringify(results.length > 0 ? results : [{ found: false, message: '未找到相关内容' }]);
  },
  {
    name: 'search_text',
    description: '在样本材料文本中搜索特定关键词或短语',
    schema: z.object({
      query: z.string().describe('搜索关键词'),
      pages: z.array(z.number()).optional().describe('指定搜索的页码范围'),
      sampleContent: z.any().describe('样本解析内容对象'),
    }),
  }
);
/** 工具2：检查签名是否存在 */
export const checkSignatureTool = tool(
  async ({ signerRole, sampleContent }) => {
    const signatures = sampleContent.signatures as DetectedSignature[];
    const match = signatures.find(s =>
      s.signerHint.includes(signerRole) && s.isPresent
    );
    return JSON.stringify({
      found: !!match,
      signature: match ?? null,
      allDetectedSignatures: signatures.map(s => ({
        hint: s.signerHint,
        present: s.isPresent,
        confidence: s.confidence,
      })),
    });
  },
  {
    name: 'check_signature',
    description: '检查特定角色的签名是否存在于文档中',
    schema: z.object({
      signerRole: z.string().describe('签名人的角色或姓名，如"总经理"、"财务部长"'),
      sampleContent: z.any(),
    }),
  }
);
/** 工具3：提取字段值 */
export const extractFieldTool = tool(
  async ({ fieldName, sampleContent }) => {
    // 在解析内容中查找特定字段
    const dates = (sampleContent.dates as DetectedDate[])
      .filter(d => d.fieldContext.includes(fieldName));
    const amounts = (sampleContent.amounts as DetectedAmount[])
      .filter(a => a.fieldContext.includes(fieldName));
    
    return JSON.stringify({ dates, amounts, fieldName });
  },
  {
    name: 'extract_field',
    description: '从文档中提取特定字段的值（日期、金额等）',
    schema: z.object({
      fieldName: z.string().describe('字段名称，如"审批日期"、"采购金额"'),
      sampleContent: z.any(),
    }),
  }
);
```
# 7. 项目工程规划
## 7.1 技术选型总表
| 层次 | 技术 | 选择理由 |
|------|------|----------|
| **前端框架** | React 18 + TypeScript | 生态成熟，组件化，TS全栈一致 |
| **前端路由** | React Router v6 | 标准选择 |
| **状态管理** | Zustand + React Query | Zustand轻量全局状态，RQ处理服务端状态/缓存 |
| **UI组件库** | shadcn/ui + Tailwind CSS | 无样式锁定，高度可定制 |
| **前端构建** | Vite | 极速HMR，TS原生支持 |
| **后端框架** | Express.js + TypeScript | 轻量灵活，足够小规模 |
| **ORM** | Prisma | 类型安全，迁移管理方便 |
| **数据库** | PostgreSQL（开发可用SQLite） | 可靠，JSONB支持 |
| **文件存储** | MinIO（本地）/ S3（生产） | 兼容S3接口，可平滑迁移 |
| **消息队列** | BullMQ + Redis | AI任务异步处理，进度追踪 |
| **AI框架** | LangGraph.js | 状态图管理Agent，支持断点续传 |
| **LLM** | Qwen 2.5 VL | 视觉能力强（PDF图像分析），可替换 |
| **PDF处理** | pdf-parse + Tesseract.js | 文本提取+OCR |
| **Excel生成** | SheetJS (xlsx) | 已验证，前后端通用 |
| **实时通信** | Socket.io | AI进度推送 |
| **Monorepo** | pnpm workspaces + Turborepo | 缓存构建，快速开发 |
| **认证** | JWT + httpOnly Cookie | 简单安全 |

## 7.2 开发阶段规划
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           开发路线图                                          │
│                                                                             │
│  Phase 0: 基础搭建（1周）                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✦ Monorepo脚手架（pnpm + turbo）                                            │
│  ✦ 共享类型包（packages/shared）                                              │
│  ✦ 数据库Schema（Prisma）+ 基础迁移                                           │
│  ✦ Express基础框架 + JWT认证                                                 │
│  ✦ React应用基础框架 + 路由                                                  │
│                                                                             │
│  Phase 1: 核心CRUD（2-3周）                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✦ 业务场景管理（CRUD + UI）                                                 │
│  ✦ 规章制度上传（文件存储 + 基础UI）                                          │
│  ✦ 测试任务创建与管理（状态机）                                               │
│  ✦ 样本上传与管理                                                            │
│  ✦ 底稿手工填写 + Excel导出（移植已有HTML实现）                               │
│                                                                             │
│  Phase 2: AI基础能力（2-3周）                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✦ BullMQ任务队列搭建                                                        │
│  ✦ WebSocket AI进度推送                                                      │
│  ✦ SampleParserAgent（PDF文本提取+结构化）                                   │
│  ✦ RegulationParserAgent（控制点提取）                                       │
│  ✦ AI任务监控UI组件                                                          │
│                                                                             │
│  Phase 3: 核心AI能力（3-4周）                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✦ PlanGeneratorAgent（测试计划生成）                                        │
│  ✦ TestExecutorAgent — LangGraph图（核心）                                   │
│  ✦ 执行结果矩阵UI（置信度显示、证据查看）                                    │
│  ✦ 人工覆盖AI结果                                                            │
│  ✦ 自动异常记录                                                              │
│                                                                             │
│  Phase 4: 完整流程打通（1-2周）                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✦ 自动生成工作底稿                                                          │
│  ✦ 审阅/批准流程                                                             │
│  ✦ 底稿归档管理                                                              │
│  ✦ Dashboard统计                                                             │
│                                                                             │
│  Phase 5: 优化与完善（持续）                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ✦ RAG（历史底稿作为参考）                                                   │
│  ✦ 多模型支持（Claude/本地模型）                                              │
│  ✦ 批量任务处理                                                               │
│  ✦ 性能优化                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```
## 7.3 关键设计决策记录
| 决策点 | 选择 | 理由 |
|--------|------|------|
| **WorkingPaper存储** | 使用快照（snapshot_data JSONB）而非实时关联查询 | 底稿归档后不受源数据修改影响，历史可追溯 |
| **AI结果可覆盖** | `humanOverride` 标记 + 保留AI原始结果 | 审计需要；可分析AI准确率 |
| **StepExecution唯一约束** | `UNIQUE(sample_id, step_id)` | 每个样本×步骤只有一个最终结果 |
| **样本数量计算** | `samples.length` 动态计算，不存储 | 单一数据源，避免不一致 |
| **Agent并发** | 每个样本的步骤可并行执行，不同样本串行 | 平衡速度与LLM费用 |
| **LangGraph Checkpointer** | SQLite Checkpointer | 支持长时任务断点续传；与主数据库隔离 |
| **文件去重** | 按checksum（MD5）去重 | 避免重复上传相同规章制度 |

## 附录：数据流完整示意
```
用户操作                    API层                     数据库              AI层
──────────                 ─────────                 ──────────         ──────────
选择场景
创建任务          ──►  POST /tasks            ──►  TestTask (DRAFT)
                                               ──►  SampleSet (empty)
上传规章制度      ──►  POST /regulations      ──►  Regulation
触发解析          ──►  POST /regulations/:id/parse
                                               ──►  AIJob (QUEUED)   ──►  RegulationParser
                                                                            │ 读取PDF
                                                                            │ 提取控制点
                                               ◄──  ControlPoint[]   ◄──────┘
WebSocket推送进度  ◄──  ai_job.progress
AI生成测试计划    ──►  POST /tasks/:id/plan/generate
                                               ──►  AIJob (QUEUED)   ──►  PlanGenerator
                                                                            │ 分析控制点
                                                                            │ 设计步骤
                                               ◄──  TestPlan         ◄──────┘
人工审核步骤      ──►  POST /tasks/:id/plan/approve
                                               ──►  TestPlan (APPROVED)
上传样本材料      ──►  POST /tasks/:id/samples ─►  Sample + FileRef
触发解析          ──►  POST /samples/:id/parse  ──►  AIJob            ──►  SampleParser
                                                                            │ OCR/PDF解析
                                                                            │ 提取结构化信息
                                               ◄──  SampleParsedContent ◄──┘
触发AI执行        ──►  POST /tasks/:id/executions/run-all
                  为每个 sample × step 创建并行job
                                               ──►  AIJob×N          ──►  TestExecutor×N
                                                                            │ Plan节点
                                                                            │ Execute节点(循环)
                                                                            │ Judge节点
                                               ◄──  StepExecution[]  ◄──────┘
                                               ◄──  AnomalyRecord[]（×的项）
生成底稿          ──►  POST /tasks/:id/paper/generate
                                               ──►  WorkingPaper(DRAFT)
                                                    （快照所有数据）
导出Excel         ──►  POST /tasks/:id/paper/export
                                               ──►  FileReference
                  ◄──  文件下载URL
```