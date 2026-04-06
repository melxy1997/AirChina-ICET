import type {
  AgentType,
  AIJobStatus,
  AIJobType,
  FileType,
  ID,
  SamplingMethod,
  StepCheckType,
  StepResultValue,
  TaskStatus,
  Timestamp,
} from './base';

// ── §1 组织与用户 ──
export interface Organization {
  id: ID;
  name: string;
  code: string;
  parentId?: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface User {
  id: ID;
  organizationId: ID;
  name: string;
  email: string;
  role: import('./base').UserRole;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── §2 业务场景 ──
export interface BusinessScenario {
  id: ID;
  organizationId: ID;
  processLevel1: string;
  processLevel2: string;
  processLevel3?: string;
  name: string;
  description?: string;
  isActive: boolean;
  regulationIds: ID[];
  createdBy: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── §3 规章制度 ──
export interface Regulation {
  id: ID;
  organizationId: ID;
  title: string;
  version: string;
  effectiveDate?: string;
  expiryDate?: string;
  fileRef: FileReference;
  parseStatus: AIJobStatus;
  parsedAt?: Timestamp;
  extractedControls: ControlPoint[];
  rawParseResult?: string;
  createdBy: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ControlPoint {
  id: ID;
  regulationId: ID;
  controlId: string;
  title: string;
  description: string;
  responsible?: string;
  timing?: string;
  approvalChain?: string[];
  suggestedTestObjective?: string;
  suggestedTestSteps?: string[];
  suggestedEvidenceTypes?: string[];
  confidence: number;
  pageReferences?: number[];
  createdAt: Timestamp;
}

// ── §4 文件系统 ──
export interface FileReference {
  id: ID;
  originalName: string;
  storagePath: string;
  fileType: FileType;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  pageCount?: number;
  uploadedBy: ID;
  uploadedAt: Timestamp;
}

// ── §5 测试任务 ──
export interface TestTask {
  id: ID;
  organizationId: ID;
  scenarioId: ID;
  paperId: string;
  unitName: string;
  testerId: ID;
  reviewerId?: ID;
  completionDate?: string;
  status: TaskStatus;
  statusHistory: TaskStatusRecord[];
  regulationIds: ID[];
  sampling: SamplingConfig;
  testPlanId?: ID;
  sampleSetId?: ID;
  workingPaperId?: ID;
  createdBy: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskStatusRecord {
  status: TaskStatus;
  changedBy: ID;
  changedAt: Timestamp;
  comment?: string;
}

export interface SamplingConfig {
  method: SamplingMethod;
  period: string;
  sampleSource: string;
}

// ── §6 测试计划 ──
export interface TestPlan {
  id: ID;
  taskId: ID;
  controlDescription: string;
  controlIds: string[];
  steps: TestStep[];
  generatedBy: 'AI' | 'HUMAN';
  aiJobId?: ID;
  generatedAt: Timestamp;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
  reviewedBy?: ID;
  reviewedAt?: Timestamp;
  reviewComment?: string;
  version: number;
  previousVersionId?: ID;
}

export interface TestStep {
  id: ID;
  planId: ID;
  index: number;
  description: string;
  executionConfig: StepExecutionConfig;
}

export interface StepExecutionConfig {
  checkType: StepCheckType;
  signatureCheck?: {
    requiredSigners: string[];
    signatureFieldHints: string[];
  };
  contentCheck?: {
    requiredKeywords?: string[];
    forbiddenKeywords?: string[];
    patternMatch?: string;
  };
  dateCheck?: {
    fieldName: string;
    rangeDescription?: string;
  };
  amountCheck?: {
    fieldName: string;
    tolerance?: number;
  };
  freeFormCheck?: {
    prompt: string;
    expectedEvidence: string;
  };
}

// ── §7 样本集 ──
export interface SampleSet {
  id: ID;
  taskId: ID;
  samples: Sample[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Sample {
  id: ID;
  sampleSetId: ID;
  no: number;
  content: string;
  fileRefs: FileReference[];
  parsedContent?: SampleParsedContent;
  stepExecutions: StepExecution[];
  remark?: string;
  addedBy: ID;
  addedAt: Timestamp;
}

export interface SampleParsedContent {
  signatures: DetectedSignature[];
  dates: DetectedDate[];
  amounts: DetectedAmount[];
  structureSummary: string;
  pages: PageContent[];
  summary: string;
  parsedAt: Timestamp;
  parserVersion: string;
}

export interface DetectedSignature {
  signerHint: string;
  location: PageLocation;
  confidence: number;
  isPresent: boolean;
}

export interface DetectedDate {
  value: string;
  fieldContext: string;
  location: PageLocation;
}

export interface DetectedAmount {
  value: number;
  currency: string;
  fieldContext: string;
  location: PageLocation;
}

export interface PageLocation {
  page: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface PageContent {
  pageNumber: number;
  text: string;
  imageUrl?: string;
}

// ── §8 步骤执行记录 ──
export interface StepExecution {
  id: ID;
  sampleId: ID;
  stepId: ID;
  result: StepResultValue;
  executedBy: 'AI' | 'HUMAN';
  aiJobId?: ID;
  aiReasoning?: string;
  aiEvidence?: EvidenceItem[];
  aiConfidence?: number;
  humanOverride?: boolean;
  humanOverrideBy?: ID;
  humanOverrideAt?: Timestamp;
  humanNote?: string;
  anomalyId?: ID;
  executedAt: Timestamp;
}

export interface EvidenceItem {
  type: 'TEXT' | 'SIGNATURE' | 'DATE' | 'AMOUNT' | 'ABSENCE';
  description: string;
  location?: PageLocation;
  extractedValue?: string;
  meetsCriteria: boolean;
}

// ── §9 异常记录 ──
export interface AnomalyRecord {
  id: ID;
  taskId: ID;
  stepExecutionId: ID;
  findingNo: string;
  description: string;
  stepNo: string;
  sampleNo: string;
  supportingDoc: string;
  severity?: 'MAJOR' | 'MINOR' | 'OBSERVATION';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ACCEPTED_RISK';
  resolvedBy?: ID;
  resolvedAt?: Timestamp;
  resolution?: string;
  createdBy: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── §10 工作底稿 ──
export interface WorkingPaper {
  id: ID;
  taskId: ID;
  documentName: '内部控制评价测试工作底稿';
  unitName: string;
  processLevel1: string;
  processLevel2: string;
  processLevel3: string;
  paperId: string;
  testerName: string;
  reviewerName: string;
  completionDate: string;
  sampling: {
    method: SamplingMethod;
    period: string;
    sampleCount: number;
    sampleSource: string;
  };
  controlDescription: string;
  testResult: {
    controlIds: string;
    result: string;
  };
  steps: PaperStep[];
  samples: PaperSample[];
  anomalies: PaperAnomaly[];
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ARCHIVED';
  submittedBy?: ID;
  submittedAt?: Timestamp;
  approvedBy?: ID;
  approvedAt?: Timestamp;
  approvalComment?: string;
  exportedFiles: ExportedFile[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaperStep {
  index: number;
  description: string;
}

export interface PaperSample {
  no: number;
  content: string;
  stepResults: StepResultValue[];
  remark?: string;
}

export interface PaperAnomaly {
  findingNo: string;
  description: string;
  stepNo: string;
  sampleNo: string;
  supportingDoc: string;
}

export interface ExportedFile {
  id: ID;
  fileRef: FileReference;
  exportedBy: ID;
  exportedAt: Timestamp;
}

// ── §11 AI任务 ──
export interface AIJob {
  id: ID;
  type: AIJobType;
  inputRef: {
    entityType: 'Regulation' | 'SampleSet' | 'TestTask' | 'StepExecution';
    entityId: ID;
  };
  status: AIJobStatus;
  agentType: AgentType;
  modelUsed?: string;
  tokensUsed?: number;
  durationMs?: number;
  progress?: number;
  currentStep?: string;
  outputRef?: {
    entityType: string;
    entityId: ID;
  };
  errorMessage?: string;
  errorStack?: string;
  checkpointState?: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}
