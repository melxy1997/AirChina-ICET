import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { ensureBucket } from './services/file.service.js';
import { startWorker } from './queue/worker.js';
import { initWebSocket } from './websocket/server.js';

const PORT = process.env.PORT ?? 3000;

const app = createApp();
const httpServer = createServer(app);
initWebSocket(httpServer);

httpServer.listen(PORT, async () => {
  console.log(`[ICET API] Server running on http://localhost:${PORT}`);
  console.log(`[ICET API] Environment: ${process.env.NODE_ENV ?? 'development'}`);

  // 确保文件存储桶存在
  await ensureBucket();

  // 启动 AI 任务 Worker
  startWorker();
  console.log('[ICET API] AI job worker started');
});
