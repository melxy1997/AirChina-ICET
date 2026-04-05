/** 通用ID类型（UUID v4） */
export type ID = string;
/** ISO 8601 时间戳字符串 */
export type Timestamp = string;
/** 步骤执行结果 */
export type StepResultValue = '✓' | '×' | 'N/A' | 'PENDING';
/** 测试任务整体状态机 */
export type TaskStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'PLAN_REVIEW'
  | 'EXECUTING'
  | 'EXEC_REVIEW'
  | 'PAPER_DRAFT'
  | 'PAPER_REVIEW'
  | 'ARCHIVED'
  | 'CANCELLED';
/** AI处理任务状态 */
export type AIJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
/** 文件类型 */
export type FileType = 'PDF' | 'IMAGE' | 'EXCEL' | 'WORD' | 'OTHER';
/** 抽样方法 */
export type SamplingMethod = '随机抽样' | '系统抽样' | '判断抽样' | '全量检查';
/** 用户角色 */
export type UserRole = 'ADMIN' | 'TESTER' | 'REVIEWER' | 'VIEWER';
/** 步骤检查类型 */
export type StepCheckType =
  | 'SIGNATURE_PRESENCE'
  | 'SIGNATURE_CHAIN'
  | 'CONTENT_EXISTENCE'
  | 'CONTENT_MATCH'
  | 'DATE_VALIDITY'
  | 'AMOUNT_MATCH'
  | 'DOCUMENT_COMPLETENESS'
  | 'FREE_FORM_AI';
/** AI任务类型 */
export type AIJobType =
  | 'PARSE_REGULATION'
  | 'GENERATE_TEST_PLAN'
  | 'PARSE_SAMPLE'
  | 'EXECUTE_STEP'
  | 'EXECUTE_ALL_STEPS'
  | 'GENERATE_SUMMARY';
/** Agent类型 */
export type AgentType = 'REGULATION_PARSER' | 'PLAN_GENERATOR' | 'SAMPLE_PARSER' | 'TEST_EXECUTOR';
