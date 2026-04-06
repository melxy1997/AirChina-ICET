import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as scenarioService from '../services/scenario.service.js';

export const scenarioRoutes = Router();
scenarioRoutes.use(requireAuth);

const createSchema = z.object({
  processLevel1: z.string().min(1, '一级流程不能为空'),
  processLevel2: z.string().min(1, '二级流程不能为空'),
  processLevel3: z.string().optional(),
  name: z.string().min(1, '场景名称不能为空'),
  description: z.string().optional(),
});

const updateSchema = createSchema.partial();

/** GET /scenarios */
scenarioRoutes.get('/', asyncHandler(async (req, res) => {
  const orgId = (req as any).userId; // TODO: 从用户获取 orgId
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const result = await scenarioService.listScenarios(orgId, page, pageSize);
  res.json(result);
}));

/** POST /scenarios */
scenarioRoutes.post('/', asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const userId = (req as any).userId;
  const result = await scenarioService.createScenario({
    ...data,
    organizationId: 'TODO', // TODO: 从用户获取 orgId
    createdBy: userId,
  });
  res.status(201).json(result);
}));

/** GET /scenarios/:id */
scenarioRoutes.get('/:id', asyncHandler(async (req, res) => {
  const orgId = (req as any).userId; // TODO
  const result = await scenarioService.getScenario(req.params.id, orgId);
  res.json(result);
}));

/** PUT /scenarios/:id */
scenarioRoutes.put('/:id', asyncHandler(async (req, res) => {
  const orgId = (req as any).userId; // TODO
  const data = updateSchema.parse(req.body);
  const result = await scenarioService.updateScenario(req.params.id, orgId, data);
  res.json(result);
}));

/** DELETE /scenarios/:id */
scenarioRoutes.delete('/:id', asyncHandler(async (req, res) => {
  const orgId = (req as any).userId; // TODO
  await scenarioService.deleteScenario(req.params.id, orgId);
  res.json({ success: true });
}));

/** POST /scenarios/:id/regulations/:regId */
scenarioRoutes.post('/:id/regulations/:regId', asyncHandler(async (req, res) => {
  await scenarioService.linkRegulation(req.params.id, req.params.regId);
  res.status(201).json({ success: true });
}));

/** DELETE /scenarios/:id/regulations/:regId */
scenarioRoutes.delete('/:id/regulations/:regId', asyncHandler(async (req, res) => {
  await scenarioService.unlinkRegulation(req.params.id, req.params.regId);
  res.json({ success: true });
}));
