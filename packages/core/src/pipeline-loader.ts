import { resolve } from 'path';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type { PipelineDefinition } from './types.js';

export class PipelineLoader {
  constructor(private rootDir: string) {}

  load(name: string): PipelineDefinition {
    const path = resolve(this.rootDir, 'pipelines', `${name}.yaml`);
    if (!existsSync(path)) throw new Error(`Pipeline not found: ${name}`);
    const content = readFileSync(path, 'utf-8');
    return parseYaml(content) as PipelineDefinition;
  }

  listAll(): PipelineDefinition[] {
    const dir = resolve(this.rootDir, 'pipelines');
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter(f => f.endsWith('.yaml'))
      .map(f => {
        const content = readFileSync(resolve(dir, f), 'utf-8');
        return parseYaml(content) as PipelineDefinition;
      });
  }

  getAvailableNames(): string[] {
    const dir = resolve(this.rootDir, 'pipelines');
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter(f => f.endsWith('.yaml'))
      .map(f => f.replace('.yaml', ''));
  }
}
