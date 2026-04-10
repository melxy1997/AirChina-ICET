export interface CompareValuesResult {
  matches: boolean;
  difference?: string;
  value1?: string | number;
  value2?: string | number;
}

/**
 * Tool: compare_values
 * 比较两个值（数值/日期/字符串）是否匹配
 */
export function compareValues(
  value1: string | number,
  value2: string | number,
  tolerance?: number,
): CompareValuesResult {
  const num1 = typeof value1 === 'number' ? value1 : parseFloat(value1);
  const num2 = typeof value2 === 'number' ? value2 : parseFloat(value2);

  // Try numeric comparison
  if (!isNaN(num1) && !isNaN(num2)) {
    const diff = Math.abs(num1 - num2);
    const tol = tolerance ?? 0;
    if (diff <= tol) {
      return { matches: true, value1: num1, value2: num2 };
    }
    return {
      matches: false,
      difference: `差异: ${diff.toFixed(2)} (容差: ${tol})`,
      value1: num1,
      value2: num2,
    };
  }

  // String comparison (case-insensitive)
  const s1 = String(value1).trim().toLowerCase();
  const s2 = String(value2).trim().toLowerCase();

  if (s1 === s2) {
    return { matches: true, value1: s1, value2: s2 };
  }

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return { matches: true, value1: s1, value2: s2 };
  }

  return {
    matches: false,
    difference: `"${value1}" 与 "${value2}" 不匹配`,
    value1,
    value2,
  };
}
