import { ALLOWED_TRANSITIONS } from '../constants';
import type { StepResultValue, TaskStatus } from '../types/base';

/** 验证状态转换是否合法 */
export function isTransitionAllowed(current: TaskStatus, target: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(target) ?? false;
}

/** 验证步骤执行结果值 */
export function isValidStepResult(value: string): value is StepResultValue {
  return ['✓', '×', 'N/A', 'PENDING'].includes(value);
}

/** 验证 UUID 格式 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
