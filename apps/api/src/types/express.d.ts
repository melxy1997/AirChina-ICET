/// <reference types="express" />

declare global {
  namespace Express {
    interface Request {
      /** 由 `requireAuth` 中间件挂载 */
      userId?: string;
      userRole?: string;
      orgId?: string;
    }
  }
}

export {};
