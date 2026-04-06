// pdf-parse doesn't have a proper ESM default export — use namespace import
import * as pdfParseModule from 'pdf-parse';

// Handle both CJS and ESM interop
const pdfParse: (buffer: Buffer, options?: object) => Promise<{ text: string; numpages: number }> =
  // biome-ignore lint/suspicious/noExplicitAny: CJS interop
  (pdfParseModule as any).default ?? pdfParseModule;

export interface PageContent {
  pageNumber: number;
  text: string;
}

/**
 * 按页提取 PDF 文本内容
 */
export async function extractPdfText(buffer: Buffer): Promise<PageContent[]> {
  const pages: PageContent[] = [];
  let pageIndex = 0;

  await pdfParse(buffer, {
    // biome-ignore lint/suspicious/noExplicitAny: pdf-parse internal API
    pagerender: (pageData: any) => {
      return (pageData.getTextContent() as Promise<{ items: { str: string; hasEOL?: boolean }[] }>).then(
        (textContent) => {
          const pageNum = ++pageIndex;
          const text = textContent.items
            .map((item) => item.str + (item.hasEOL ? '\n' : ''))
            .join('');
          pages.push({ pageNumber: pageNum, text });
          return text;
        },
      );
    },
  });

  return pages;
}

/**
 * 提取 PDF 全文（合并所有页面）
 */
export async function extractPdfFullText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text;
}
