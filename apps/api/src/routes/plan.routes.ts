import { Router } from 'express';
import { z } from 'zod';
import { paramStr } from '../lib/req-params.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import * as planService from '../services/plan.service.js';

export const planRoutes = Router();
planRoutes.use(requireAuth);

const stepSchema = z.object({
  description: z.string().min(1, '步骤描述不能为空'),
  executionConfig: z.object({
    checkType: z.string(),
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
