import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { createDb } from '@vc/core';
import { channels, messages } from '@vc/core';
import type { Channel, Message, ChannelType, MessageType } from '@vc/core';

type Db = ReturnType<typeof createDb>;

export interface WebSocketClient {
  ws: { send: (data: string) => void };
  employeeId?: string;
  channels: string[];
  subscriptions?: Set<string>;
}

export class IMService {
  private clients: Map<string, WebSocketClient> = new Map();

  constructor(private db: Db) {}

  createChannel(name: string, type: ChannelType, projectId?: string, members: string[] = []): Channel {
    const id = `ch-${nanoid(8)}`;
    const now = new Date();
    const channel: typeof channels.$inferInsert = {
      id,
      name,
      type,
      projectId: projectId || null,
      members: JSON.stringify(members),
      createdAt: now,
    };
    this.db.insert(channels).values(channel).run();
    return { ...channel, members } as Channel;
  }

  getChannel(id: string): Channel | undefined {
    const result = this.db.select().from(channels).where(eq(channels.id, id)).all();
    if (!result[0]) return undefined;
    const row = result[0] as typeof channels.$inferSelect;
    let members: string[] = [];
    try { members = JSON.parse(row.members as string); } catch { /* corrupted data, default to empty */ }
    return { ...row, members } as Channel;
  }

  listChannels(type?: ChannelType, projectId?: string): Channel[] {
    const rows = this.db.select().from(channels).all() as (typeof channels.$inferSelect)[];
    const filtered = rows.filter(row => {
      if (type && row.type !== type) return false;
      if (projectId && row.projectId !== projectId) return false;
      return true;
    });
    return filtered.map(row => {
      let members: string[] = [];
      try { members = JSON.parse(row.members as string); } catch { /* default empty */ }
      return { ...row, members };
    }) as Channel[];
  }

  addMember(channelId: string, employeeId: string): void {
    const channel = this.getChannel(channelId);
    if (!channel) throw new Error(`Channel not found: ${channelId}`);
    if (!channel.members.includes(employeeId)) {
      channel.members.push(employeeId);
      this.db.update(channels).set({ members: JSON.stringify(channel.members) }).where(eq(channels.id, channelId)).run();
    }
  }

  removeMember(channelId: string, employeeId: string): void {
    const channel = this.getChannel(channelId);
    if (!channel) throw new Error(`Channel not found: ${channelId}`);
    channel.members = channel.members.filter(m => m !== employeeId);
    this.db.update(channels).set({ members: JSON.stringify(channel.members) }).where(eq(channels.id, channelId)).run();
  }

  sendMessage(channelId: string, senderId: string, content: string, type: MessageType = 'text', metadata?: Record<string, unknown>): Message {
    const channel = this.getChannel(channelId);
    if (!channel) throw new Error(`Channel not found: ${channelId}`);

    const id = `msg-${nanoid(10)}`;
    const now = new Date();
    const message: typeof messages.$inferInsert = {
      id,
      channelId,
      senderId,
      content,
      type,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: now,
    };
    this.db.insert(messages).values(message).run();

    const created: Message = { ...message, metadata: metadata || undefined, type: type as MessageType };
    this.broadcastToChannel(channelId, { type: 'message', channel: channelId, data: created });
    return created;
  }

  getChannelMessages(channelId: string, limit = 50, before?: string): Message[] {
    let query = this.db.select().from(messages).where(eq(messages.channelId, channelId)).orderBy(desc(messages.createdAt)).limit(limit);
    const rows = query.all() as (typeof messages.$inferSelect)[];
    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? (() => { try { return JSON.parse(row.metadata); } catch { return undefined; } })() : undefined,
    })).reverse() as Message[];
  }

  registerClient(clientId: string, client: WebSocketClient): void {
    this.clients.set(clientId, client);
    if (client.employeeId) {
      const employeeChannels = this.db.select().from(channels).all();
      const joinedChannels = employeeChannels
        .filter(ch => {
          try {
            const members = JSON.parse((ch as any).members as string) as string[];
            return members.includes(client.employeeId!);
          } catch { return false; }
        })
        .map(ch => ch.id);
      client.channels = joinedChannels;
    }
  }

  unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  broadcastToChannel(channelId: string, payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const [, client] of this.clients) {
      if (client.channels.includes(channelId)) {
        try {
          client.ws.send(data);
        } catch {
          // client disconnected, will be cleaned up
        }
      }
    }
  }

  broadcastToEmployee(employeeId: string, payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const [, client] of this.clients) {
      if (client.employeeId === employeeId) {
        try {
          client.ws.send(data);
        } catch {
          // client disconnected
        }
      }
    }
  }

  broadcastAll(payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const [, client] of this.clients) {
      try {
        client.ws.send(data);
      } catch {
        // client disconnected
      }
    }
  }
}
