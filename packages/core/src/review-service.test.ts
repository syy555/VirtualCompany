import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from './db.js';
import { EmployeeManager } from './employee-manager.js';
import { ReviewService } from './review-service.js';
import { tasks, pipelineRuns, pipelineStages, projects } from './schema.js';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';

describe('ReviewService', () => {
  let db: ReturnType<typeof createDb>;
  let manager: EmployeeManager;
  let reviewService: ReviewService;
  const testRoot = resolve('/tmp/vc-review-test-' + Date.now());

  beforeEach(() => {
    rmSync(testRoot, { recursive: true, force: true });
    mkdirSync(testRoot, { recursive: true });
    mkdirSync(resolve(testRoot, 'agents', 'backend-dev'), { recursive: true });
    mkdirSync(resolve(testRoot, 'employees'), { recursive: true });

    writeFileSync(resolve(testRoot, 'agents', 'backend-dev', 'profile.yaml'), `name: 后端开发
role: backend-dev
responsibilities:
  - 实现 API
skills:
  - TypeScript
personality: 严谨
`);
    writeFileSync(resolve(testRoot, 'agents', 'backend-dev', 'provider.yaml'), `default:
  provider: anthropic
  model: claude-sonnet-4-20250514
  api_key_env: ANTHROPIC_API_KEY
`);
    writeFileSync(resolve(testRoot, 'config.yaml'), `company:
  name: "Test"
defaults:
  provider: anthropic
  model: claude-sonnet-4-20250514
  api_key_env: ANTHROPIC_API_KEY
  tool: claude-code
review:
  cycle: weekly
  thresholds:
    warning: 0.6
    replace: 0.4
  auto_replace: false
server:
  port: 3000
  ws_port: 3001
database:
  path: ./data/vc.db
`);

    db = createDb(resolve(testRoot, 'data', 'vc.db'));
    manager = new EmployeeManager(db, testRoot);
    reviewService = new ReviewService(db, manager, {
      company: { name: 'Test', description: '' },
      defaults: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', api_key_env: 'ANTHROPIC_API_KEY', tool: 'claude-code' },
      review: { cycle: 'weekly', thresholds: { warning: 0.6, replace: 0.4 }, auto_replace: false },
      server: { port: 3000, ws_port: 3001 },
      database: { path: './data/vc.db' },
    });
  });

  it('should calculate scores for employee with no tasks', async () => {
    manager.hire('backend-dev', 'A');
    const results = await reviewService.runReviewCycle('2026-W14');
    expect(results.length).toBe(1);
  });

  it('should give high score for completed tasks', async () => {
    manager.hire('backend-dev', 'A');
    const now = new Date();

    db.insert(projects).values({
      id: 'proj-1',
      name: 'Test Project',
      status: 'active',
      createdAt: now,
    }).run();

    db.insert(tasks).values({
      id: 'task-1',
      projectId: 'proj-1',
      employeeId: 'backend-dev-001',
      title: 'Task 1',
      status: 'done',
      createdAt: now,
      updatedAt: now,
    }).run();

    db.insert(tasks).values({
      id: 'task-2',
      projectId: 'proj-1',
      employeeId: 'backend-dev-001',
      title: 'Task 2',
      status: 'done',
      createdAt: now,
      updatedAt: now,
    }).run();

    const results = await reviewService.runReviewCycle('2026-W14');
    expect(results.length).toBe(1);
    expect(results[0]).toBe('pass');
  });

  it('should give warning for low performance', async () => {
    manager.hire('backend-dev', 'A');
    const now = new Date();

    db.insert(projects).values({
      id: 'proj-1',
      name: 'Test Project',
      status: 'active',
      createdAt: now,
    }).run();

    db.insert(tasks).values({
      id: 'task-1',
      projectId: 'proj-1',
      employeeId: 'backend-dev-001',
      title: 'Task 1',
      status: 'backlog',
      createdAt: now,
      updatedAt: now,
    }).run();

    const results = await reviewService.runReviewCycle('2026-W14');
    expect(results[0]).toBe('replace');
  });

  it('should get employee history', () => {
    manager.hire('backend-dev', 'A');
    const history = reviewService.getEmployeeHistory('backend-dev-001');
    expect(Array.isArray(history)).toBe(true);
  });

  it('should get period summary', () => {
    const summary = reviewService.getPeriodSummary('2026-W14');
    expect(summary.period).toBe('2026-W14');
    expect(summary.total).toBe(0);
    expect(summary.avgScore).toBe(0);
  });
});
