import { Router } from 'express';
import { paramStr } from '../lib/req-params.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import { decodeMultipartFilename } from '../lib/multipart-filename.js';
import { uploadMemory } from '../middleware/upload.middleware.js';
import * as fileService from '../services/file.service.js';
import * as regulationService from '../services/regulation.service.js';
import * as aiJobService from '../services/ai-job.service.js';

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
    const originalName = decodeMultipartFilename(req.file.originalname);

    // 上传文件到 S3
    const fileRef = await fileService.uploadFile({
      buffer: req.file.buffer,
      originalName,
      mimeType: req.file.mimetype,
      uploadedBy: userId,
      prefix: 'regulations',
    });

    const result = await regulationService.createRegulation({
      organizationId: orgId,
      title: body.title || originalName,
      version: body.version || '1.0',
      effectiveDate: body.effectiveDate || undefined,
      expiryDate: body.expiryDate || undefined,
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

/** POST /regulations/:id/parse - 触发 AI 解析规章制度 */
regulationRoutes.post(
  '/:id/parse',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const regulationId = paramStr(req.params.id);
    if (!regulationId) throw new AppError(400, '无效的规章 ID');

    const regulation = await regulationService.getRegulation(regulationId, orgId);
    if (!regulation) throw new AppError(404, '规章制度不存在');

    const job = await aiJobService.createJob(
      'PARSE_REGULATION',
      'Regulation',
      regulationId,
      'REGULATION_PARSER',
    );

    res.status(202).json({ jobId: job.id });
  }),
);
