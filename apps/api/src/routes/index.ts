import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { taskRoutes } from './tasks.routes.js';
import { sampleRoutes } from './samples.routes.js';
import { regulationRoutes } from './regulations.routes.js';
import { paperRoutes } from './papers.routes.js';
import { fileRoutes } from './files.routes.js';
import { aiRoutes } from './ai.routes.js';

export const routes = Router();

// 认证路由（不需要登录）
routes.use('/auth', authRoutes);

// 以下路由需要登录
routes.use('/tasks', taskRoutes);
routes.use('/tasks', sampleRoutes);
routes.use('/regulations', regulationRoutes);
routes.use('/tasks', paperRoutes);
routes.use('/files', fileRoutes);
routes.use('/ai-jobs', aiRoutes);
