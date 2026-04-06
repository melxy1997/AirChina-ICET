import type { TaskStatus } from '@icet/shared';
import { isTransitionAllowed } from '@icet/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

export async function listTasks(
  orgId: string,
  page = 1,
  pageSize = 20,
  filters?: { status?: string; testerId?: string },
) {
  const where: Prisma.TestTaskWhereInput = { organizationId: orgId };
  if (filters?.status) where.status = filters.status;
  if (filters?.testerId) where.testerId = filters.testerId;

  const [data, total] = await Promise.all([
    prisma.testTask.findMany({
      where,
      include: {
        scenario: { select: { id: true, name: true, processLevel1: true, processLevel2: true } },
        tester: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        _count: { select: { anomalies: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.testTask.count({ where }),
  ]);
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getTask(id: string, orgId: string) {
  const task = await prisma.testTask.findFirst({
    where: { id, organizationId: orgId },
    include: {
      scenario: true,
      tester: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      plan: { include: { steps: { orderBy: { index: 'asc' } } } },
      sampleSet: {
        include: {
          samples: {
            include: { stepExecutions: true, files: { include: { fileRef: true } } },
            orderBy: { no: 'asc' },
          },
        },
      },
      workingPaper: true,
      statusHistory: { orderBy: { changedAt: 'desc' } },
      anomalies: { orderBy: { createdAt: 'desc' } },
      taskRegulations: { include: { regulation: { select: { id: true, title: true } } } },
    },
  });
  if (!task) throw new AppError(404, '测试任务不存在');
  return task;
}

export async function createTask(data: {
  organizationId: string;
  scenarioId: string;
  paperId: string;
  unitName: string;
  testerId: string;
  reviewerId?: string;
  regulationIds: string[];
  samplingMethod: string;
  samplingPeriod: string;
  samplingSource: string;
  createdBy: string;
}) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.testTask.create({
      data: {
        organizationId: data.organizationId,
        scenarioId: data.scenarioId,
        paperId: data.paperId,
        unitName: data.unitName,
        testerId: data.testerId,
        reviewerId: data.reviewerId,
        status: 'DRAFT',
        samplingMethod: data.samplingMethod,
        samplingPeriod: data.samplingPeriod,
        samplingSource: data.samplingSource,
        createdBy: data.createdBy,
        statusHistory: {
          create: { status: 'DRAFT', changedBy: data.createdBy },
        },
      },
    });

    // 关联规章制度
    if (data.regulationIds.length > 0) {
      await tx.testTaskRegulation.createMany({
        data: data.regulationIds.map((regId) => ({
          taskId: task.id,
          regulationId: regId,
        })),
      });
    }

    return task;
  });
}

export async function updateTask(
  id: string,
  orgId: string,
  data: {
    paperId?: string;
    unitName?: string;
    testerId?: string;
    completionDate?: string | null;
    reviewerId?: string | null;
    samplingMethod?: string;
    samplingPeriod?: string;
    samplingSource?: string;
  },
) {
  const task = await prisma.testTask.findFirst({ where: { id, organizationId: orgId } });
  if (!task) throw new AppError(404, '测试任务不存在');
  return prisma.testTask.update({ where: { id }, data });
}

export async function transitionStatus(
  id: string,
  orgId: string,
  newStatus: TaskStatus,
  changedBy: string,
  comment?: string,
) {
  const task = await prisma.testTask.findFirst({ where: { id, organizationId: orgId } });
  if (!task) throw new AppError(404, '测试任务不存在');

  if (!isTransitionAllowed(task.status as TaskStatus, newStatus)) {
    throw new AppError(400, `不允许从 "${task.status}" 转换到 "${newStatus}"`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.testTask.update({
      where: { id },
      data: { status: newStatus },
    });
    await tx.taskStatusHistory.create({
      data: { taskId: id, status: newStatus, changedBy, comment },
    });
    return updated;
  });
}
