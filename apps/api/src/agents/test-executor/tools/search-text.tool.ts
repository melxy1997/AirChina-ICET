import type { PageContent } from '../../tools/pdf-extractor.js';

export interface SearchResult {
  found: boolean;
  matches: {
    page: number;
    snippet: string;
    contextBefore: string;
    contextAfter: string;
  }[];
}

/**
 * Tool: search_text
 * 在样本内容中搜索关键词或短语
 */
export function searchText(
  query: string,
  pages: PageContent[],
  pageRange?: { start: number; end: number },
): SearchResult {
  const targetPages = pageRange
    ? pages.filter((p) => p.pageNumber >= pageRange.start && p.pageNumber <= pageRange.end)
    : pages;

  const matches: SearchResult['matches'] = [];
  const queryLower = query.toLowerCase();
  const SNIPPET_LEN = 80;

  for (const page of targetPages) {
    const text = page.text;
    const textLower = text.toLowerCase();
    let offset = 0;

    while (true) {
      const idx = textLower.indexOf(queryLower, offset);
      if (idx === -1) break;

      const start = Math.max(0, idx - SNIPPET_LEN);
      const end = Math.min(text.length, idx + query.length + SNIPPET_LEN);
      const snippet = text.slice(idx, idx + query.length);
      const contextBefore = start > 0 ? `...${text.slice(start, idx)}` : text.slice(start, idx);
      const contextAfter =
        end < text.length ? `${text.slice(idx + query.length, end)}...` : text.slice(idx + query.length, end);

      matches.push({
        page: page.pageNumber,
        snippet,
        contextBefore,
        contextAfter,
      });

      offset = idx + query.length;
    }
  }

  return {
    found: matches.length > 0,
    matches,
  };
}
