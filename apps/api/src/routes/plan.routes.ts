import { Router } from 'express';
import { z } from 'zod';
import type { StepCheckType } from '@icet/shared';
import { paramStr } from '../lib/req-params.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import * as planService from '../services/plan.service.js';
import * as aiJobService from '../services/ai-job.service.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/error.middleware.js';

export const planRoutes = Router();
planRoutes.use(requireAuth);

const stepSchema = z.object({
  description: z.string().min(1, '步骤描述不能为空'),
  executionConfig: z.object({
    checkType: z.string() as z.ZodType<StepCheckType>,
    signatureCheck: z.any().optional(),
    contentCheck: z.any().optional(),
    dateCheck: z.any().optional(),
    amountCheck: z.any().optional(),
    freeFormCheck: z.any().optional(),
  }),
});

const planSchema = z.object({
  controlDescription: z.string(),
  controlIds: z.array(z.string()).default([]),
  steps: z.array(stepSchema).default([]),
});

const approveSchema = z.object({
  approve: z.boolean(),
  comment: z.string().optional(),
});

/** GET /tasks/:id/plan */
planRoutes.get(
  '/:id/plan',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const taskId = paramStr(req.params.id);
    const result = await planService.getPlan(taskId, orgId);
    res.json(result);
  }),
);

/** POST /tasks/:id/plan */
planRoutes.post(
  '/:id/plan',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const userId = req.userId!;
    const taskId = paramStr(req.params.id);
    const data = planSchema.parse(req.body);
    const result = await planService.createOrUpdatePlan(taskId, orgId, userId, data);
    res.json(result);
  }),
);

/** PUT /tasks/:id/plan */
planRoutes.put(
  '/:id/plan',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const userId = req.userId!;
    const taskId = paramStr(req.params.id);
    const data = planSchema.parse(req.body);
    const result = await planService.createOrUpdatePlan(taskId, orgId, userId, data);
    res.json(result);
  }),
);

/** POST /tasks/:id/plan/approve */
planRoutes.post(
  '/:id/plan/approve',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const userId = req.userId!;
    const taskId = paramStr(req.params.id);
    const data = approveSchema.parse(req.body);
    const result = await planService.approvePlan(taskId, orgId, userId, data);
    res.json(result);
  }),
);

/** POST /tasks/:id/plan/generate — 触发 AI 生成测试计划 */
planRoutes.post(
  '/:id/plan/generate',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const taskId = paramStr(req.params.id);
    if (!taskId) throw new AppError(400, '无效的任务 ID');

    const task = await prisma.testTask.findFirst({
      where: { id: taskId, organizationId: orgId },
      include: {
        taskRegulations: {
          include: {
            regulation: { include: { controlPoints: true } },
          },
        },
      },
    });

    if (!task) throw new AppError(404, '测试任务不存在');
    if (task.taskRegulations.length === 0) {
      throw new AppError(400, '任务未关联任何规章制度，无法生成测试计划');
    }

    const hasControls = task.taskRegulations.some(
      (tr) => tr.regulation.controlPoints.length > 0,
    );
    if (!hasControls) {
      throw new AppError(400, '规章制度尚未完成解析，请先触发规章制度解析');
    }

    const job = await aiJobService.createJob(
      'GENERATE_TEST_PLAN',
      'TestTask',
      taskId,
      'PLAN_GENERATOR',
    );

    res.status(202).json({ jobId: job.id });
  }),
);
