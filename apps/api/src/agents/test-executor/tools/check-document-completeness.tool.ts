import type { SampleParsedContent } from '@icet/shared';
import { searchText } from './search-text.tool.js';

export interface CompletenessCheckResult {
  complete: boolean;
  missingFields: string[];
  presentFields: string[];
  summary: string;
}

/**
 * Tool: check_completeness
 * 检查样本中是否包含所有必需字段
 */
export function checkCompleteness(
  requiredFields: string[],
  parsedContent: SampleParsedContent,
): CompletenessCheckResult {
  const presentFields: string[] = [];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const fieldLower = field.toLowerCase();

    // Check in signatures
    const sigFound = (parsedContent.signatures ?? []).some(
      (s) => s.signerHint?.toLowerCase().includes(fieldLower),
    );

    // Check in dates
    const dateFound = (parsedContent.dates ?? []).some(
      (d) => d.fieldContext?.toLowerCase().includes(fieldLower),
    );

    // Check in amounts
    const amountFound = (parsedContent.amounts ?? []).some(
      (a) => a.fieldContext?.toLowerCase().includes(fieldLower),
    );

    // Check in text content via search
    let textFound = false;
    if (parsedContent.pages && parsedContent.pages.length > 0) {
      const result = searchText(field, parsedContent.pages);
      textFound = result.found;
    }

    if (sigFound || dateFound || amountFound || textFound) {
      presentFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  const complete = missingFields.length === 0;

  return {
    complete,
    missingFields,
    presentFields,
    summary: complete
      ? `所有 ${requiredFields.length} 个必需字段均已找到`
      : `缺少以下字段: ${missingFields.join('、')}`,
  };
}
