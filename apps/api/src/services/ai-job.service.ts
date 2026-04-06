import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { broadcast } from '../websocket/server.js';
import { aiJobQueue } from '../queue/ai-job.queue.js';

export async function createJob(
  type: string,
  inputEntityType: string,
  inputEntityId: string,
  agentType: string,
) {
  const job = await prisma.aIJob.create({
    data: {
      type,
      inputEntityType,
      inputEntityId,
      agentType,
      status: 'QUEUED',
    },
  });

  await aiJobQueue.add(type, {
    jobId: job.id,
    type,
    entityId: inputEntityId,
  });

  return job;
}

export async function updateProgress(
  jobId: string,
  progress: number,
  currentStep?: string,
) {
  const job = await prisma.aIJob.update({
    where: { id: jobId },
    data: { progress, currentStep: currentStep ?? null },
  });

  // Determine room based on entity type
  broadcast(job.inputEntityId, 'ai_job.progress', {
    jobId,
    progress,
    currentStep,
    inputEntityType: job.inputEntityType,
    inputEntityId: job.inputEntityId,
  });

  return job;
}

export async function completeJob(
  jobId: string,
  outputEntityType?: string,
  outputEntityId?: string,
  tokensUsed?: number,
) {
  const startTime = await prisma.aIJob.findUnique({
    where: { id: jobId },
    select: { startedAt: true, inputEntityId: true, inputEntityType: true },
  });

  const durationMs = startTime?.startedAt
    ? Date.now() - startTime.startedAt.getTime()
    : null;

  const job = await prisma.aIJob.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      progress: 100,
      completedAt: new Date(),
      outputEntityType: outputEntityType ?? null,
      outputEntityId: outputEntityId ?? null,
      tokensUsed: tokensUsed ?? null,
      durationMs: durationMs ?? null,
    },
  });

  broadcast(job.inputEntityId, 'ai_job.completed', {
    jobId,
    outputEntityType,
    outputEntityId,
    inputEntityType: job.inputEntityType,
    inputEntityId: job.inputEntityId,
  });

  return job;
}

export async function failJob(jobId: string, error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));

  const job = await prisma.aIJob.update({
    where: { id: jobId },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      errorMessage: err.message,
      errorStack: err.stack ?? null,
    },
  });

  broadcast(job.inputEntityId, 'ai_job.failed', {
    jobId,
    error: err.message,
    inputEntityType: job.inputEntityType,
    inputEntityId: job.inputEntityId,
  });

  return job;
}

export async function getJobById(jobId: string) {
  const job = await prisma.aIJob.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError(404, 'AI 任务不存在');
  return job;
}

export async function cancelJob(jobId: string) {
  const existing = await prisma.aIJob.findUnique({ where: { id: jobId } });
  if (!existing) throw new AppError(404, 'AI 任务不存在');
  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    throw new AppError(400, `任务状态为 ${existing.status}，无法取消`);
  }

  return prisma.aIJob.update({
    where: { id: jobId },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });
}
