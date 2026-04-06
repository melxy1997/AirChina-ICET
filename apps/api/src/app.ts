import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { RedisStore } from 'rate-limit-redis';
import { redis } from './lib/redis.js';
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

  // 速率限制 (基于 Redis 实现)
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 分钟
    limit: 100, // 每个 IP 限制 100 次
    standardHeaders: true, // 在响应头中返回 `RateLimit-*` 信息
    legacyHeaders: false, // 禁用 `X-RateLimit-*` 信息
    store: new RedisStore({
      // @ts-expect-error - ioredis type mismatch with express-rate-limit
      sendCommand: (...args: string[]) => redis.call(...args),
      prefix: 'icet:rate-limit:',
    }),
    keyGenerator: (req) => {
      // 优先使用已认证用户的 ID，否则回退到 IP
      return (req as any).userId || req.ip || 'anonymous';
    },
    message: { error: { message: '请求过于频繁，请稍后再试' } },
  });

  app.use('/api/v1', limiter);

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
