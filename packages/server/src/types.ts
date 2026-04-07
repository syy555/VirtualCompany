import type { createDb, PipelineEngine, PipelineLoader, ReviewService } from '@vc/core';
import type { IMService } from './services/im-service.js';
import type { AuditLogger } from './services/audit-logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof createDb>;
    imService: IMService;
    pipelineEngine: PipelineEngine;
    pipelineLoader: PipelineLoader;
    reviewService: ReviewService;
    auditLogger: AuditLogger;
  }
}

export {};
