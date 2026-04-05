/** 获取当前 ISO 8601 时间戳 */
export function now(): string {
  return new Date().toISOString();
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/** 格式化日期为中文格式 YYYY年MM月DD日 */
export function formatDateCN(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
}
