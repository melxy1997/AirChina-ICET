import crypto from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

export async function listRegulations(orgId: string, page = 1, pageSize = 20) {
  const where = { organizationId: orgId };
  const [data, total] = await Promise.all([
    prisma.regulation.findMany({
      where,
      include: {
        fileRef: { select: { id: true, originalName: true, fileType: true, sizeBytes: true } },
        _count: { select: { controlPoints: true, scenarios: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.regulation.count({ where }),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getRegulation(id: string, orgId: string) {
  const regulation = await prisma.regulation.findFirst({
    where: { id, organizationId: orgId },
    include: {
      fileRef: true,
      controlPoints: { orderBy: { controlId: 'asc' } },
      scenarios: { select: { id: true, name: true } },
    },
  });
  if (!regulation) throw new AppError(404, '规章制度不存在');
  return regulation;
}

export async function createRegulation(data: {
  organizationId: string;
  title: string;
  version: string;
  effectiveDate?: string;
  expiryDate?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  pageCount?: number;
  uploadedBy: string;
}) {
  const checksum = crypto.randomBytes(16).toString('hex'); // TODO: 真实 checksum
  const fileType = mapFileType(data.mimeType);

  const fileRef = await prisma.fileReference.create({
    data: {
      originalName: data.originalName,
      storagePath: data.storagePath,
      fileType,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      checksum,
      pageCount: data.pageCount,
      uploadedBy: data.uploadedBy,
    },
  });

  return prisma.regulation.create({
    data: {
      organizationId: data.organizationId,
      title: data.title,
      version: data.version,
      effectiveDate: data.effectiveDate,
      expiryDate: data.expiryDate,
      fileRefId: fileRef.id,
      parseStatus: 'QUEUED',
      createdBy: data.uploadedBy,
    },
    include: { fileRef: true },
  });
}

export async function deleteRegulation(id: string, orgId: string) {
  const regulation = await prisma.regulation.findFirst({ where: { id, organizationId: orgId } });
  if (!regulation) throw new AppError(404, '规章制度不存在');
  await prisma.regulation.delete({ where: { id } });
  return { success: true };
}

function mapFileType(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('image')) return 'IMAGE';
  if (mimeType.includes('sheet')) return 'EXCEL';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'WORD';
  return 'OTHER';
}
