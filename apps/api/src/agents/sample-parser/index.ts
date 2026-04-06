import { prisma } from '../../db/prisma.js';
import { getFileStream } from '../../services/file.service.js';
import * as aiJobService from '../../services/ai-job.service.js';
import { extractPdfFullText, type PageContent } from '../tools/pdf-extractor.js';
import { callLLM, extractJSON } from '../../lib/llm.js';
import { SAMPLE_EXTRACTION_SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';

interface SignatureItem {
  role: string;
  name: string;
  date?: string;
  pageRef?: number;
}

interface DateItem {
  label: string;
  value: string;
  pageRef?: number;
}

interface AmountItem {
  label: string;
  value: number;
  currency?: string;
  pageRef?: number;
}

interface LLMExtractionResult {
  signatures: SignatureItem[];
  dates: DateItem[];
  amounts: AmountItem[];
  structureSummary: string;
  summary: string;
}

export async function runSampleParser(jobId: string, sampleId: string): Promise<void> {
  await aiJobService.updateProgress(jobId, 5, '加载样本信息');

  // Load sample with file references
  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: {
      files: {
        include: { fileRef: true },
      },
    },
  });

  if (!sample) {
    throw new Error(`样本不存在: ${sampleId}`);
  }

  const pdfFiles = sample.files.filter(
    (f) => f.fileRef.fileType === 'PDF' || f.fileRef.mimeType.includes('pdf'),
  );

  if (pdfFiles.length === 0) {
    throw new Error('样本中没有可解析的 PDF 文件');
  }

  await aiJobService.updateProgress(jobId, 15, '提取 PDF 文本');

  // Extract text from all PDF files
  const allTexts: string[] = [];
  for (const fileLink of pdfFiles) {
    const { stream } = await getFileStream(fileLink.fileRef.id);
    const chunks: Buffer[] = [];
    if (stream && typeof (stream as NodeJS.ReadableStream)[Symbol.asyncIterator] === 'function') {
      for await (const chunk of stream as NodeJS.ReadableStream) {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
        } else if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk, 'binary'));
        } else {
          chunks.push(Buffer.from(chunk as Uint8Array));
        }
      }
    }
    const buffer = Buffer.concat(chunks);
    const text = await extractPdfFullText(buffer);
    allTexts.push(text);
  }

  const fullText = allTexts.join('\n\n---\n\n');

  if (!fullText.trim()) {
    throw new Error('PDF 文件中未能提取到文本内容');
  }

  await aiJobService.updateProgress(jobId, 40, '调用 AI 提取结构化信息');

  // Call LLM
  const { content, tokensUsed } = await callLLM({
    system: SAMPLE_EXTRACTION_SYSTEM_PROMPT,
    user: buildUserPrompt(fullText.slice(0, 12000)), // Limit to avoid token overflow
    jsonMode: true,
  });

  await aiJobService.updateProgress(jobId, 80, '保存解析结果');

  const extracted = extractJSON<LLMExtractionResult>(content);

  // Build parsedContent
  const parsedContent = {
    signatures: extracted.signatures ?? [],
    dates: extracted.dates ?? [],
    amounts: extracted.amounts ?? [],
    structureSummary: extracted.structureSummary ?? '',
    summary: extracted.summary ?? '',
    parsedAt: new Date().toISOString(),
    pages: pdfFiles.length,
  };

  await prisma.sample.update({
    where: { id: sampleId },
    // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field
    data: { parsedContent: parsedContent as any },
  });

  await aiJobService.completeJob(jobId, 'Sample', sampleId, tokensUsed);
}
