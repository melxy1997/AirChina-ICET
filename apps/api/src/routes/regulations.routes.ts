import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadMemory } from '../middleware/upload.middleware.js';
import * as regulationService from '../services/regulation.service.js';

export const regulationRoutes = Router();
regulationRoutes.use(requireAuth);

/** GET /regulations */
regulationRoutes.get('/', asyncHandler(async (req, res) => {
  const orgId = (req as any).userId; // TODO
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await regulationService.listRegulations(orgId, page, pageSize);
  res.json(result);
}));

/** POST /regulations */
regulationRoutes.post('/', uploadMemory.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: { message: '请上传规章制度文件' } });
    return;
  }
  const userId = (req as any).userId;
  const body = req.body;
  // TODO: 上传文件到 MinIO，获取 storagePath
  const storagePath = `regulations/${Date.now()}-${req.file.originalname}`;
  const result = await regulationService.createRegulation({
    organizationId: 'TODO', // TODO
    title: body.title || req.file.originalname,
    version: body.version || '1.0',
    effectiveDate: body.effectiveDate || undefined,
    expiryDate: body.expiryDate || undefined,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    storagePath,
    pageCount: undefined,
    uploadedBy: userId,
  });
  res.status(201).json(result);
}));

/** GET /regulations/:id */
regulationRoutes.get('/:id', asyncHandler(async (req, res) => {
  const orgId = (req as any).userId; // TODO
  const result = await regulationService.getRegulation(req.params.id, orgId);
  res.json(result);
}));

/** DELETE /regulations/:id */
regulationRoutes.delete('/:id', asyncHandler(async (req, res) => {
  const orgId = (req as any).userId; // TODO
  await regulationService.deleteRegulation(req.params.id, orgId);
  res.json({ success: true });
}));
