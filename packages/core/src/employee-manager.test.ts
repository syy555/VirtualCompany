import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, closeDb } from './db.js';
import { EmployeeManager } from './employee-manager.js';
import { employees } from './schema.js';
import { eq } from 'drizzle-orm';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';

describe('EmployeeManager', () => {
  let db: ReturnType<typeof createDb>;
  let manager: EmployeeManager;
  let testRoot: string;

  afterEach(() => {
    closeDb();
    rmSync(testRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    testRoot = resolve('/tmp/vc-test-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    mkdirSync(testRoot, { recursive: true });
    mkdirSync(resolve(testRoot, 'agents', 'backend-dev'), { recursive: true });
    mkdirSync(resolve(testRoot, 'employees'), { recursive: true });

    writeFileSync(resolve(testRoot, 'agents', 'backend-dev', 'profile.yaml'), `name: 后端开发工程师
role: backend-dev
responsibilities:
  - 实现后端 API
skills:
  - TypeScript
personality: 严谨务实
`);

    writeFileSync(resolve(testRoot, 'agents', 'backend-dev', 'provider.yaml'), `default:
  provider: anthropic
  model: claude-sonnet-4-20250514
  api_key_env: ANTHROPIC_API_KEY
`);

    writeFileSync(resolve(testRoot, 'config.yaml'), `company:
  name: "Test Company"
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
  });

  it('should list roles', () => {
    const roles = manager.listRoles();
    expect(roles).toContain('backend-dev');
  });

  it('should read profile and provider', () => {
    const profile = manager.getProfile('backend-dev');
    expect(profile.role).toBe('backend-dev');
    expect(profile.name).toBe('后端开发工程师');

    const provider = manager.getProvider('backend-dev');
    expect(provider.default.model).toBe('claude-sonnet-4-20250514');
  });

  it('should hire a new employee', () => {
    const emp = manager.hire('backend-dev', '小明');
    expect(emp.id).toBe('backend-dev-001');
    expect(emp.name).toBe('小明');
    expect(emp.status).toBe('active');

    const active = manager.listActive();
    expect(active.length).toBe(1);
    expect(active[0].id).toBe('backend-dev-001');
  });

  it('should hire sequential employees with auto-increment', () => {
    manager.hire('backend-dev', 'A');
    manager.hire('backend-dev', 'B');
    const all = manager.listActive();
    expect(all.length).toBe(2);
    expect(all[0].id).toBe('backend-dev-001');
    expect(all[1].id).toBe('backend-dev-002');
  });

  it('should fire an employee', () => {
    manager.hire('backend-dev', 'A');
    manager.fire('backend-dev-001');

    const emp = manager.get('backend-dev-001');
    expect(emp?.status).toBe('terminated');

    const active = manager.listActive();
    expect(active.length).toBe(0);
  });

  it('should find available employee by role', () => {
    manager.hire('backend-dev', 'A');
    const found = manager.findAvailable('backend-dev');
    expect(found).toBeDefined();
    expect(found?.role).toBe('backend-dev');
  });

  it('should return undefined for non-existent employee', () => {
    const emp = manager.get('nonexistent');
    expect(emp).toBeUndefined();
  });
});
