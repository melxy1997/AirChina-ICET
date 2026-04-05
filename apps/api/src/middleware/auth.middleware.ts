import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';

/** 简易 JWT 验证中间件（Phase 1 完整实现） */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  // TODO: Phase 1 实现 JWT 验证
  // 当前跳过认证，方便开发
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // 开发模式允许无认证访问
    (req as any).userId = 'dev-user';
    return next();
  }
  next();
}

/** 要求管理员角色 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    // TODO: Phase 1 实现角色检查
    next();
  });
}
