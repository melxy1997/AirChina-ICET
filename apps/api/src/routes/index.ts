import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { scenarioRoutes } from './scenarios.routes.js';
import { taskRoutes } from './tasks.routes.js';
import { sampleRoutes } from './samples.routes.js';
import { regulationRoutes } from './regulations.routes.js';
import { paperRoutes } from './papers.routes.js';
import { fileRoutes } from './files.routes.js';
import { aiRoutes } from './ai.routes.js';

export const routes = Router();

// 公开路由
routes.use('/auth', authRoutes);

// 需要认证的路由
routes.use('/scenarios', scenarioRoutes);
routes.use('/tasks', taskRoutes);
routes.use('/tasks', sampleRoutes);
routes.use('/tasks', paperRoutes);
routes.use('/regulations', regulationRoutes);
routes.use('/files', fileRoutes);
routes.use('/ai-jobs', aiRoutes);
