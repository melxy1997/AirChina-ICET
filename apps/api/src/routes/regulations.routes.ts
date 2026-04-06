import { Router } from 'express';
import { paramStr } from '../lib/req-params.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { uploadMemory } from '../middleware/upload.middleware.js';
import * as regulationService from '../services/regulation.service.js';
import * as fileService from '../services/file.service.js';

export const regulationRoutes = Router();
regulationRoutes.use(requireAuth);

/** GET /regulations */
regulationRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await regulationService.listRegulations(orgId, page, pageSize);
    res.json(result);
  }),
);

/** POST /regulations — 上传规章制度文件到 S3，创建记录 */
regulationRoutes.post(
  '/',
  uploadMemory.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, '请上传规章制度文件');
    }
    const userId = req.userId!;
    const orgId = req.orgId!;
    const body = req.body;

    // 上传文件到 S3
    const fileRef = await fileService.uploadFile({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      uploadedBy: userId,
      prefix: 'regulations',
    });

    const result = await regulationService.createRegulation({
      organizationId: orgId,
      title: body.title || req.file.originalname,
      version: body.version || '1.0',
      effectiveDate: body.effectiveDate || undefined,
      expiryDate: body.expiryDate || undefined,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      storagePath: fileRef.storagePath,
      fileRefId: fileRef.id,
      uploadedBy: userId,
    });
    res.status(201).json(result);
  }),
);

/** GET /regulations/:id */
regulationRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const result = await regulationService.getRegulation(paramStr(req.params.id), orgId);
    res.json(result);
  }),
);

/** DELETE /regulations/:id */
regulationRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    await regulationService.deleteRegulation(paramStr(req.params.id), orgId);
    res.json({ success: true });
  }),
);
