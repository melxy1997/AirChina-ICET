import { isValidStepResult } from '@icet/shared';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

export async function updateStepResult(data: {
  sampleId: string;
  stepId: string;
  result: string;
  executedBy: string;
  humanNote?: string;
}) {
  if (!isValidStepResult(data.result)) {
    throw new AppError(400, `无效的执行结果: ${data.result}，允许值: ✓, ×, N/A, PENDING`);
  }

  return prisma.stepExecution.upsert({
    where: {
      sampleId_stepId: { sampleId: data.sampleId, stepId: data.stepId },
    },
    create: {
      sampleId: data.sampleId,
      stepId: data.stepId,
      result: data.result,
      executedBy: 'HUMAN',
      humanNote: data.humanNote,
    },
    update: {
      result: data.result,
      executedBy: 'HUMAN',
      humanOverride: true,
      humanOverrideBy: data.executedBy,
      humanOverrideAt: new Date(),
      humanNote: data.humanNote,
    },
  });
}

export async function batchUpdateResults(
  items: {
    sampleId: string;
    stepId: string;
    result: string;
    executedBy: string;
    humanNote?: string;
  }[],
) {
  const results = await Promise.all(items.map((item) => updateStepResult(item)));
  return { updated: results.length };
}
