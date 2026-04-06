import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import type { StepExecutionConfig, TaskStatus } from '@icet/shared';
import { transitionStatus } from './task.service.js';

/**
 * 获取任务的测试计划
 */
export async function getPlan(taskId: string, orgId: string) {
  const plan = await prisma.testPlan.findFirst({
    where: {
      taskId,
      task: { organizationId: orgId },
    },
    include: {
      steps: {
        orderBy: { index: 'asc' },
      },
    },
  });
  return plan;
}

/**
 * 创建或更新测试计划
 */
export async function createOrUpdatePlan(
  taskId: string,
  orgId: string,
  userId: string,
  data: {
    controlDescription: string;
    controlIds: string[];
    steps: {
      description: string;
      executionConfig: StepExecutionConfig;
    }[];
  },
) {
  const task = await prisma.testTask.findFirst({
    where: { id: taskId, organizationId: orgId },
    include: { plan: true },
  });

  if (!task) throw new AppError(404, '测试任务不存在');

  return prisma.$transaction(async (tx) => {
    // 1. 创建或更新 TestPlan
    const plan = await tx.testPlan.upsert({
      where: { taskId },
      create: {
        taskId,
        controlDescription: data.controlDescription,
        controlIds: data.controlIds,
        generatedBy: 'HUMAN',
        reviewStatus: 'PENDING',
        version: 1,
      },
      update: {
        controlDescription: data.controlDescription,
        controlIds: data.controlIds,
        reviewStatus: 'PENDING',
        version: { increment: 1 },
      },
    });

    // 2. 更新 Steps (先删后增，简单处理)
    await tx.testStep.deleteMany({ where: { planId: plan.id } });
    
    if (data.steps.length > 0) {
      await tx.testStep.createMany({
        data: data.steps.map((step, index) => ({
          planId: plan.id,
          index,
          description: step.description,
          executionConfig: step.executionConfig as any, // Prisma Json field
        })),
      });
    }

    // 3. 如果任务还在 DRAFT 状态，自动转换到 PLANNING
    if (task.status === 'DRAFT') {
      // 注意：这里不能直接调用 task.service.transitionStatus 因为它也在事务外或者会开启新事务
      // 我们在事务内手动更新
      await tx.testTask.update({
        where: { id: taskId },
        data: { status: 'PLANNING' },
      });
      await tx.taskStatusHistory.create({
        data: {
          taskId,
          status: 'PLANNING',
          changedBy: userId,
          comment: '创建测试计划，状态自动变更',
        },
      });
    }

    return tx.testPlan.findUnique({
      where: { id: plan.id },
      include: { steps: { orderBy: { index: 'asc' } } },
    });
  });
}

/**
 * 审核测试计划
 */
export async function approvePlan(
  taskId: string,
  orgId: string,
  userId: string,
  data: {
    approve: boolean;
    comment?: string;
  },
) {
  const task = await prisma.testTask.findFirst({
    where: { id: taskId, organizationId: orgId },
    include: { plan: true },
  });

  if (!task || !task.plan) throw new AppError(404, '测试计划不存在');

  return prisma.$transaction(async (tx) => {
    const newReviewStatus = data.approve ? 'APPROVED' : 'REJECTED';
    
    await tx.testPlan.update({
      where: { id: task.plan!.id },
      data: {
        reviewStatus: newReviewStatus,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewComment: data.comment,
      },
    });

    // 如果审核通过，且状态在 PLAN_REVIEW，则流转到 EXECUTING
    // 如果审核拒绝，且状态在 PLAN_REVIEW，则流转回 PLANNING
    let nextTaskStatus: TaskStatus | null = null;
    if (task.status === 'PLAN_REVIEW') {
      nextTaskStatus = data.approve ? 'EXECUTING' : 'PLANNING';
    } else if (task.status === 'PLANNING' && data.approve) {
       // 如果还在 PLANNING 状态就直接通过了，也可以跳过 PLAN_REVIEW 直接去 EXECUTING
       nextTaskStatus = 'EXECUTING';
    }

    if (nextTaskStatus) {
      await tx.testTask.update({
        where: { id: taskId },
        data: { status: nextTaskStatus },
      });
      await tx.taskStatusHistory.create({
        data: {
          taskId,
          status: nextTaskStatus,
          changedBy: userId,
          comment: `测试计划审核${data.approve ? '通过' : '退回'}: ${data.comment || ''}`,
        },
      });
    }

    return { success: true, status: newReviewStatus };
  });
}
