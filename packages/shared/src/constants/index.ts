import type { TaskStatus } from '../types/base';

/** 任务状态中文标签 */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  DRAFT: '草稿',
  PLANNING: '规划中',
  PLAN_REVIEW: '计划审核',
  EXECUTING: '执行中',
  EXEC_REVIEW: '结果审核',
  PAPER_DRAFT: '底稿草稿',
  PAPER_REVIEW: '底稿审阅',
  ARCHIVED: '已归档',
  CANCELLED: '已取消',
};

/** 允许的状态转换规则 */
export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  DRAFT: ['PLANNING', 'CANCELLED'],
  PLANNING: ['PLAN_REVIEW', 'DRAFT'],
  PLAN_REVIEW: ['EXECUTING', 'PLANNING'],
  EXECUTING: ['EXEC_REVIEW', 'PLAN_REVIEW'],
  EXEC_REVIEW: ['PAPER_DRAFT', 'EXECUTING'],
  PAPER_DRAFT: ['PAPER_REVIEW', 'EXEC_REVIEW'],
  PAPER_REVIEW: ['ARCHIVED', 'PAPER_DRAFT'],
  ARCHIVED: [],
  CANCELLED: [],
};

/** AI Agent 并发数 */
export const AI_EXECUTION_CONCURRENCY = 3;

/** AI Agent 最大工具调用次数 */
export const MAX_TOOL_CALLS = 10;

/** 系统用户ID（AI操作使用） */
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

/** API 版本前缀 */
export const API_PREFIX = '/api/v1';
