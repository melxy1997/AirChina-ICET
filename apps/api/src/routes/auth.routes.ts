import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import * as authService from '../services/auth.service.js';

export const authRoutes = Router();

const registerSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  organizationId: z.string().uuid('组织ID格式不正确'),
  role: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

/** POST /auth/register */
authRoutes.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json(result);
  }),
);

/** POST /auth/login */
authRoutes.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res.json(result);
  }),
);

/** GET /auth/me — 需要认证 */
authRoutes.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const user = await authService.me(userId);
    res.json(user);
  }),
);
