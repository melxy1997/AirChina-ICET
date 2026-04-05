import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const sampleRoutes = Router();

sampleRoutes.use(requireAuth);

/** GET /tasks/:id/samples - 获取样本列表 */
sampleRoutes.get('/:id/samples', asyncHandler(async (req, res) => {
  // TODO: Phase 1 实现
  res.json({ data: [] });
}));

/** POST /tasks/:id/samples - 添加样本 */
sampleRoutes.post('/:id/samples', asyncHandler(async (_req, res) => {
  // TODO: Phase 1 实现
  res.status(201).json({ message: 'Not implemented yet' });
}));

/** DELETE /tasks/:id/samples/:sid - 删除样本 */
sampleRoutes.delete('/:id/samples/:sid', asyncHandler(async (_req, res) => {
  // TODO: Phase 1 实现
  res.json({ message: 'Not implemented yet' });
}));
