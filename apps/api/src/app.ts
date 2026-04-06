import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware.js';
import { routes } from './routes/index.js';
import { createHttpServer } from './websocket/server.js';

export function createApp() {
  const app = express();

  // 安全中间件
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    }),
  );

  // 请求日志
  app.use(morgan('dev'));

  // 速率限制（简单内存实现，生产环境建议用 Redis）
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW = 60_000; // 1 分钟
  const RATE_LIMIT_MAX = 100; // 每分钟 100 次

  app.use('/api/v1', (req, res, next) => {
    const key = req.userId || req.ip || 'anonymous';
    const now = Date.now();
    let entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
      rateLimitMap.set(key, entry);
    }

    entry.count++;

    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - entry.count)));

    if (entry.count > RATE_LIMIT_MAX) {
      res.status(429).json({ error: { message: '请求过于频繁，请稍后再试' } });
      return;
    }

    next();
  });

  // JSON 解析
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 分页参数校验中间件
  app.use('/api/v1', (req, _res, next) => {
    const page = Number(req.query.page);
    const pageSize = Number(req.query.pageSize);
    if (req.query.page !== undefined && (Number.isNaN(page) || page < 1)) {
      req.query.page = '1';
    }
    if (
      req.query.pageSize !== undefined &&
      (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100)
    ) {
      req.query.pageSize = '20';
    }
    next();
  });

  // API 路由
  app.use('/api/v1', routes);

  // 健康检查
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 错误处理（必须在所有路由之后）
  app.use(errorHandler);

  return app;
}

export { createHttpServer };
