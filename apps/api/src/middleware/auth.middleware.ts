import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';
import { verifyToken, type TokenPayload } from '../services/auth.service.js';

/** JWT 认证中间件 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, '未提供有效的认证令牌');
  }

  const token = authHeader.slice(7);
  const payload: TokenPayload = verifyToken(token);

  (req as any).userId = payload.userId;
  (req as any).userRole = payload.role;
  next();
}

/** 要求管理员角色 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const role = (req as any).userRole;
  if (role !== 'ADMIN') {
    throw new AppError(403, '需要管理员权限');
  }
  next();
}
