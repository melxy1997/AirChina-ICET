import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const aiRoutes = Router();

aiRoutes.use(requireAuth);

/** GET /ai-jobs/:id - 获取AI任务状态 */
aiRoutes.get('/:id', asyncHandler(async (req, res) => {
  // TODO: Phase 2 实现
  res.json({ id: req.params.id, status: 'QUEUED', message: 'Not implemented yet' });
}));

/** POST /ai-jobs/:id/cancel - 取消AI任务 */
aiRoutes.post('/:id/cancel', asyncHandler(async (_req, res) => {
  // TODO: Phase 2 实现
  res.json({ message: 'Not implemented yet' });
}));
