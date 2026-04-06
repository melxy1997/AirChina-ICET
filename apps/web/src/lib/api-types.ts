/**
 * 与后端 JSON 响应对齐的前端类型（避免 hooks 使用 any）
 */

export interface ScenarioListItem {
  id: string;
  processLevel1: string;
  processLevel2: string;
  name: string;
  createdAt: string;
  _count?: { regulations?: number; tasks?: number };
}

export interface TaskListItem {
  id: string;
  paperId: string;
  unitName: string;
  status: string;
  createdAt: string;
  scenario?: { processLevel1?: string; processLevel2?: string };
  tester?: { name?: string };
  _count?: { anomalies?: number };
}

/** GET /tasks/:id 含 Prisma 关联 */
export interface TaskDetailApi {
  id: string;
  paperId: string;
  unitName: string;
  status: string;
  samplingMethod?: string;
  samplingPeriod?: string;
  samplingSource?: string;
  completionDate?: string | null;
  scenario?: { processLevel1?: string; processLevel2?: string };
  tester?: { id?: string; name?: string };
  testerId?: string;
  reviewer?: { id?: string; name?: string };
  reviewerId?: string | null;
  plan?: {
    id: string;
    controlDescription?: string;
    controlIds?: string[];
    reviewStatus?: string;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    reviewComment?: string | null;
    steps?: { id: string; index: number; description: string; executionConfig: any }[];
  } | null;
}

export interface StepExecutionView {
  stepId: string;
  result: string;
}

/** 与 GET /tasks/:id/samples 中 samples[].files 对齐 */
export interface SampleFileLink {
  fileRef: { id: string; originalName: string; fileType?: string };
}

export interface SampleView {
  id: string;
  no: number;
  content: string;
  remark?: string | null;
  stepExecutions: StepExecutionView[];
  /** 样本材料包：多文件或单个 zip 等，经 FileReference 关联 */
  files?: SampleFileLink[];
}

export interface RegulationListItem {
  id: string;
  title: string;
  version: string;
  parseStatus: string;
  createdAt: string;
  _count?: { controlPoints?: number; scenarios?: number };
}

export interface AIJobView {
  id: string;
  type: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  agentType: string;
  inputEntityType: string;
  inputEntityId: string;
  outputEntityType?: string | null;
  outputEntityId?: string | null;
  progress?: number | null;
  currentStep?: string | null;
  errorMessage?: string | null;
  tokensUsed?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}
