import { prisma } from '../../db/prisma.js';
import { getFileStream } from '../../services/file.service.js';
import * as aiJobService from '../../services/ai-job.service.js';
import { extractPdfFullText } from '../tools/pdf-extractor.js';
import { callLLM, extractJSON } from '../../lib/llm.js';
import {
  CONTROL_POINT_EXTRACTION_SYSTEM_PROMPT,
  buildControlPointPrompt,
} from './prompts.js';

interface RawControlPoint {
  controlId: string;
  title: string;
  description: string;
  responsible?: string;
  timing?: string;
  approvalChain?: string[];
  suggestedSteps?: string[];
  suggestedEvidenceTypes?: string[];
  confidence?: number;
  pageRefs?: number[];
}

function deduplicateControls(points: RawControlPoint[]): RawControlPoint[] {
  const seen = new Map<string, RawControlPoint>();
  for (const point of points) {
    if (!seen.has(point.controlId)) {
      seen.set(point.controlId, point);
    }
  }
  return Array.from(seen.values());
}

const BATCH_SIZE = 8000;

function splitIntoBatches(text: string, batchSize: number): string[] {
  const batches: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    batches.push(text.slice(offset, offset + batchSize));
    offset += batchSize;
  }
  return batches;
}

export async function runRegulationParser(jobId: string, regulationId: string): Promise<void> {
  await aiJobService.updateProgress(jobId, 5, '加载规章制度信息');

  const regulation = await prisma.regulation.findUnique({
    where: { id: regulationId },
    include: { fileRef: true },
  });

  if (!regulation) {
    throw new Error(`规章制度不存在: ${regulationId}`);
  }

  await aiJobService.updateProgress(jobId, 10, '提取 PDF 文本');

  // Get file stream and extract text
  const { stream } = await getFileStream(regulation.fileRefId);
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
  const fullText = await extractPdfFullText(buffer);

  if (!fullText.trim()) {
    throw new Error('PDF 文件中未能提取到文本内容');
  }

  await aiJobService.updateProgress(jobId, 20, '分批提取控制点');

  // Update regulation parse status to RUNNING
  await prisma.regulation.update({
    where: { id: regulationId },
    data: { parseStatus: 'RUNNING' },
  });

  // Split text into batches
  const batches = splitIntoBatches(fullText, BATCH_SIZE);
  const allControlPoints: RawControlPoint[] = [];
  let totalTokens = 0;
  let controlIdCounter = 1;

  for (let i = 0; i < batches.length; i++) {
    const progressPercent = 20 + Math.round((i / batches.length) * 60);
    await aiJobService.updateProgress(
      jobId,
      progressPercent,
      `处理第 ${i + 1}/${batches.length} 批次`,
    );

    const { content, tokensUsed } = await callLLM({
      system: CONTROL_POINT_EXTRACTION_SYSTEM_PROMPT,
      user: buildControlPointPrompt(batches[i], i, controlIdCounter),
      jsonMode: true,
    });

    totalTokens += tokensUsed;

    try {
      const parsed = extractJSON<RawControlPoint[] | { controlPoints?: RawControlPoint[] }>(content);
      const points = Array.isArray(parsed) ? parsed : (parsed.controlPoints ?? []);
      allControlPoints.push(...points);
      if (points.length > 0) {
        controlIdCounter += points.length;
      }
    } catch {
      console.warn(`[RegulationParser] 批次 ${i + 1} JSON 解析失败，跳过`);
    }
  }

  await aiJobService.updateProgress(jobId, 85, '去重并保存控制点');

  const deduped = deduplicateControls(allControlPoints);

  // Transaction: delete old control points → create new ones → update parseStatus
  await prisma.$transaction(async (tx) => {
    await tx.controlPoint.deleteMany({ where: { regulationId } });

    if (deduped.length > 0) {
      await tx.controlPoint.createMany({
        data: deduped.map((cp) => ({
          regulationId,
          controlId: cp.controlId,
          title: cp.title,
          description: cp.description,
          responsible: cp.responsible ?? null,
          timing: cp.timing ?? null,
          approvalChain: cp.approvalChain ?? [],
          suggestedSteps: cp.suggestedSteps ?? [],
          suggestedEvidenceTypes: cp.suggestedEvidenceTypes ?? [],
          confidence: cp.confidence ?? 0.8,
          pageRefs: cp.pageRefs ?? [],
        })),
      });
    }

    await tx.regulation.update({
      where: { id: regulationId },
      data: {
        parseStatus: 'COMPLETED',
        parsedAt: new Date(),
      },
    });
  });

  await aiJobService.completeJob(jobId, 'Regulation', regulationId, totalTokens);
}
