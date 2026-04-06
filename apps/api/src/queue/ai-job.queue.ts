import { Queue } from 'bullmq';
import { redis } from '../lib/redis.js';

export interface AIJobPayload {
  jobId: string;
  type: string;
  entityId: string;
}

export const aiJobQueue = new Queue<AIJobPayload>('ai-jobs', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
