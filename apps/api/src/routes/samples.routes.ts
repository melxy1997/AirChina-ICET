import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { prisma } from '../db/prisma.js';
import * as sampleService from '../services/sample.service.js';
import * as executionService from '../services/execution.service.js';
import { paramStr } from '../lib/req-params.js';

export const sampleRoutes = Router();
sampleRoutes.use(requireAuth);

const addSampleSchema = z.object({
  no: z.number().int().positive(),
  content: z.string().min(1, '样本内容不能为空'),
  fileIds: z.array(z.string().uuid()).optional(),
  remark: z.string().optional(),
});

const updateResultSchema = z.object({
  result: z.string(),
  humanNote: z.string().optional(),
});

const batchResultSchema = z.object({
  items: z.array(z.object({
    sampleId: z.string().uuid(),
    stepId: z.string().uuid(),
    result: z.string(),
    humanNote: z.string().optional(),
  })),
});

/** 校验任务归属当前组织 */
async function verifyTaskOrg(taskId: string | string[], orgId: string) {
  const id = paramStr(taskId);
  if (!id) throw new AppError(400, '无效的任务 ID');
  const task = await prisma.testTask.findUnique({
    where: { id },
    select: { id: true, organizationId: true },
  });
  if (!task || task.organizationId !== orgId) {
    throw new AppError(404, '测试任务不存在');
  }
  return task;
}

/** GET /tasks/:id/samples */
sampleRoutes.get('/:id/samples', asyncHandler(async (req, res) => {
  const orgId = (req as any).orgId;
  await verifyTaskOrg(req.params.id, orgId);
  const result = await sampleService.listSamples(paramStr(req.params.id));
  res.json(result);
}));

/** POST /tasks/:id/samples */
sampleRoutes.post('/:id/samples', asyncHandler(async (req, res) => {
  const orgId = (req as any).orgId;
  await verifyTaskOrg(req.params.id, orgId);
  const data = addSampleSchema.parse(req.body);
  const userId = (req as any).userId;
  const result = await sampleService.addSample(paramStr(req.params.id), {
    ...data,
    addedBy: userId,
  });
  res.status(201).json(result);
}));

/** PUT /tasks/:id/samples/:sid */
sampleRoutes.put('/:id/samples/:sid', asyncHandler(async (req, res) => {
  const orgId = (req as any).orgId;
  await verifyTaskOrg(req.params.id, orgId);
  const data = req.body;
  const result = await sampleService.updateSample(paramStr(req.params.sid), data);
  res.json(result);
}));

/** DELETE /tasks/:id/samples/:sid */
sampleRoutes.delete('/:id/samples/:sid', asyncHandler(async (req, res) => {
  const orgId = (req as any).orgId;
  await verifyTaskOrg(req.params.id, orgId);
  await sampleService.deleteSample(paramStr(req.params.sid));
  res.json({ success: true });
}));

/** PUT /tasks/:id/samples/:sid/steps/:stepId */
sampleRoutes.put('/:id/samples/:sid/steps/:stepId', asyncHandler(async (req, res) => {
  const orgId = (req as any).orgId;
  await verifyTaskOrg(req.params.id, orgId);
  const data = updateResultSchema.parse(req.body);
  const userId = (req as any).userId;
  const result = await executionService.updateStepResult({
    sampleId: paramStr(req.params.sid),
    stepId: paramStr(req.params.stepId),
    result: data.result,
    executedBy: userId,
    humanNote: data.humanNote,
  });
  res.json(result);
}));

/** POST /tasks/:id/executions/batch */
sampleRoutes.post('/:id/executions/batch', asyncHandler(async (req, res) => {
  const orgId = (req as any).orgId;
  await verifyTaskOrg(req.params.id, orgId);
  const { items } = batchResultSchema.parse(req.body);
  const userId = (req as any).userId;
  const result = await executionService.batchUpdateResults(
    items.map((item) => ({ ...item, executedBy: userId })),
  );
  res.json(result);
}));
