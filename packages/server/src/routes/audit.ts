import { eq, desc } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { employees, tasks, projects as projectsTable } from '@vc/core';

export const auditRoutes: FastifyPluginAsync = async (server) => {
  server.get('/', async (request) => {
    const query = request.query as Record<string, string>;
    return server.auditLogger.query({
      action: query.action as any,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      actorId: query.actorId,
      limit: parseInt(query.limit || '100', 10),
    });
  });

  server.get('/resource/:type/:id', async (request, reply) => {
    const { type, id } = request.params as { type: string; id: string };
    const logs = server.auditLogger.getRecentByResource(type, id);
    return logs;
  });

  server.get('/actor/:actorId', async (request, reply) => {
    const { actorId } = request.params as { actorId: string };
    const logs = server.auditLogger.getRecentByActor(actorId);
    return logs;
  });
};