import type { ID, StepResultValue, SamplingMethod } from './base';
import type { SamplingConfig } from './entities';

// ── 分页通用 ──
export interface PaginatedRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── TestTask API ──
export interface CreateTaskRequest {
  scenarioId: ID;
  paperId: string;
  unitName: string;
  testerId: ID;
  reviewerId?: ID;
  regulationIds: ID[];
  sampling: SamplingConfig;
}

export interface UpdateTaskRequest {
  paperId?: string;
  completionDate?: string;
  reviewerId?: ID;
  sampling?: Partial<SamplingConfig>;
}

// ── Sample API ──
export interface AddSampleRequest {
  no: number;
  content: string;
  fileIds: ID[];
  remark?: string;
}

export interface UpdateStepResultRequest {
  sampleId: ID;
  stepId: ID;
  result: StepResultValue;
  humanNote?: string;
}

// ── WorkingPaper API ──
export interface GeneratePaperRequest {
  taskId: ID;
  overrides?: {
    controlDescription?: string;
    testResult?: { controlIds: string; result: string };
    completionDate?: string;
  };
}

export interface ExportPaperRequest {
  paperId: ID;
  format: 'XLSX' | 'PDF';
}
