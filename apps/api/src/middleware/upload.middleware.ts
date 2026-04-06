import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';

/** 内存存储配置（小文件） */
const memoryStorage = multer.memoryStorage();

/** 磁盘存储配置（大文件） */
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

/** 文件大小限制: 100MB */
const limits = {
  fileSize: 100 * 1024 * 1024,
};

/** 允许的文件类型 */
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/tiff',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`));
  }
};

export const uploadMemory = multer({ storage: memoryStorage, limits, fileFilter });
export const uploadDisk = multer({ storage: diskStorage, limits, fileFilter });
