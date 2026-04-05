import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const taskRoutes = Router();

taskRoutes.use(requireAuth);

/** GET /tasks - 获取任务列表 */
taskRoutes.get('/', asyncHandler(async (_req, res) => {
  // TODO: Phase 1 实现
  res.json({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
}));

/** POST /tasks - 创建任务 */
taskRoutes.post('/', asyncHandler(async (_req, res) => {
  // TODO: Phase 1 实现
  res.status(201).json({ message: 'Not implemented yet' });
}));

/** GET /tasks/:id - 获取任务详情 */
taskRoutes.get('/:id', asyncHandler(async (req, res) => {
  // TODO: Phase 1 实现
  res.json({ id: req.params.id, message: 'Not implemented yet' });
}));

/** PUT /tasks/:id - 更新任务 */
taskRoutes.put('/:id', asyncHandler(async (req, res) => {
  // TODO: Phase 1 实现
  res.json({ message: 'Not implemented yet' });
}));

/** PATCH /tasks/:id/status - 推进任务状态 */
taskRoutes.patch('/:id/status', asyncHandler(async (req, res) => {
  // TODO: Phase 1 实现
  res.json({ message: 'Not implemented yet' });
}));
