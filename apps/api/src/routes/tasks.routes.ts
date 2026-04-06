import type { TaskStatus } from '@icet/shared';
import { Router } from 'express';
import { z } from 'zod';
import { paramStr } from '../lib/req-params.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import * as taskService from '../services/task.service.js';

export const taskRoutes = Router();
taskRoutes.use(requireAuth);

const createSchema = z.object({
  scenarioId: z.string().uuid(),
  paperId: z.string().min(1, '底稿编号不能为空'),
  unitName: z.string().min(1, '测试单位不能为空'),
  testerId: z.string().uuid(),
  reviewerId: z.string().uuid().optional(),
  regulationIds: z.array(z.string().uuid()).default([]),
  samplingMethod: z.string().default('随机抽样'),
  samplingPeriod: z.string().default(''),
  samplingSource: z.string().default(''),
});

const transitionSchema = z.object({
  status: z.string(),
  comment: z.string().optional(),
});

/** GET /tasks */
taskRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const filters = {
      status: req.query.status as string | undefined,
      testerId: req.query.testerId as string | undefined,
    };
    const result = await taskService.listTasks(orgId, page, pageSize, filters);
    res.json(result);
  }),
);

/** POST /tasks */
taskRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const userId = req.userId!;
    const orgId = req.orgId!;
    const result = await taskService.createTask({
      ...data,
      organizationId: orgId,
      createdBy: userId,
    });
    res.status(201).json(result);
  }),
);

/** GET /tasks/:id */
taskRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const result = await taskService.getTask(paramStr(req.params.id), orgId);
    res.json(result);
  }),
);

/** PUT /tasks/:id */
taskRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const data = req.body;
    const result = await taskService.updateTask(paramStr(req.params.id), orgId, data);
    res.json(result);
  }),
);

/** PATCH /tasks/:id/status */
taskRoutes.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const { status, comment } = transitionSchema.parse(req.body);
    const userId = req.userId!;
    const result = await taskService.transitionStatus(
      paramStr(req.params.id),
      orgId,
      status as TaskStatus,
      userId,
      comment,
    );
    res.json(result);
  }),
);
