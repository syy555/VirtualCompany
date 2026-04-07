import { eq, desc } from 'drizzle-orm';
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

  server.post('/run', async (request, reply) => {
    const body = request.body as { period?: string } | undefined;
    try {
      const results = await server.reviewService.runReviewCycle(body?.period);
      return { success: true, results, message: `Review cycle completed. ${results.length} employees reviewed.` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  server.get('/summary/:period', async (request, reply) => {
    const { period } = request.params as { period: string };
    return server.reviewService.getPeriodSummary(period);
  });

  server.get('/employee/:employeeId', async (request, reply) => {
    const { employeeId } = request.params as { employeeId: string };
    const employee = server.db.select().from(employees).where(eq(employees.id, employeeId)).all();
    if (!employee[0]) return reply.status(404).send({ error: 'Employee not found' });
    return server.reviewService.getEmployeeHistory(employeeId);
  });
};
