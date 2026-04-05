import { Router } from 'express';
import { taskRoutes } from './tasks.routes.js';
import { sampleRoutes } from './samples.routes.js';
import { regulationRoutes } from './regulations.routes.js';
import { paperRoutes } from './papers.routes.js';
import { fileRoutes } from './files.routes.js';
import { aiRoutes } from './ai.routes.js';

export const routes = Router();

routes.use('/tasks', taskRoutes);
routes.use('/tasks', sampleRoutes);        // /tasks/:id/samples
routes.use('/regulations', regulationRoutes);
routes.use('/tasks', paperRoutes);         // /tasks/:id/paper
routes.use('/files', fileRoutes);
routes.use('/ai-jobs', aiRoutes);
