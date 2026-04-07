import { eq, desc } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { pipelineRuns, pipelineStages, projects as projectsTable } from '@vc/core';

export const pipelineRoutes: FastifyPluginAsync = async (server) => {
  server.get('/definitions', async () => {
    return server.pipelineLoader.listAll();
  });

  server.get('/definitions/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    try {
      return server.pipelineLoader.load(name);
    } catch {
      return reply.status(404).send({ error: `Pipeline definition not found: ${name}` });
    }
  });

  server.get('/runs', async (request) => {
    const query = request.query as Record<string, string>;
    let runs = server.db.select().from(pipelineRuns).orderBy(desc(pipelineRuns.startedAt)).all();
    if (query.projectId) runs = runs.filter(r => r.projectId === query.projectId);
    if (query.status) runs = runs.filter(r => r.status === query.status);
    return runs;
  });

  server.get('/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = server.pipelineEngine.getRunStatus(id);
    if (!run) return reply.status(404).send({ error: 'Pipeline run not found' });
    return run;
  });

  server.post('/runs', async (request, reply) => {
    const { type, projectId, goal } = request.body as { type: string; projectId: string; goal: string };
    if (!type || !projectId || !goal) return reply.status(400).send({ error: 'type, projectId, and goal are required' });

    const project = server.db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).all();
    if (!project[0]) return reply.status(404).send({ error: 'Project not found' });

    try {
      const definition = server.pipelineLoader.load(type);
      const runId = await server.pipelineEngine.startRun(definition, projectId, goal);
      const run = server.pipelineEngine.getRunStatus(runId);
      reply.status(201).send(run);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(404).send({ error: message });
    }
  });

  server.post('/runs/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      server.pipelineEngine.approveStage(id);
      return server.pipelineEngine.getRunStatus(id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  server.post('/runs/:id/pause', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      server.pipelineEngine.pauseRun(id);
      return server.pipelineEngine.getRunStatus(id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  server.post('/runs/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      server.pipelineEngine.cancelRun(id);
      return server.pipelineEngine.getRunStatus(id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  server.get('/runs/:runId/stages', async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const run = server.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId)).all();
    if (!run[0]) return reply.status(404).send({ error: 'Pipeline run not found' });
    return server.db.select().from(pipelineStages).where(eq(pipelineStages.runId, runId)).all();
  });

  server.patch('/stages/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const existing = server.db.select().from(pipelineStages).where(eq(pipelineStages.id, id)).all();
    if (!existing[0]) return reply.status(404).send({ error: 'Stage not found' });

    const updates: Record<string, unknown> = {};
    if ('status' in body) updates.status = body.status;
    if ('input' in body) updates.input = body.input;
    if ('output' in body) updates.output = body.output;
    if ('employeeId' in body) updates.employeeId = body.employeeId;
    if ('startedAt' in body) updates.startedAt = body.startedAt;
    if ('completedAt' in body) updates.completedAt = body.completedAt;

    if (Object.keys(updates).length > 0) {
      server.db.update(pipelineStages).set(updates).where(eq(pipelineStages.id, id)).run();
    }

    const updated = server.db.select().from(pipelineStages).where(eq(pipelineStages.id, id)).all();
    return updated[0];
  });
};
