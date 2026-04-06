import pdfParse from 'pdf-parse';

export interface PageContent {
  pageNumber: number;
  text: string;
}

/**
 * 按页提取 PDF 文本内容
 * pdf-parse 将页面分隔符嵌入到 text 中（\f 或 \n\n），逐页分割
 */
export async function extractPdfText(buffer: Buffer): Promise<PageContent[]> {
  const pages: PageContent[] = [];

  // Use render_page to capture per-page text
  let pageIndex = 0;
  await pdfParse(buffer, {
    pagerender: (pageData: { getTextContent: () => Promise<{ items: { str: string; hasEOL?: boolean }[] }> }) => {
      return pageData.getTextContent().then((textContent) => {
        const pageNum = ++pageIndex;
        const text = textContent.items
          .map((item) => item.str + (item.hasEOL ? '\n' : ''))
          .join('');
        pages.push({ pageNumber: pageNum, text });
        return text;
      });
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
