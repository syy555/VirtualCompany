import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import { nanoid } from 'nanoid';
import type { WebSocketClient } from '../services/im-service.js';

export function registerWebSocket(server: FastifyInstance): void {
  server.register(async (fastify: FastifyInstance) => {
    fastify.get('/ws', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
      const clientId = nanoid(12);
      const client: WebSocketClient = {
        ws: socket,
        channels: [],
      };

      socket.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'register') {
            client.employeeId = msg.employeeId;
            server.imService.registerClient(clientId, client);
            socket.send(JSON.stringify({ type: 'registered', clientId }));
          } else if (msg.type === 'join') {
            if (!client.channels.includes(msg.channelId)) {
              client.channels.push(msg.channelId);
            }
          } else if (msg.type === 'leave') {
            client.channels = client.channels.filter(c => c !== msg.channelId);
          } else if (msg.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // ignore malformed messages
        }
      });

      socket.on('close', () => {
        server.imService.unregisterClient(clientId);
      });
    });
  });
}
