import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { FastifyPluginAsync } from 'fastify';
import { projects as projectsTable, PROJECT_STATUSES } from '@vc/core';
import type { ProjectStatus } from '@vc/core';

export const projectRoutes: FastifyPluginAsync = async (server) => {
  server.get('/', async () => {
    return server.db.select().from(projectsTable).all();
  });

  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = server.db.select().from(projectsTable).where(eq(projectsTable.id, id)).all();
    if (!result[0]) return reply.status(404).send({ error: 'Project not found' });
    return result[0];
  });

  server.post('/', async (request, reply) => {
    const { id, name, description, status = 'active' } = request.body as { id: string; name: string; description?: string; status?: string };
    if (!id || !name) return reply.status(400).send({ error: 'id and name are required' });
    if (!PROJECT_STATUSES.has(status)) return reply.status(400).send({ error: `Invalid status: ${status}` });

    const existing = server.db.select().from(projectsTable).where(eq(projectsTable.id, id)).all();
    if (existing.length > 0) return reply.status(409).send({ error: 'Project already exists' });

    const now = new Date();
    server.db.insert(projectsTable).values({ id, name, description: description || null, status: status as ProjectStatus, createdAt: now }).run();
    server.auditLogger.log('project.created', 'owner', { resourceType: 'project', resourceId: id, details: { name, description } });
    reply.status(201).send({ id, name, description, status, createdAt: now });
  });

  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const existing = server.db.select().from(projectsTable).where(eq(projectsTable.id, id)).all();
    if (!existing[0]) return reply.status(404).send({ error: 'Project not found' });

    const updates: Record<string, unknown> = {};
    if ('name' in body) updates.name = body.name;
    if ('description' in body) updates.description = body.description;
    if ('status' in body) updates.status = body.status;

    if (Object.keys(updates).length > 0) {
      server.db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).run();
      server.auditLogger.log('project.updated', 'owner', { resourceType: 'project', resourceId: id, details: updates });
    }

    const updated = server.db.select().from(projectsTable).where(eq(projectsTable.id, id)).all();
    return updated[0];
  });

  server.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = server.db.select().from(projectsTable).where(eq(projectsTable.id, id)).all();
    if (!existing[0]) return reply.status(404).send({ error: 'Project not found' });

    server.db.delete(projectsTable).where(eq(projectsTable.id, id)).run();
    reply.status(204).send();
  });
};
