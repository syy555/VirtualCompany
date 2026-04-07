import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { FastifyPluginAsync } from 'fastify';
import { performanceReviews, employees } from '@vc/core';

export const reviewRoutes: FastifyPluginAsync = async (server) => {
  server.get('/', async (request) => {
    const query = request.query as Record<string, string>;
    let reviews = server.db.select().from(performanceReviews).orderBy(desc(performanceReviews.createdAt)).all();
    if (query.employeeId) reviews = reviews.filter(r => r.employeeId === query.employeeId);
    if (query.period) reviews = reviews.filter(r => r.period === query.period);
    if (query.result) reviews = reviews.filter(r => r.result === query.result);
    return reviews.map(r => ({ ...r, scores: JSON.parse(r.scores as string) }));
  });

  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = server.db.select().from(performanceReviews).where(eq(performanceReviews.id, id)).all();
    if (!result[0]) return reply.status(404).send({ error: 'Review not found' });
    return { ...result[0], scores: JSON.parse(result[0].scores as string) };
  });

  server.post('/', async (request, reply) => {
    const { id, employeeId, reviewerId, period, scores, total, result } = request.body as {
      id?: string; employeeId: string; reviewerId: string; period: string;
      scores: Record<string, number>; total: number; result: 'pass' | 'warning' | 'replace';
    };
    if (!employeeId || !reviewerId || !period || !scores || total === undefined || !result) {
      return reply.status(400).send({ error: 'employeeId, reviewerId, period, scores, total, and result are required' });
    }

    const employee = server.db.select().from(employees).where(eq(employees.id, employeeId)).all();
    if (!employee[0]) return reply.status(404).send({ error: 'Employee not found' });

    const reviewId = id || `review-${nanoid(8)}`;
    const now = new Date();
    server.db.insert(performanceReviews).values({
      id: reviewId,
      employeeId,
      reviewerId,
      period,
      scores: JSON.stringify(scores),
      total,
      result,
      createdAt: now,
    }).run();

    const created = server.db.select().from(performanceReviews).where(eq(performanceReviews.id, reviewId)).all();
    reply.status(201).send({ ...created[0], scores: JSON.parse(created[0].scores as string) });
  });

  server.get('/employee/:employeeId', async (request, reply) => {
    const { employeeId } = request.params as { employeeId: string };
    const employee = server.db.select().from(employees).where(eq(employees.id, employeeId)).all();
    if (!employee[0]) return reply.status(404).send({ error: 'Employee not found' });

    const reviews = server.db.select().from(performanceReviews).where(eq(performanceReviews.employeeId, employeeId)).orderBy(desc(performanceReviews.createdAt)).all();
    return reviews.map(r => ({ ...r, scores: JSON.parse(r.scores as string) }));
  });
};
