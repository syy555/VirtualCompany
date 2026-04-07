import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type { createDb, EmployeeManager, TemplateRenderer } from './index.js';
import type { AgentProviderConfig, ProviderConfig } from './types.js';

const execAsync = promisify(exec);

export interface AgentExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

export interface AgentTask {
  employeeId: string;
  projectId: string;
  instruction: string;
  input?: string;
  output?: string;
  timeoutMs?: number;
}

export class AgentExecutor {
  constructor(
    private db: ReturnType<typeof createDb>,
    private employeeManager: EmployeeManager,
    private templateRenderer: TemplateRenderer,
    private rootDir: string,
  ) {}

  async execute(task: AgentTask): Promise<AgentExecutionResult> {
    const employee = this.employeeManager.get(task.employeeId);
    if (!employee) throw new Error(`Employee not found: ${task.employeeId}`);

    const providerConfig = this.getProviderConfig(employee.role);
    const tool = this.getToolFromProvider(providerConfig);
    const model = this.getModelFromProvider(providerConfig);
    const apiKey = this.getApiKey(providerConfig);

    const projectDir = resolve(this.rootDir, 'projects', task.projectId);
    if (!existsSync(projectDir)) throw new Error(`Project not found: ${task.projectId}`);

    const instructionFile = resolve(projectDir, '.vc', 'agent-instruction.md');
    mkdirSync(resolve(projectDir, '.vc'), { recursive: true });

    const instruction = this.buildInstruction(task, employee.role);
    writeFileSync(instructionFile, instruction);

    switch (tool) {
      case 'claude-code':
        return this.executeClaudeCode(projectDir, instructionFile, apiKey, model, task.timeoutMs);
      case 'codex':
        return this.executeCodex(projectDir, instructionFile, apiKey, model, task.timeoutMs);
      case 'opencode':
        return this.executeOpenCode(projectDir, instructionFile, apiKey, model, task.timeoutMs);
      default:
        throw new Error(`Unsupported tool: ${tool}`);
    }
  }

  private getProviderConfig(role: string): ProviderConfig {
    const providerPath = resolve(this.rootDir, 'agents', role, 'provider.yaml');
    if (!existsSync(providerPath)) {
      const configPath = resolve(this.rootDir, 'config.yaml');
      const content = readFileSync(configPath, 'utf-8');
      const yaml = parseYaml(content) as any;
      return {
        provider: yaml.defaults.provider,
        model: yaml.defaults.model,
        api_key_env: yaml.defaults.api_key_env,
      };
    }

    const content = readFileSync(providerPath, 'utf-8');
    const config = parseYaml(content) as AgentProviderConfig;
    return config.default;
  }

  private getToolFromProvider(config: ProviderConfig): string {
    const configPath = resolve(this.rootDir, 'config.yaml');
    const content = readFileSync(configPath, 'utf-8');
    const yaml = parseYaml(content) as any;
    return yaml.defaults.tool || 'claude-code';
  }

  private getModelFromProvider(config: ProviderConfig): string {
    return config.model;
  }

  private getApiKey(config: ProviderConfig): string {
    const envVar = config.api_key_env;
    const key = process.env[envVar];
    if (!key) throw new Error(`API key not found in environment variable: ${envVar}`);
    return key;
  }

  private buildInstruction(task: AgentTask, role: string): string {
    const lines = [
      `# Agent Task Instruction`,
      ``,
      `## Role: ${role}`,
      ``,
      `## Task`,
      ``,
      task.instruction,
      ``,
    ];

    if (task.input) {
      lines.push('## Input Context', '', task.input, '');
    }

    if (task.output) {
      lines.push('## Expected Output', '', task.output, '');
    }

    lines.push(
      '## Requirements',
      '',
      '1. Complete the task according to the instructions above',
      '2. Follow all company rules and coding standards',
      '3. Report results in the following JSON format at the end:',
      '',
      '```json',
      '{',
      '  "status": "completed|blocked|needs_review",',
      '  "summary": "Brief description of what was done",',
      '  "output_files": ["list of modified/created files"],',
      '  "next_suggestion": "Suggested next step (optional)"',
      '}',
      '```',
      '',
    );

    return lines.join('\n');
  }

  private async executeClaudeCode(
    projectDir: string,
    instructionFile: string,
    apiKey: string,
    model: string,
    timeoutMs = 300000,
  ): Promise<AgentExecutionResult> {
    const instruction = readFileSync(instructionFile, 'utf-8');
    const escapedInstruction = instruction.replace(/'/g, "'\\''");

    const command = `ANTHROPIC_API_KEY='${apiKey}' claude-code --model '${model}' --print '${escapedInstruction}'`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectDir,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        output: stdout,
        exitCode: 0,
      };
    } catch (err: any) {
      return {
        success: false,
        output: err.stdout || '',
        error: err.stderr || err.message,
        exitCode: err.code || 1,
      };
    }
  }

  private async executeCodex(
    projectDir: string,
    instructionFile: string,
    apiKey: string,
    model: string,
    timeoutMs = 300000,
  ): Promise<AgentExecutionResult> {
    const instruction = readFileSync(instructionFile, 'utf-8');
    const escapedInstruction = instruction.replace(/'/g, "'\\''");

    const command = `OPENAI_API_KEY='${apiKey}' codex --model '${model}' '${escapedInstruction}'`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectDir,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        output: stdout,
        exitCode: 0,
      };
    } catch (err: any) {
      return {
        success: false,
        output: err.stdout || '',
        error: err.stderr || err.message,
        exitCode: err.code || 1,
      };
    }
  }

  private async executeOpenCode(
    projectDir: string,
    instructionFile: string,
    apiKey: string,
    model: string,
    timeoutMs = 300000,
  ): Promise<AgentExecutionResult> {
    const instruction = readFileSync(instructionFile, 'utf-8');
    const escapedInstruction = instruction.replace(/'/g, "'\\''");

    const command = `opencode --model '${model}' --instruction '${escapedInstruction}'`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectDir,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        success: true,
        output: stdout,
        exitCode: 0,
      };
    } catch (err: any) {
      return {
        success: false,
        output: err.stdout || '',
        error: err.stderr || err.message,
        exitCode: err.code || 1,
      };
    }
  }
}
