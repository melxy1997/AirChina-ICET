import { createServer } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

let io: Server | null = null;

const DEFAULT_WEB_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export function initWebSocket(httpServer: HttpServer): void {
  const socketServer = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : DEFAULT_WEB_ORIGINS,
      methods: ['GET', 'POST'],
    },
  });
  io = socketServer;

  socketServer.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });

    // 加入任务房间
    socket.on('task:join', (taskId: string) => {
      void socket.join(`task:${taskId}`);
      console.log(`[WS] ${socket.id} joined task:${taskId}`);
    });

    // 离开任务房间
    socket.on('task:leave', (taskId: string) => {
      void socket.leave(`task:${taskId}`);
    });

    // 加入规章制度房间
    socket.on('regulation:join', (regulationId: string) => {
      void socket.join(`regulation:${regulationId}`);
      console.log(`[WS] ${socket.id} joined regulation:${regulationId}`);
    });

    // 离开规章制度房间
    socket.on('regulation:leave', (regulationId: string) => {
      void socket.leave(`regulation:${regulationId}`);
    });
  });
}

/** 广播事件到指定任务房间 */
export function broadcast(taskId: string, event: string, data: unknown): void {
  io?.to(`task:${taskId}`).emit(event, data);
}

/** 广播事件到指定规章制度房间 */
export function broadcastRegulation(regulationId: string, event: string, data: unknown): void {
  io?.to(`regulation:${regulationId}`).emit(event, data);
}
