import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { createDb } from '@vc/core';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

type Db = ReturnType<typeof createDb>;

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  actorId: text('actor_id'),
  actorType: text('actor_type').notNull(), // 'owner' | 'employee' | 'system'
  details: text('details'), // JSON
  ip: text('ip'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;

export type Action =
  | 'employee.hired'
  | 'employee.fired'
  | 'employee.updated'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'pipeline.started'
  | 'pipeline.approved'
  | 'pipeline.paused'
  | 'pipeline.cancelled'
  | 'pipeline.completed'
  | 'pipeline.failed'
  | 'channel.created'
  | 'message.sent'
  | 'review.run'
  | 'provider.updated';

export class AuditLogger {
  constructor(private db: Db) {
    this.ensureTable();
  }

  private ensureTable(): void {
    const sqlite = (this.db as any)._?.sqlite;
    if (!sqlite) return;
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        actor_id TEXT,
        actor_type TEXT NOT NULL,
        details TEXT,
        ip TEXT,
        created_at INTEGER NOT NULL
      )
    `);
  }

  log(
    action: Action,
    actorType: 'owner' | 'employee' | 'system',
    options: {
      resourceType: string;
      resourceId?: string;
      actorId?: string;
      details?: Record<string, unknown>;
      ip?: string;
    },
  ): string {
    const id = `log-${nanoid(10)}`;
    const now = new Date();

    this.db.insert(auditLogs).values({
      id,
      action,
      resourceType: options.resourceType,
      resourceId: options.resourceId || null,
      actorId: options.actorId || null,
      actorType,
      details: options.details ? JSON.stringify(options.details) : null,
      ip: options.ip || null,
      createdAt: now,
    }).run();

    return id;
  }

  query(options: {
    action?: Action;
    resourceType?: string;
    resourceId?: string;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): AuditLog[] {
    const { limit = 100 } = options;
    let results = this.db.select().from(auditLogs).all() as AuditLog[];

    if (options.action) {
      results = results.filter(r => r.action === options.action);
    }
    if (options.resourceType) {
      results = results.filter(r => r.resourceType === options.resourceType);
    }
    if (options.resourceId) {
      results = results.filter(r => r.resourceId === options.resourceId);
    }
    if (options.actorId) {
      results = results.filter(r => r.actorId === options.actorId);
    }
    if (options.startDate) {
      results = results.filter(r => r.createdAt >= options.startDate!);
    }
    if (options.endDate) {
      results = results.filter(r => r.createdAt <= options.endDate!);
    }

    return results
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getRecentByResource(resourceType: string, resourceId: string, limit = 10): AuditLog[] {
    return this.query({ resourceType, resourceId, limit });
  }

  getRecentByActor(actorId: string, limit = 20): AuditLog[] {
    return this.query({ actorId, limit });
  }
}