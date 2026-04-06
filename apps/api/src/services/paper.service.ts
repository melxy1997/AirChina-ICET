import { buildWorkbook } from '@icet/excel-generator';
import type {
  SamplingMethod,
  StepResultValue,
  WorkingPaper as WorkingPaperType,
} from '@icet/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

export async function generatePaper(
  taskId: string,
  orgId: string,
  overrides?: {
    controlDescription?: string;
    testResult?: { controlIds: string; result: string };
    completionDate?: string;
  },
) {
  const task = await prisma.testTask.findFirst({
    where: { id: taskId, organizationId: orgId },
    include: {
      scenario: true,
      tester: { select: { name: true } },
      reviewer: { select: { name: true } },
      plan: { include: { steps: { orderBy: { index: 'asc' } } } },
      sampleSet: {
        include: { samples: { include: { stepExecutions: true }, orderBy: { no: 'asc' } } },
      },
      anomalies: { where: { status: { not: 'RESOLVED' } } },
      taskRegulations: { include: { regulation: true } },
    },
  });
  if (!task) throw new AppError(404, '测试任务不存在');

  const steps = task.plan?.steps ?? [];
  const samples = task.sampleSet?.samples ?? [];

  // 构建快照数据
  const snapshot: WorkingPaperType = {
    id: '',
    taskId,
    documentName: '内部控制评价测试工作底稿',
    unitName: task.unitName,
    processLevel1: task.scenario.processLevel1,
    processLevel2: task.scenario.processLevel2,
    processLevel3: task.scenario.processLevel3 ?? '',
    paperId: task.paperId,
    testerName: task.tester.name,
    reviewerName: task.reviewer?.name ?? '',
    completionDate:
      overrides?.completionDate ?? task.completionDate ?? new Date().toISOString().slice(0, 10),
    sampling: {
      method: task.samplingMethod as SamplingMethod,
      period: task.samplingPeriod,
      sampleCount: samples.length,
      sampleSource: task.samplingSource,
    },
    controlDescription: overrides?.controlDescription ?? task.plan?.controlDescription ?? '',
    testResult: overrides?.testResult ?? { controlIds: '', result: '' },
    steps: steps.map((s) => ({ index: s.index, description: s.description })),
    samples: samples.map((s) => ({
      no: s.no,
      content: s.content,
      stepResults: steps.map((step) => {
        const exec = s.stepExecutions.find((e) => e.stepId === step.id);
        return (exec?.result ?? 'PENDING') as StepResultValue;
      }),
      remark: s.remark ?? undefined,
    })),
    anomalies: task.anomalies.map((a) => ({
      findingNo: a.findingNo,
      description: a.description,
      stepNo: a.stepNo,
      sampleNo: a.sampleNo,
      supportingDoc: a.supportingDoc,
    })),
    status: 'DRAFT',
    exportedFiles: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Upsert working paper
  const paper = await prisma.workingPaper.upsert({
    where: { taskId },
    create: {
      taskId,
      snapshotData: snapshot as unknown as Prisma.InputJsonValue,
      status: 'DRAFT',
    },
    update: { snapshotData: snapshot as unknown as Prisma.InputJsonValue },
  });

  return paper;
}

export async function exportPaperExcel(paperId: string, _orgId: string): Promise<Buffer> {
  const paper = await prisma.workingPaper.findFirst({
    where: { id: paperId },
  });
  if (!paper) throw new AppError(404, '工作底稿不存在');

  const snapshot = paper.snapshotData as unknown as WorkingPaperType;
  const buffer = buildWorkbook(snapshot);

  // 记录导出
  // TODO: 保存文件到 MinIO 并记录 ExportedFile

  return Buffer.from(buffer);
}

export async function submitPaper(paperId: string, submittedBy: string) {
  const paper = await prisma.workingPaper.findUnique({ where: { id: paperId } });
  if (!paper) throw new AppError(404, '工作底稿不存在');
  return prisma.workingPaper.update({
    where: { id: paperId },
    data: { status: 'SUBMITTED', submittedBy, submittedAt: new Date() },
  });
}

export async function approvePaper(paperId: string, approvedBy: string, comment?: string) {
  const paper = await prisma.workingPaper.findUnique({ where: { id: paperId } });
  if (!paper) throw new AppError(404, '工作底稿不存在');
  return prisma.workingPaper.update({
    where: { id: paperId },
    data: { status: 'APPROVED', approvedBy, approvedAt: new Date(), approvalComment: comment },
  });
}
