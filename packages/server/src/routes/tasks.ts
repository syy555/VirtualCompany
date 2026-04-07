import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { FastifyPluginAsync } from 'fastify';
import { tasks, projects as projectsTable, employees } from '@vc/core';

export const taskRoutes: FastifyPluginAsync = async (server) => {
  server.get('/', async (request) => {
    const query = request.query as Record<string, string>;
    let result = server.db.select().from(tasks).all();
    if (query.projectId) result = result.filter(t => t.projectId === query.projectId);
    if (query.employeeId) result = result.filter(t => t.employeeId === query.employeeId);
    if (query.status) result = result.filter(t => t.status === query.status);
    return result;
  });

  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = server.db.select().from(tasks).where(eq(tasks.id, id)).all();
    if (!result[0]) return reply.status(404).send({ error: 'Task not found' });
    return result[0];
  });

  server.post('/', async (request, reply) => {
    const { id, projectId, employeeId, title, description, status = 'backlog', pipelineStageId } = request.body as {
      id?: string; projectId: string; employeeId?: string; title: string; description?: string; status?: string; pipelineStageId?: string;
    };
    if (!projectId || !title) return reply.status(400).send({ error: 'projectId and title are required' });

    const project = server.db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).all();
    if (!project[0]) return reply.status(404).send({ error: 'Project not found' });

    if (employeeId) {
      const emp = server.db.select().from(employees).where(eq(employees.id, employeeId)).all();
      if (!emp[0]) return reply.status(404).send({ error: 'Employee not found' });
    }

    const taskId = id || `task-${nanoid(8)}`;
    const now = new Date();
    server.db.insert(tasks).values({
      id: taskId,
      projectId,
      employeeId: employeeId || null,
      title,
      description: description || null,
      status: status as any,
      pipelineStageId: pipelineStageId || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = server.db.select().from(tasks).where(eq(tasks.id, taskId)).all();
    reply.status(201).send(created[0]);
  });

  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const existing = server.db.select().from(tasks).where(eq(tasks.id, id)).all();
    if (!existing[0]) return reply.status(404).send({ error: 'Task not found' });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if ('title' in body) updates.title = body.title;
    if ('description' in body) updates.description = body.description;
    if ('status' in body) updates.status = body.status;
    if ('employeeId' in body) updates.employeeId = body.employeeId;
    if ('pipelineStageId' in body) updates.pipelineStageId = body.pipelineStageId;

    server.db.update(tasks).set(updates).where(eq(tasks.id, id)).run();
    const updated = server.db.select().from(tasks).where(eq(tasks.id, id)).all();
    return updated[0];
  });

  server.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = server.db.select().from(tasks).where(eq(tasks.id, id)).all();
    if (!existing[0]) return reply.status(404).send({ error: 'Task not found' });

    server.db.delete(tasks).where(eq(tasks.id, id)).run();
    reply.status(204).send();
  });
};
