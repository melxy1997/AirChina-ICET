import 'dotenv/config';
import { createApp } from './app.js';
import { ensureBucket } from './services/file.service.js';

const PORT = process.env.PORT ?? 3000;

const app = createApp();

app.listen(PORT, async () => {
  console.log(`[ICET API] Server running on http://localhost:${PORT}`);
  console.log(`[ICET API] Environment: ${process.env.NODE_ENV ?? 'development'}`);

  // 确保文件存储桶存在
  await ensureBucket();
});
