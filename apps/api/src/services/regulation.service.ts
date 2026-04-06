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
      scenarios: { select: { scenario: { select: { id: true, name: true } } } },
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
  fileRefId: string;
  uploadedBy: string;
}) {
  return prisma.regulation.create({
    data: {
      organizationId: data.organizationId,
      title: data.title,
      version: data.version,
      effectiveDate: data.effectiveDate,
      expiryDate: data.expiryDate,
      fileRefId: data.fileRefId,
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
