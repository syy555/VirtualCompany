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
          } else if (msg.type === 'subscribe') {
            if (!client.subscriptions) client.subscriptions = new Set();
            client.subscriptions.add(msg.channel);
            socket.send(JSON.stringify({ type: 'subscribed', channel: msg.channel }));
          } else if (msg.type === 'unsubscribe') {
            if (client.subscriptions) {
              client.subscriptions.delete(msg.channel);
            }
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

export function broadcastToSubscribers(server: FastifyInstance, channel: string, payload: unknown): void {
  const data = JSON.stringify(payload);
  const clients = (server.imService as any).clients as Map<string, WebSocketClient>;
  if (!clients) return;

  for (const [, client] of clients) {
    if (client.subscriptions?.has(channel)) {
      try {
        client.ws.send(data);
      } catch {
        // client disconnected
      }
    }
  }
}
