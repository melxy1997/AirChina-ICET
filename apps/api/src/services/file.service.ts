import crypto from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { decodeMultipartFilename } from '../lib/multipart-filename.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

// ── S3 Client 单例 ──

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    // MinIO 等 S3 兼容服务：SDK 默认 WHEN_SUPPORTED 会为 PutObject 附加 flexible checksum 头，
    // 常与 MinIO 的 SigV4 校验不一致 → SignatureDoesNotMatch。开发环境用 WHEN_REQUIRED 关闭默认校验头。
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://127.0.0.1:9000',
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return s3Client;
}

const BUCKET = process.env.S3_BUCKET || 'icet-files';

/** 确保存储桶存在（应用启动时调用） */
export async function ensureBucket(): Promise<void> {
  const client = getS3Client();
  try {
    await client.send(
      new (await import('@aws-sdk/client-s3')).CreateBucketCommand({ Bucket: BUCKET }),
    );
    console.log(`[S3] 存储桶 "${BUCKET}" 已创建`);
  } catch (err: unknown) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number }; message?: string };
    if (e.name === 'BucketAlreadyOwnedByYou' || e.$metadata?.httpStatusCode === 409) {
      console.log(`[S3] 存储桶 "${BUCKET}" 已存在`);
    } else {
      console.error(`[S3] 检查存储桶失败:`, e.message ?? err);
    }
  }
}

/** 上传文件到 S3，同时创建 FileReference 记录 */
export async function uploadFile(data: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  uploadedBy: string;
  prefix?: string;
}) {
  const ext = data.originalName.split('.').pop() || 'bin';
  const key = `${data.prefix || 'uploads'}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const checksum = crypto.createHash('sha256').update(data.buffer).digest('hex');

  const client = getS3Client();
  // S3 Metadata 仅允许 ASCII；中文文件名会导致部分兼容存储签名异常，故用 base64 保留原名
  const safeMetaName = Buffer.from(data.originalName, 'utf8').toString('base64');
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: data.buffer,
      ContentType: data.mimeType,
      Metadata: {
        'original-name-b64': safeMetaName,
        checksum,
      },
    }),
  );

  const fileType = mapFileType(data.mimeType);

  const fileRef = await prisma.fileReference.create({
    data: {
      originalName: data.originalName,
      storagePath: key,
      fileType,
      mimeType: data.mimeType,
      sizeBytes: data.buffer.length,
      checksum,
      uploadedBy: data.uploadedBy,
    },
  });

  return fileRef;
}

/** 获取文件下载 URL（预签名，有效期 1 小时） */
export async function getDownloadUrl(fileRefId: string): Promise<string> {
  const fileRef = await prisma.fileReference.findUnique({ where: { id: fileRefId } });
  if (!fileRef) throw new AppError(404, '文件不存在');

  const client = getS3Client();
  const displayName = decodeMultipartFilename(fileRef.originalName);
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: fileRef.storagePath,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(displayName)}"`,
    }),
    { expiresIn: 3600 },
  );

  return url;
}

/** 获取文件流（用于直接下载） */
export async function getFileStream(fileRefId: string) {
  const fileRef = await prisma.fileReference.findUnique({ where: { id: fileRefId } });
  if (!fileRef) throw new AppError(404, '文件不存在');

  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: fileRef.storagePath,
    }),
  );

  return {
    stream: response.Body,
    contentType: fileRef.mimeType,
    originalName: decodeMultipartFilename(fileRef.originalName),
    sizeBytes: fileRef.sizeBytes,
  };
}

/** 删除文件 */
export async function deleteFile(fileRefId: string): Promise<void> {
  const fileRef = await prisma.fileReference.findUnique({ where: { id: fileRefId } });
  if (!fileRef) throw new AppError(404, '文件不存在');

  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fileRef.storagePath }));
  await prisma.fileReference.delete({ where: { id: fileRefId } });
}

function mapFileType(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('image')) return 'IMAGE';
  if (mimeType.includes('sheet')) return 'EXCEL';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'WORD';
  return 'OTHER';
}
