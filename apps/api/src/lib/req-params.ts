/** Express `req.params` 在部分类型版本下为 `string | string[]`，统一成 string */
export function paramStr(p: string | string[] | undefined): string {
  if (p == null) return '';
  return Array.isArray(p) ? p[0] ?? '' : p;
}
