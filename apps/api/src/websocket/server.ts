import type { Server as HttpServer } from 'node:http';

let io: import('socket.io').Server | null = null;

export function initWebSocket(httpServer: HttpServer): void {
  const { Server } = require('socket.io');
  const socketServer = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? ['http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
    },
  });
  io = socketServer;

  socketServer.on('connection', (socket: import('socket.io').Socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });

    // 加入任务房间
    socket.on('task:join', (taskId: string) => {
      socket.join(`task:${taskId}`);
    });

    // 离开任务房间
    socket.on('task:leave', (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });
  });
}

/** 广播事件到指定任务房间 */
export function broadcast(taskId: string, event: string, data: unknown): void {
  io?.to(`task:${taskId}`).emit(event, data);
}

/** 创建 HTTP Server（供 WebSocket 使用） */
export function createHttpServer() {
  const { createServer } = require('node:http');
  return createServer();
}
