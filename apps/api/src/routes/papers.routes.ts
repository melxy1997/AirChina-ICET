import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { paramStr } from '../lib/req-params.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import * as paperService from '../services/paper.service.js';

export const paperRoutes = Router();
paperRoutes.use(requireAuth);

/** 校验任务归属当前组织 */
async function verifyTaskOrg(taskId: string | string[], orgId: string) {
  const id = Array.isArray(taskId) ? taskId[0] : taskId;
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

/** GET /tasks/:id/paper */
paperRoutes.get(
  '/:id/paper',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    await verifyTaskOrg(req.params.id, orgId);
    const taskId = paramStr(req.params.id);
    if (!taskId) throw new AppError(400, '无效的任务 ID');
    const paper = await prisma.workingPaper.findUnique({ where: { taskId } });
    if (!paper) {
      res.status(404).json({ error: { message: '工作底稿尚未生成' } });
      return;
    }
    res.json(paper);
  }),
);

/** POST /tasks/:id/paper/generate */
paperRoutes.post(
  '/:id/paper/generate',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    await verifyTaskOrg(req.params.id, orgId);
    const overrides = req.body.overrides;
    const taskId = paramStr(req.params.id);
    if (!taskId) throw new AppError(400, '无效的任务 ID');
    const result = await paperService.generatePaper(taskId, orgId, overrides);
    res.json(result);
  }),
);

/** POST /tasks/:id/paper/export */
paperRoutes.post(
  '/:id/paper/export',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    await verifyTaskOrg(req.params.id, orgId);
    const taskId = paramStr(req.params.id);
    if (!taskId) throw new AppError(400, '无效的任务 ID');
    const paper = await paperService.generatePaper(taskId, orgId);
    const buffer = await paperService.exportPaperExcel(paper.id, orgId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="working-paper-${taskId}.xlsx"`);
    res.send(buffer);
  }),
);

/** POST /tasks/:id/paper/submit */
paperRoutes.post(
  '/:id/paper/submit',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    await verifyTaskOrg(req.params.id, orgId);
    const userId = req.userId!;
    const taskId = paramStr(req.params.id);
    if (!taskId) throw new AppError(400, '无效的任务 ID');
    const paper = await prisma.workingPaper.findUnique({ where: { taskId } });
    if (!paper) {
      res.status(404).json({ error: { message: '工作底稿尚未生成' } });
      return;
    }
    const result = await paperService.submitPaper(paper.id, userId);
    res.json(result);
  }),
);

/** POST /tasks/:id/paper/approve */
paperRoutes.post(
  '/:id/paper/approve',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    await verifyTaskOrg(req.params.id, orgId);
    const userId = req.userId!;
    const { comment } = req.body;
    const taskId = paramStr(req.params.id);
    if (!taskId) throw new AppError(400, '无效的任务 ID');
    const paper = await prisma.workingPaper.findUnique({ where: { taskId } });
    if (!paper) {
      res.status(404).json({ error: { message: '工作底稿尚未生成' } });
      return;
    }
    const result = await paperService.approvePaper(paper.id, userId, comment);
    res.json(result);
  }),
);
