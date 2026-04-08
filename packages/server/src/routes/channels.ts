import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { channels } from '@vc/core';
import type { ChannelType } from '@vc/core';

export const channelRoutes: FastifyPluginAsync = async (server) => {
  server.get('/', async (request) => {
    const query = request.query as Record<string, string>;
    const rows = server.db.select().from(channels).all() as any[];
    const parsed = rows.map(row => {
      let members: string[] = [];
      try { members = JSON.parse(row.members as string); } catch { /* default empty */ }
      return { ...row, members };
    });

    if (query.type) return parsed.filter((c: any) => c.type === query.type);
    if (query.projectId) return parsed.filter((c: any) => c.projectId === query.projectId);
    if (query.memberId) return parsed.filter((c: any) => c.members.includes(query.memberId));
    return parsed;
  });

  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rows = server.db.select().from(channels).where(eq(channels.id, id)).all() as any[];
    if (!rows[0]) return reply.status(404).send({ error: 'Channel not found' });
    let members: string[] = [];
    try { members = JSON.parse(rows[0].members as string); } catch { /* default empty */ }
    return { ...rows[0], members };
  });

  server.post('/', async (request, reply) => {
    const { name, type, projectId, members = [] } = request.body as { name: string; type: ChannelType; projectId?: string; members?: string[] };
    if (!name || !type) return reply.status(400).send({ error: 'name and type are required' });

    const channel = server.imService.createChannel(name, type, projectId, members);
    reply.status(201).send(channel);
  });

  server.post('/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { employeeId } = request.body as { employeeId: string };
    if (!employeeId) return reply.status(400).send({ error: 'employeeId is required' });

    const existing = server.db.select().from(channels).where(eq(channels.id, id)).all();
    if (!existing[0]) return reply.status(404).send({ error: 'Channel not found' });

    server.imService.addMember(id, employeeId);
    const channel = server.imService.getChannel(id);
    return channel;
  });

  server.delete('/:id/members/:employeeId', async (request, reply) => {
    const { id, employeeId } = request.params as { id: string; employeeId: string };
    const existing = server.db.select().from(channels).where(eq(channels.id, id)).all();
    if (!existing[0]) return reply.status(404).send({ error: 'Channel not found' });

    server.imService.removeMember(id, employeeId);
    const channel = server.imService.getChannel(id);
    return channel;
  });

  server.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = server.db.select().from(channels).where(eq(channels.id, id)).all();
    if (!existing[0]) return reply.status(404).send({ error: 'Channel not found' });

    server.db.delete(channels).where(eq(channels.id, id)).run();
    reply.status(204).send();
  });
};
