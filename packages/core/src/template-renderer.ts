import Handlebars from 'handlebars';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import type { EmployeeManager } from './employee-manager.js';

interface RenderContext {
  company: {
    name: string;
    rules: string[];      // content of each rule file
    knowledge: string[];  // content of each knowledge file
  };
  agent: {
    role: string;
    profile: string;      // YAML content of profile
    memory: string;       // combined memory content
  };
  project: {
    name: string;
    rules: string;        // project-specific rules
    context: string;      // project context summary
    tasks: string;        // active tasks summary
  };
}

export class TemplateRenderer {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private rootDir: string) {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    const templatesDir = resolve(this.rootDir, 'company', 'templates');
    if (!existsSync(templatesDir)) return;

    const files = readdirSync(templatesDir).filter(f => f.endsWith('.hbs'));
    for (const file of files) {
      const content = readFileSync(resolve(templatesDir, file), 'utf-8');
      const name = file.replace('.hbs', '');
      this.templates.set(name, Handlebars.compile(content));
    }
  }

  /** Read all files from a directory, return their contents */
  private readDir(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .map(f => readFileSync(resolve(dir, f), 'utf-8'));
  }

  /** Build the render context for a specific employee + project */
  buildContext(
    employeeManager: EmployeeManager,
    employeeId: string,
    projectName: string,
  ): RenderContext {
    const employee = employeeManager.get(employeeId);
    if (!employee) throw new Error(`Employee not found: ${employeeId}`);

    const profilePath = resolve(this.rootDir, 'agents', employee.role, 'profile.yaml');
    const profileContent = existsSync(profilePath) ? readFileSync(profilePath, 'utf-8') : '';

    const projectDir = resolve(this.rootDir, 'projects', projectName);
    const vcDir = resolve(projectDir, '.vc');

    const projectRulesPath = resolve(vcDir, 'project-rules.md');
    const contextPath = resolve(vcDir, 'context.md');
    const tasksDir = resolve(vcDir, 'tasks', 'active');

    return {
      company: {
        name: this.getCompanyName(),
        rules: this.readDir(resolve(this.rootDir, 'company', 'rules')),
        knowledge: this.readDir(resolve(this.rootDir, 'company', 'knowledge')),
      },
      agent: {
        role: employee.role,
        profile: profileContent,
        memory: employeeManager.getMemory(employeeId),
      },
      project: {
        name: projectName,
        rules: existsSync(projectRulesPath) ? readFileSync(projectRulesPath, 'utf-8') : '',
        context: existsSync(contextPath) ? readFileSync(contextPath, 'utf-8') : '',
        tasks: this.readDir(tasksDir).join('\n---\n'),
      },
    };
  }

  private getCompanyName(): string {
    const configPath = resolve(this.rootDir, 'config.yaml');
    if (!existsSync(configPath)) return 'Virtual Company';
    const content = readFileSync(configPath, 'utf-8');
    const match = content.match(/name:\s*"?([^"\n]+)"?/);
    return match ? match[1] : 'Virtual Company';
  }

  /** Render a specific template with context */
  render(templateName: string, context: RenderContext): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}. Available: ${[...this.templates.keys()].join(', ')}`);
    }
    return template(context);
  }

  /** Generate all instruction files for a project + employee */
  sync(
    employeeManager: EmployeeManager,
    employeeId: string,
    projectName: string,
  ): void {
    const context = this.buildContext(employeeManager, employeeId, projectName);
    const projectDir = resolve(this.rootDir, 'projects', projectName);

    for (const [name, template] of this.templates) {
      const output = template(context);
      writeFileSync(resolve(projectDir, name), output);
    }
  }
}
