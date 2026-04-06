import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // 使用 127.0.0.1，避免在 VPN/代理（如 Fake-IP）下 localhost 被解析成 198.18.x.x 导致 EADDRNOTAVAIL
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        // 与 server.host 一致用 127.0.0.1，避免 VPN/Fake-IP 下 localhost 解析错误导致代理 ECONNRESET
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:3000',
        ws: true,
      },
    },
  },
});
