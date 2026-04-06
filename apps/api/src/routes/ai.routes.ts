import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import * as aiJobService from '../services/ai-job.service.js';

export const aiRoutes = Router();

aiRoutes.use(requireAuth);

/** GET /ai-jobs/:id - 获取AI任务状态 */
aiRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const job = await aiJobService.getJobById(req.params.id);
    res.json(job);
  }),
);

/** POST /ai-jobs/:id/cancel - 取消AI任务 */
aiRoutes.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const job = await aiJobService.cancelJob(req.params.id);
    res.json(job);
  }),
);
