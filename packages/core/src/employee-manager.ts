import { resolve } from 'path';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import type { AgentProfile, AgentProviderConfig, Employee } from './types.js';
import { employees } from './schema.js';
import type { createDb } from './db.js';

type Db = ReturnType<typeof createDb>;

export class EmployeeManager {
  constructor(
    private db: Db,
    private rootDir: string,
  ) {}

  /** Read a role's profile.yaml */
  getProfile(role: string): AgentProfile {
    const profilePath = resolve(this.rootDir, 'agents', role, 'profile.yaml');
    if (!existsSync(profilePath)) {
      throw new Error(`Profile not found for role "${role}": ${profilePath}`);
    }
    const content = readFileSync(profilePath, 'utf-8');
    return parseYaml(content) as AgentProfile;
  }

  /** Read a role's provider.yaml */
  getProvider(role: string): AgentProviderConfig {
    const providerPath = resolve(this.rootDir, 'agents', role, 'provider.yaml');
    if (!existsSync(providerPath)) {
      throw new Error(`Provider config not found for role "${role}": ${providerPath}`);
    }
    const content = readFileSync(providerPath, 'utf-8');
    return parseYaml(content) as AgentProviderConfig;
  }

  /** List all available roles */
  listRoles(): string[] {
    const agentsDir = resolve(this.rootDir, 'agents');
    if (!existsSync(agentsDir)) return [];
    return readdirSync(agentsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  }

  /** Hire a new employee (create instance from role template) */
  hire(role: string, name?: string): Employee {
    const profile = this.getProfile(role);

    // Find next available number for this role
    const existing = this.db
      .select()
      .from(employees)
      .where(eq(employees.role, role))
      .all();

    const maxNum = existing.reduce((max, e) => {
      const match = e.id.match(/-(\d+)$/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);

    const num = String(maxNum + 1).padStart(3, '0');
    const id = `${role}-${num}`;
    const displayName = name || `${profile.role}-${num}`;
    const now = new Date();

    // Create employee instance directory
    const instanceDir = resolve(this.rootDir, 'employees', id);
    mkdirSync(resolve(instanceDir, 'memory'), { recursive: true });

    // Write instance.yaml
    const instanceYaml = [
      `id: "${id}"`,
      `role: "${role}"`,
      `name: "${displayName}"`,
      `created_at: "${now.toISOString()}"`,
    ].join('\n');
    writeFileSync(resolve(instanceDir, 'instance.yaml'), instanceYaml + '\n');

    // Insert into DB
    this.db.insert(employees).values({
      id,
      role,
      name: displayName,
      status: 'active',
      createdAt: now,
    }).run();

    return { id, role, name: displayName, status: 'active', createdAt: now };
  }

  /** Fire an employee (terminate + clear memory) */
  fire(employeeId: string): void {
    const now = new Date();

    this.db
      .update(employees)
      .set({ status: 'terminated', terminatedAt: now })
      .where(eq(employees.id, employeeId))
      .run();

    // Clear memory directory
    const memoryDir = resolve(this.rootDir, 'employees', employeeId, 'memory');
    if (existsSync(memoryDir)) {
      rmSync(memoryDir, { recursive: true });
      mkdirSync(memoryDir, { recursive: true });
    }
  }

  /** List all active employees */
  listActive(): Employee[] {
    return this.db
      .select()
      .from(employees)
      .where(eq(employees.status, 'active'))
      .all() as Employee[];
  }

  /** List employees by role */
  listByRole(role: string): Employee[] {
    const all = this.listActive();
    return all.filter(e => e.role === role);
  }

  /** Get a specific employee */
  get(employeeId: string): Employee | undefined {
    const result = this.db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .all();
    return result[0] as Employee | undefined;
  }

  /** Find an available employee for a role (least busy) */
  findAvailable(role: string): Employee | undefined {
    const available = this.listByRole(role);
    // TODO: factor in current task load
    return available[0];
  }

  /** Read employee memory files */
  getMemory(employeeId: string): string {
    const memoryDir = resolve(this.rootDir, 'employees', employeeId, 'memory');
    if (!existsSync(memoryDir)) return '';

    const files = readdirSync(memoryDir).filter(f => f.endsWith('.md'));
    return files
      .map(f => {
        const content = readFileSync(resolve(memoryDir, f), 'utf-8');
        return `## ${f.replace('.md', '')}\n${content}`;
      })
      .join('\n\n');
  }

  /** Append to employee memory */
  appendMemory(employeeId: string, filename: string, content: string): void {
    const memoryDir = resolve(this.rootDir, 'employees', employeeId, 'memory');
    mkdirSync(memoryDir, { recursive: true });
    const filePath = resolve(memoryDir, filename.endsWith('.md') ? filename : `${filename}.md`);

    if (existsSync(filePath)) {
      const existing = readFileSync(filePath, 'utf-8');
      writeFileSync(filePath, existing + '\n' + content);
    } else {
      writeFileSync(filePath, content);
    }
  }
}
