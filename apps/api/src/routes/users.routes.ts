import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

export const userRoutes = Router();
userRoutes.use(requireAuth);

/** GET /users — 当前组织下的用户（用于任务分配等下拉） */
userRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const orgId = req.orgId!;
    const data = await prisma.user.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data });
  }),
);
