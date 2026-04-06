import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as paperService from '../services/paper.service.js';

export const paperRoutes = Router();
paperRoutes.use(requireAuth);

/** GET /tasks/:id/paper */
paperRoutes.get('/:id/paper', asyncHandler(async (req, res) => {
  const { prisma } = await import('../db/prisma.js');
  const paper = await prisma.workingPaper.findUnique({ where: { taskId: req.params.id } });
  if (!paper) {
    res.status(404).json({ error: { message: '工作底稿尚未生成' } });
    return;
  }
  res.json(paper);
}));

/** POST /tasks/:id/paper/generate */
paperRoutes.post('/:id/paper/generate', asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const orgId = 'TODO'; // TODO
  const overrides = req.body.overrides;
  const result = await paperService.generatePaper(req.params.id, orgId, overrides);
  res.json(result);
}));

/** POST /tasks/:id/paper/export */
paperRoutes.post('/:id/paper/export', asyncHandler(async (req, res) => {
  const orgId = 'TODO'; // TODO
  // 先生成/更新底稿
  const paper = await paperService.generatePaper(req.params.id, orgId);
  const buffer = await paperService.exportPaperExcel(paper.id, orgId);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="working-paper-${req.params.id}.xlsx"`);
  res.send(buffer);
}));

/** POST /tasks/:id/paper/submit */
paperRoutes.post('/:id/paper/submit', asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const { prisma } = await import('../db/prisma.js');
  const paper = await prisma.workingPaper.findUnique({ where: { taskId: req.params.id } });
  if (!paper) {
    res.status(404).json({ error: { message: '工作底稿尚未生成' } });
    return;
  }
  const result = await paperService.submitPaper(paper.id, userId);
  res.json(result);
}));

/** POST /tasks/:id/paper/approve */
paperRoutes.post('/:id/paper/approve', asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const { comment } = req.body;
  const { prisma } = await import('../db/prisma.js');
  const paper = await prisma.workingPaper.findUnique({ where: { taskId: req.params.id } });
  if (!paper) {
    res.status(404).json({ error: { message: '工作底稿尚未生成' } });
    return;
  }
  const result = await paperService.approvePaper(paper.id, userId, comment);
  res.json(result);
}));
