import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { resolve } from 'path';
import { createDb, EmployeeManager, PipelineEngine, PipelineLoader } from '@vc/core';
import { IMService } from './services/im-service.js';
import { employeeRoutes } from './routes/employees.js';
import { projectRoutes } from './routes/projects.js';
import { taskRoutes } from './routes/tasks.js';
import { channelRoutes } from './routes/channels.js';
import { messageRoutes } from './routes/messages.js';
import { pipelineRoutes } from './routes/pipelines.js';
import { reviewRoutes } from './routes/reviews.js';
import { registerWebSocket } from './ws/handler.js';

async function start() {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });
  await server.register(websocket);

  const rootDir = resolve(process.cwd());
  const dbPath = resolve(rootDir, 'data', 'vc.db');
  const db = createDb(dbPath);
  const employeeManager = new EmployeeManager(db, rootDir);
  const imService = new IMService(db);
  const pipelineEngine = new PipelineEngine(db, employeeManager);
  const pipelineLoader = new PipelineLoader(rootDir);

  pipelineEngine.on('stage_started', (payload) => {
    server.log.info(`[Pipeline] Stage started: ${payload.stageName} (run: ${payload.runId})`);
  });
  pipelineEngine.on('stage_completed', (payload) => {
    server.log.info(`[Pipeline] Stage completed: ${payload.stageName} (run: ${payload.runId})`);
  });
  pipelineEngine.on('stage_failed', (payload) => {
    server.log.error(`[Pipeline] Stage failed: ${payload.stageName} (run: ${payload.runId})`);
  });
  pipelineEngine.on('pipeline_completed', (payload) => {
    server.log.info(`[Pipeline] Pipeline completed: ${payload.runId}`);
  });
  pipelineEngine.on('pipeline_failed', (payload) => {
    server.log.error(`[Pipeline] Pipeline failed: ${payload.runId}`);
  });
  pipelineEngine.on('approval_requested', (payload) => {
    server.log.info(`[Pipeline] Approval requested: ${payload.runId}`);
    imService.broadcastAll({ type: 'approval_requested', runId: payload.runId, stageName: payload.stageName });
  });

  server.decorate('db', db);
  server.decorate('imService', imService);
  server.decorate('pipelineEngine', pipelineEngine);
  server.decorate('pipelineLoader', pipelineLoader);

  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  server.register(employeeRoutes, { prefix: '/api/employees' });
  server.register(projectRoutes, { prefix: '/api/projects' });
  server.register(taskRoutes, { prefix: '/api/tasks' });
  server.register(channelRoutes, { prefix: '/api/channels' });
  server.register(messageRoutes, { prefix: '/api/messages' });
  server.register(pipelineRoutes, { prefix: '/api/pipelines' });
  server.register(reviewRoutes, { prefix: '/api/reviews' });

  registerWebSocket(server);

  const port = parseInt(process.env.PORT || '3000', 10);
  await server.listen({ port, host: '0.0.0.0' });
  console.log(`Server running on http://localhost:${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
