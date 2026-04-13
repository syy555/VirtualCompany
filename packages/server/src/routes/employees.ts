import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { FastifyPluginAsync } from 'fastify';
import { employees, tasks, projects as projectsTable, EMPLOYEE_STATUSES } from '@vc/core';
import type { EmployeeStatus } from '@vc/core';

export const employeeRoutes: FastifyPluginAsync = async (server) => {
  server.get('/roles', async () => {
    return server.employeeManager.listRolesWithProfile();
  });

  server.get('/', async () => {
    const db = server.db;
    return db.select().from(employees).all();
  });

  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = server.db;
    const result = db.select().from(employees).where(eq(employees.id, id)).all();
    if (!result[0]) return reply.status(404).send({ error: 'Employee not found' });
    return result[0];
  });

  server.post('/', async (request, reply) => {
    const { id, role, name, status = 'active' } = request.body as { id: string; role: string; name: string; status?: string };
    if (!id || !role || !name) return reply.status(400).send({ error: 'id, role, and name are required' });
    if (!EMPLOYEE_STATUSES.has(status)) return reply.status(400).send({ error: `Invalid status: ${status}` });

    const db = server.db;
    const existing = db.select().from(employees).where(eq(employees.id, id)).all();
    if (existing.length > 0) return reply.status(409).send({ error: 'Employee already exists' });

    const now = new Date();
    db.insert(employees).values({ id, role, name, status: status as EmployeeStatus, createdAt: now }).run();
    server.auditLogger.log('employee.hired', 'owner', { resourceType: 'employee', resourceId: id, details: { role, name } });
    reply.status(201).send({ id, role, name, status, createdAt: now });
  });

  server.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const db = server.db;

    const existing = db.select().from(employees).where(eq(employees.id, id)).all();
    if (!existing[0]) return reply.status(404).send({ error: 'Employee not found' });

    const updates: Record<string, unknown> = {};
    if ('name' in body) updates.name = body.name;
    if ('status' in body) updates.status = body.status;
    if ('terminatedAt' in body) updates.terminatedAt = body.terminatedAt ? new Date(body.terminatedAt as string) : null;

    if (Object.keys(updates).length > 0) {
      db.update(employees).set(updates).where(eq(employees.id, id)).run();
      server.auditLogger.log('employee.updated', 'owner', { resourceType: 'employee', resourceId: id, details: updates });
    }

    const updated = db.select().from(employees).where(eq(employees.id, id)).all();
    return updated[0];
  });

  server.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = server.db;

    const existing = db.select().from(employees).where(eq(employees.id, id)).all();
    if (!existing[0]) return reply.status(404).send({ error: 'Employee not found' });

    db.delete(employees).where(eq(employees.id, id)).run();
    server.auditLogger.log('employee.fired', 'owner', { resourceType: 'employee', resourceId: id });
    reply.status(204).send();
  });

  server.get('/:id/tasks', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = server.db;

    const employee = db.select().from(employees).where(eq(employees.id, id)).all();
    if (!employee[0]) return reply.status(404).send({ error: 'Employee not found' });

    return db.select().from(tasks).where(eq(tasks.employeeId, id)).all();
  });

  // Get provider config for a role
  server.get('/roles/:role/provider', async (request, reply) => {
    const { role } = request.params as { role: string };
    const providerPath = resolve(server.rootDir, 'agents', role, 'provider.yaml');
    if (!existsSync(providerPath)) {
      // Return global defaults
      const configPath = resolve(server.rootDir, 'config.yaml');
      const config = parseYaml(readFileSync(configPath, 'utf-8')) as any;
      return { provider: config.defaults.provider, model: config.defaults.model, api_key_env: config.defaults.api_key_env, base_url: config.defaults.base_url };
    }
    const config = parseYaml(readFileSync(providerPath, 'utf-8')) as any;
    return config.default || {};
  });

  // Update provider config for a role
  server.put('/roles/:role/provider', async (request, reply) => {
    const { role } = request.params as { role: string };
    const body = request.body as { provider?: string; model?: string; api_key_env?: string; base_url?: string };
    const providerPath = resolve(server.rootDir, 'agents', role, 'provider.yaml');

    let config: any = { default: {}, tools: {} };
    if (existsSync(providerPath)) {
      config = parseYaml(readFileSync(providerPath, 'utf-8')) || config;
    }

    if (body.provider !== undefined) config.default.provider = body.provider;
    if (body.model !== undefined) config.default.model = body.model;
    if (body.api_key_env !== undefined) config.default.api_key_env = body.api_key_env;
    if (body.base_url !== undefined) config.default.base_url = body.base_url;

    writeFileSync(providerPath, stringifyYaml(config));
    server.auditLogger.log('provider.updated', 'owner', { resourceType: 'role', resourceId: role, details: { model: body.model } });
    return config.default;
  });
};
