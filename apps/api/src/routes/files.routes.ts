import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadMemory } from '../middleware/upload.middleware.js';

export const fileRoutes = Router();

fileRoutes.use(requireAuth);

/** POST /files/upload - 上传文件 */
fileRoutes.post('/upload', uploadMemory.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: { message: '未提供文件' } });
    return;
  }
  // TODO: Phase 1 实现文件存储
  res.json({
    id: 'temp-id',
    originalName: req.file.originalname,
    size: req.file.size,
    message: 'Not implemented yet',
  });
}));

/** GET /files/:id - 下载文件 */
fileRoutes.get('/:id', asyncHandler(async (req, res) => {
  // TODO: Phase 1 实现
  res.json({ id: req.params.id, message: 'Not implemented yet' });
}));
