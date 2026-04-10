import type { SampleParsedContent } from '@icet/shared';

export interface ExtractFieldResult {
  found: boolean;
  value?: string | number | null;
  context?: string;
  page?: number;
}

/**
 * Tool: extract_field
 * 从样本解析结果中提取指定字段的值
 */
export function extractField(
  fieldName: string,
  fieldType: 'date' | 'amount' | 'text',
  parsedContent: SampleParsedContent,
  searchTextFn?: (query: string, pages: SampleParsedContent['pages']) => { found: boolean; matches: { page: number; snippet: string }[] },
): ExtractFieldResult {
  const fieldLower = fieldName.toLowerCase();

  switch (fieldType) {
    case 'date': {
      const dates = parsedContent.dates ?? [];
      const matched = dates.find(
        (d) =>
          d.fieldContext?.toLowerCase().includes(fieldLower),
      );
      if (matched) {
        return {
          found: true,
          value: matched.value,
          context: matched.fieldContext,
          page: matched.location?.page,
        };
      }
      break;
    }
    case 'amount': {
      const amounts = parsedContent.amounts ?? [];
      const matched = amounts.find(
        (a) =>
          a.fieldContext?.toLowerCase().includes(fieldLower),
      );
      if (matched) {
        return {
          found: true,
          value: matched.value,
          context: `${matched.value} ${matched.currency ?? ''}`,
          page: matched.location?.page,
        };
      }
      break;
    }
    case 'text': {
      // For text fields, use search if available
      if (searchTextFn && parsedContent.pages?.length > 0) {
        const searchResult = searchTextFn(fieldName, parsedContent.pages);
        if (searchResult.found) {
          return {
            found: true,
            value: searchResult.matches[0].snippet,
            context: searchResult.matches[0].snippet,
            page: searchResult.matches[0].page,
          };
        }
      }
      break;
    }
  }

  return {
    found: false,
    value: null,
    context: `未在文档中找到 "${fieldName}"`,
  };
}
