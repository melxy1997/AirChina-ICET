import { Router } from 'express';
import { paramStr } from '../lib/req-params.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as aiJobService from '../services/ai-job.service.js';

export const aiRoutes = Router();

aiRoutes.use(requireAuth);

/** GET /ai-jobs/:id - 获取AI任务状态 */
aiRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = paramStr(req.params.id);
    if (!id) throw new AppError(400, '无效的任务 ID');
    const job = await aiJobService.getJobById(id);
    res.json(job);
  }),
);

/** POST /ai-jobs/:id/cancel - 取消AI任务 */
aiRoutes.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const id = paramStr(req.params.id);
    if (!id) throw new AppError(400, '无效的任务 ID');
    const job = await aiJobService.cancelJob(id);
    res.json(job);
  }),
);
