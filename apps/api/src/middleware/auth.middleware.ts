import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';
import { verifyToken, type TokenPayload } from '../services/auth.service.js';
import { prisma } from '../db/prisma.js';

/**
 * JWT 认证中间件 — 验证 token 并挂载 userId / userRole / orgId。
 * Express 4 不会自动捕获 async 中间件的 Promise，故用同步包装 + try/catch 交给 next(err)。
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  void (async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError(401, '未提供有效的认证令牌');
      }

      const token = authHeader.slice(7);
      const payload: TokenPayload = verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, organizationId: true, role: true, isActive: true },
      });
      if (!user || !user.isActive) {
        throw new AppError(401, '用户不存在或已被禁用');
      }

      (req as any).userId = user.id;
      (req as any).userRole = user.role;
      (req as any).orgId = user.organizationId;
      next();
    } catch (err) {
      next(err);
    }
  })();
}

/** 要求管理员角色（必须在 requireAuth 之后使用） */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const role = (req as any).userRole;
  if (role !== 'ADMIN') {
    throw new AppError(403, '需要管理员权限');
  }
  next();
}
