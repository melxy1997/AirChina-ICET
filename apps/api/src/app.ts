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

  // JSON 解析
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

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
