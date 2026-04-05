import type { Request, Response, NextFunction } from 'express';

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

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
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
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    },
  });
}
