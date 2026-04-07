import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { resolve } from 'path';
import { createDb, EmployeeManager, PipelineEngine, PipelineLoader, TemplateRenderer, AgentExecutor, ReviewService } from '@vc/core';
import { IMService } from './services/im-service.js';
import { AuditLogger } from './services/audit-logger.js';
import { employeeRoutes } from './routes/employees.js';
import { projectRoutes } from './routes/projects.js';
import { taskRoutes } from './routes/tasks.js';
import { channelRoutes } from './routes/channels.js';
import { messageRoutes } from './routes/messages.js';
import { pipelineRoutes } from './routes/pipelines.js';
import { reviewRoutes } from './routes/reviews.js';
import { auditRoutes } from './routes/audit.js';
import { registerWebSocket } from './ws/handler.js';
import { authMiddleware } from './middleware/auth.js';

async function start() {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });
  await server.register(websocket);

  const rootDir = resolve(process.cwd());
  const dbPath = resolve(rootDir, 'data', 'vc.db');
  const db = createDb(dbPath);
  const employeeManager = new EmployeeManager(db, rootDir);
  const templateRenderer = new TemplateRenderer(rootDir);
  const agentExecutor = new AgentExecutor(db, employeeManager, templateRenderer, rootDir);
  const imService = new IMService(db);
  const pipelineEngine = new PipelineEngine(db, employeeManager);
  const pipelineLoader = new PipelineLoader(rootDir);
  const reviewService = new ReviewService(db, employeeManager, {
    company: { name: 'Virtual Company', description: '' },
    defaults: { provider: 'anthropic', model: 'claude-opus-4-20250514', api_key_env: 'ANTHROPIC_API_KEY', tool: 'claude-code' },
    review: { cycle: 'weekly', thresholds: { warning: 0.6, replace: 0.4 }, auto_replace: false },
    server: { port: 3000, ws_port: 3001 },
    database: { path: './data/vc.db' },
  });
  const auditLogger = new AuditLogger(db);

  pipelineEngine.setAgentExecutor(async (employeeId, projectId, instruction, input) => {
    return agentExecutor.execute({ employeeId, projectId, instruction, input });
  });

  pipelineEngine.on('stage_started', (payload) => {
    server.log.info(`[Pipeline] Stage started: ${payload.stageName} (run: ${payload.runId})`);
    imService.broadcastAll({ type: 'stage_started', runId: payload.runId, stageName: payload.stageName });
    auditLogger.log('pipeline.started', 'system', { resourceType: 'pipeline', resourceId: payload.runId, details: { stageName: payload.stageName } });
  });
  pipelineEngine.on('stage_completed', (payload) => {
    server.log.info(`[Pipeline] Stage completed: ${payload.stageName} (run: ${payload.runId})`);
    imService.broadcastAll({ type: 'stage_completed', runId: payload.runId, stageName: payload.stageName });
  });
  pipelineEngine.on('stage_failed', (payload) => {
    server.log.error(`[Pipeline] Stage failed: ${payload.stageName} (run: ${payload.runId})`);
    imService.broadcastAll({ type: 'stage_failed', runId: payload.runId, stageName: payload.stageName, data: payload.data });
    auditLogger.log('pipeline.failed', 'system', { resourceType: 'pipeline', resourceId: payload.runId, details: { stageName: payload.stageName, error: payload.data } });
  });
  pipelineEngine.on('pipeline_completed', (payload) => {
    server.log.info(`[Pipeline] Pipeline completed: ${payload.runId}`);
    imService.broadcastAll({ type: 'pipeline_completed', runId: payload.runId });
    auditLogger.log('pipeline.completed', 'system', { resourceType: 'pipeline', resourceId: payload.runId });
  });
  pipelineEngine.on('pipeline_failed', (payload) => {
    server.log.error(`[Pipeline] Pipeline failed: ${payload.runId}`);
    imService.broadcastAll({ type: 'pipeline_failed', runId: payload.runId, data: payload.data });
  });
  pipelineEngine.on('approval_requested', (payload) => {
    server.log.info(`[Pipeline] Approval requested: ${payload.runId}`);
    imService.broadcastAll({ type: 'approval_requested', runId: payload.runId, stageName: payload.stageName });
  });

  server.decorate('db', db);
  server.decorate('imService', imService);
  server.decorate('pipelineEngine', pipelineEngine);
  server.decorate('pipelineLoader', pipelineLoader);
  server.decorate('reviewService', reviewService);
  server.decorate('auditLogger', auditLogger);

  server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  server.addHook('preHandler', authMiddleware);

  server.register(employeeRoutes, { prefix: '/api/employees' });
  server.register(projectRoutes, { prefix: '/api/projects' });
  server.register(taskRoutes, { prefix: '/api/tasks' });
  server.register(channelRoutes, { prefix: '/api/channels' });
  server.register(messageRoutes, { prefix: '/api/messages' });
  server.register(pipelineRoutes, { prefix: '/api/pipelines' });
  server.register(reviewRoutes, { prefix: '/api/reviews' });
  server.register(auditRoutes, { prefix: '/api/audit' });

  registerWebSocket(server);

  const port = parseInt(process.env.PORT || '3000', 10);
  await server.listen({ port, host: '0.0.0.0' });
  console.log(`Server running on http://localhost:${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});