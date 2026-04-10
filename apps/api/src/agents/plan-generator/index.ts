import { prisma } from '../../db/prisma.js';
import * as aiJobService from '../../services/ai-job.service.js';
import { generatePlan } from './generator.chain.js';
import { transitionStatus } from '../../services/task.service.js';
import { SYSTEM_USER_ID } from '@icet/shared';

export async function runPlanGenerator(jobId: string, taskId: string): Promise<void> {
  await aiJobService.updateProgress(jobId, 5, '加载任务信息');

  const task = await prisma.testTask.findUnique({
    where: { id: taskId },
    include: {
      taskRegulations: {
        include: {
          regulation: {
            include: {
              controlPoints: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    throw new Error(`测试任务不存在: ${taskId}`);
  }

  // Collect all control points from all regulations
  const allControlPoints = task.taskRegulations.flatMap((tr) =>
    tr.regulation.controlPoints.map((cp) => ({
      controlId: cp.controlId,
      title: cp.title,
      description: cp.description,
      responsible: cp.responsible,
      timing: cp.timing,
      approvalChain: cp.approvalChain,
      suggestedSteps: cp.suggestedSteps,
    })),
  );

  if (allControlPoints.length === 0) {
    throw new Error('没有找到任何控制点，请确保规章制度已完成解析');
  }

  await aiJobService.updateProgress(jobId, 20, '分析控制点...');

  // Format control points for LLM
  const controlPointsText = allControlPoints
    .map((cp, i) => {
      let text = `${cp.controlId}. ${cp.title}\n   ${cp.description}`;
      if (cp.responsible) text += `\n   责任人: ${cp.responsible}`;
      if (cp.timing) text += `\n   时间要求: ${cp.timing}`;
      if (cp.approvalChain && cp.approvalChain.length > 0) {
        text += `\n   审批链: ${cp.approvalChain.join(' → ')}`;
      }
      if (cp.suggestedSteps && cp.suggestedSteps.length > 0) {
        text += `\n   建议步骤: ${cp.suggestedSteps.join('；')}`;
      }
      return text;
    })
    .join('\n\n');

  await aiJobService.updateProgress(jobId, 40, '生成测试计划...');

  // Generate plan via LLM
  const result = await generatePlan(controlPointsText);

  await aiJobService.updateProgress(jobId, 70, '生成测试步骤...');

  // Build execution configs from generated steps
  const steps = result.steps.map((s) => ({
    description: s.description,
    executionConfig: {
      checkType: s.executionConfig.checkType,
      signatureCheck: s.executionConfig.signatureCheck ?? undefined,
      contentCheck: s.executionConfig.contentCheck ?? undefined,
      dateCheck: s.executionConfig.dateCheck ?? undefined,
      amountCheck: s.executionConfig.amountCheck ?? undefined,
      freeFormCheck: s.executionConfig.freeFormCheck ?? undefined,
    },
  }));

  // Transaction: upsert plan + steps
  await prisma.$transaction(async (tx) => {
    const existingPlan = await tx.testPlan.findUnique({
      where: { taskId },
    });

    if (existingPlan) {
      // Update existing plan
      await tx.testPlan.update({
        where: { id: existingPlan.id },
        data: {
          controlDescription: result.controlDescription,
          controlIds: result.controlIds,
          generatedBy: 'AI',
          aiJobId: jobId,
          reviewStatus: 'PENDING',
          version: { increment: 1 },
        },
      });

      // Delete old steps
      await tx.testStep.deleteMany({ where: { planId: existingPlan.id } });
    } else {
      // Create new plan
      const newPlan = await tx.testPlan.create({
        data: {
          taskId,
          controlDescription: result.controlDescription,
          controlIds: result.controlIds,
          generatedBy: 'AI',
          aiJobId: jobId,
          reviewStatus: 'PENDING',
          version: 1,
        },
      });

      // Create steps
      if (steps.length > 0) {
        await tx.testStep.createMany({
          data: steps.map((step, idx) => ({
            planId: newPlan.id,
            index: idx + 1,
            description: step.description,
            executionConfig: step.executionConfig as any, // Prisma Json field
          })),
        });
      }
    }
  });

  await aiJobService.updateProgress(jobId, 90, '保存测试计划...');

  // Transition task status to PLAN_REVIEW if still in PLANNING
  const refreshedTask = await prisma.testTask.findUnique({ where: { id: taskId } });
  if (refreshedTask?.status === 'PLANNING') {
    await prisma.$transaction(async (tx) => {
      await tx.testTask.update({
        where: { id: taskId },
        data: { status: 'PLAN_REVIEW' },
      });
      await tx.taskStatusHistory.create({
        data: {
          taskId,
          status: 'PLAN_REVIEW',
          changedBy: SYSTEM_USER_ID,
          comment: 'AI 生成测试计划完成，等待人工审核',
        },
      });
    });
  }

  await aiJobService.completeJob(jobId, 'TestPlan', taskId);
}
