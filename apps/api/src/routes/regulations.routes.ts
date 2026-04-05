import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const regulationRoutes = Router();

regulationRoutes.use(requireAuth);

/** GET /regulations - 获取规章制度列表 */
regulationRoutes.get('/', asyncHandler(async (_req, res) => {
  // TODO: Phase 1 实现
  res.json({ data: [] });
}));

/** POST /regulations - 上传规章制度 */
regulationRoutes.post('/', asyncHandler(async (_req, res) => {
  // TODO: Phase 1 实现
  res.status(201).json({ message: 'Not implemented yet' });
}));

/** GET /regulations/:id - 获取规章制度详情 */
regulationRoutes.get('/:id', asyncHandler(async (req, res) => {
  // TODO: Phase 1 实现
  res.json({ id: req.params.id, message: 'Not implemented yet' });
}));

/** POST /regulations/:id/parse - 触发AI解析 */
regulationRoutes.post('/:id/parse', asyncHandler(async (_req, res) => {
  // TODO: Phase 2 实现
  res.json({ message: 'Not implemented yet' });
}));
