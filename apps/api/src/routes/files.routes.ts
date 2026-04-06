import { Router } from 'express';
import { paramStr } from '../lib/req-params.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import { decodeMultipartFilename } from '../lib/multipart-filename.js';
import { uploadMemory } from '../middleware/upload.middleware.js';
import * as fileService from '../services/file.service.js';

export const fileRoutes = Router();
fileRoutes.use(requireAuth);

/** POST /files/upload - 上传文件到 S3 */
fileRoutes.post(
  '/upload',
  uploadMemory.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, '未提供文件');
    }
    const userId = req.userId!;
    const prefix = (req.body.prefix as string) || undefined;
    const fileRef = await fileService.uploadFile({
      buffer: req.file.buffer,
      originalName: decodeMultipartFilename(req.file.originalname),
      mimeType: req.file.mimetype,
      uploadedBy: userId,
      prefix,
    });
    res.status(201).json(fileRef);
  }),
);

/** GET /files/:id - 获取文件下载 URL */
fileRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const url = await fileService.getDownloadUrl(paramStr(req.params.id));
    res.json({ url });
  }),
);

/** GET /files/:id/download - 直接下载文件流 */
fileRoutes.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const { stream, contentType, originalName } = await fileService.getFileStream(
      paramStr(req.params.id),
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(originalName)}"`,
    );
    if (stream) {
      (stream as NodeJS.ReadableStream).pipe(res);
    } else {
      throw new AppError(500, '文件流获取失败');
    }
  }),
);

/** DELETE /files/:id - 删除文件 */
fileRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await fileService.deleteFile(paramStr(req.params.id));
    res.json({ success: true });
  }),
);
