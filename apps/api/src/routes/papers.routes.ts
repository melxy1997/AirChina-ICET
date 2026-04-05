import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const paperRoutes = Router();

paperRoutes.use(requireAuth);

/** GET /tasks/:id/paper - 获取工作底稿 */
paperRoutes.get('/:id/paper', asyncHandler(async (req, res) => {
  // TODO: Phase 1 实现
  res.json({ taskId: req.params.id, message: 'Not implemented yet' });
}));

/** POST /tasks/:id/paper/generate - 生成底稿 */
paperRoutes.post('/:id/paper/generate', asyncHandler(async (_req, res) => {
  // TODO: Phase 1 实现
  res.json({ message: 'Not implemented yet' });
}));

/** POST /tasks/:id/paper/export - 导出Excel */
paperRoutes.post('/:id/paper/export', asyncHandler(async (_req, res) => {
  // TODO: Phase 1 实现
  res.json({ message: 'Not implemented yet' });
}));
