/** 已像正常 UTF-8 显示的常见文字（中日韩等），不再做 latin1 误读修复 */
const LOOKS_LIKE_VALID_I18N =
  /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;

/**
 * multipart 里 Content-Disposition 的 filename 有时把 UTF-8 字节按 latin1 读入，导致中文乱码。
 * 若当前串不像已正常 UTF-8，但 latin1→utf8 后能得到常见多字节文字，则采用转换结果（兼容 Chrome 等）。
 */
export function decodeMultipartFilename(name: string): string {
  if (!name) return name;
  if (LOOKS_LIKE_VALID_I18N.test(name)) {
    return name;
  }
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (decoded !== name && LOOKS_LIKE_VALID_I18N.test(decoded)) {
      return decoded;
    }
  } catch {
    /* ignore */
  }
  return name;
}
