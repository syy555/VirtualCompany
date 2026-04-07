import type { FastifyPluginAsync } from 'fastify';
import type { MessageType } from '@vc/core';

export const messageRoutes: FastifyPluginAsync = async (server) => {
  server.get('/channels/:channelId', async (request) => {
    const { channelId } = request.params as { channelId: string };
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    return server.imService.getChannelMessages(channelId, limit);
  });

  server.post('/channels/:channelId', async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const { senderId, content, type = 'text', metadata } = request.body as {
      senderId: string; content: string; type?: MessageType; metadata?: Record<string, unknown>;
    };
    if (!senderId || !content) return reply.status(400).send({ error: 'senderId and content are required' });

    const message = server.imService.sendMessage(channelId, senderId, content, type, metadata);
    reply.status(201).send(message);
  });
};
