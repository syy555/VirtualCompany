import type { FastifyRequest, FastifyReply } from 'fastify';

const API_KEY = process.env.VC_API_KEY;

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!API_KEY) return;

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.status(401).send({ error: 'Missing authorization header' });
  }

  const [scheme, key] = authHeader.split(' ');
  if (scheme !== 'Bearer' || key !== API_KEY) {
    return reply.status(403).send({ error: 'Invalid API key' });
  }
}
