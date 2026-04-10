import { Worker } from 'bullmq';
import { prisma } from '../db/prisma.js';
import { redis } from '../lib/redis.js';
import * as aiJobService from '../services/ai-job.service.js';
import type { AIJobPayload } from './ai-job.queue.js';

export function startWorker(): Worker<AIJobPayload> {
  const worker = new Worker<AIJobPayload>(
    'ai-jobs',
    async (job) => {
      const { jobId, type, entityId } = job.data;

      // Mark job as RUNNING
      await prisma.aIJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      try {
        switch (type) {
          case 'PARSE_SAMPLE': {
            const { runSampleParser } = await import('../agents/sample-parser/index.js');
            await runSampleParser(jobId, entityId);
            break;
          }
          case 'PARSE_REGULATION': {
            const { runRegulationParser } = await import('../agents/regulation-parser/index.js');
            await runRegulationParser(jobId, entityId);
            break;
          }
          case 'GENERATE_TEST_PLAN': {
            const { runPlanGenerator } = await import('../agents/plan-generator/index.js');
            await runPlanGenerator(jobId, entityId);
            break;
          }
          case 'EXECUTE_STEP':
          case 'EXECUTE_ALL_STEPS': {
            const { runTestExecutor } = await import('../agents/test-executor/index.js');
            await runTestExecutor(jobId, entityId, type);
            break;
          }
          default:
            throw new Error(`未知的 AI 任务类型: ${type}`);
        }
      } catch (err) {
        await aiJobService.failJob(jobId, err);
        throw err;
      }
    },
    {
      connection: redis,
      concurrency: 3,
    },
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  return worker;
}
