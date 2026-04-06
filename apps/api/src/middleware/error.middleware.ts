import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const message = first
      ? `${first.path.length ? `${first.path.join('.')}: ` : ''}${first.message}`
      : '参数校验失败';
    res.status(400).json({
      error: {
        name: 'ValidationError',
        message,
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        name: err.name,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  console.error('[Unhandled Error]', err);

  res.status(500).json({
    error: {
      name: 'InternalServerError',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
}
