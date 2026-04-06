import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

export async function getOrCreateSampleSet(taskId: string) {
  let set = await prisma.sampleSet.findUnique({ where: { taskId } });
  if (!set) {
    set = await prisma.sampleSet.create({ data: { taskId } });
  }
  return set;
}

export async function listSamples(taskId: string) {
  const set = await prisma.sampleSet.findUnique({
    where: { taskId },
    include: {
      samples: {
        include: {
          stepExecutions: { orderBy: { executedAt: 'asc' } },
          files: {
            include: { fileRef: { select: { id: true, originalName: true, fileType: true } } },
          },
        },
        orderBy: { no: 'asc' },
      },
    },
  });
  if (!set) return { sampleSetId: null, samples: [] };
  return { sampleSetId: set.id, samples: set.samples };
}

export async function addSample(
  taskId: string,
  data: {
    no: number;
    content: string;
    fileIds?: string[];
    remark?: string;
    addedBy: string;
  },
) {
  const set = await getOrCreateSampleSet(taskId);

  return prisma.sample.create({
    data: {
      sampleSetId: set.id,
      no: data.no,
      content: data.content,
      remark: data.remark,
      addedBy: data.addedBy,
      files: data.fileIds?.length
        ? { create: data.fileIds.map((fileId) => ({ fileRefId: fileId })) }
        : undefined,
    },
  });
}

export async function updateSample(sampleId: string, data: { content?: string; remark?: string }) {
  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample) throw new AppError(404, '样本不存在');
  return prisma.sample.update({ where: { id: sampleId }, data });
}

export async function deleteSample(sampleId: string) {
  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample) throw new AppError(404, '样本不存在');
  await prisma.sample.delete({ where: { id: sampleId } });
  return { success: true };
}
