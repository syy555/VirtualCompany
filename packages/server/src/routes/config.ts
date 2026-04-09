import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { FastifyPluginAsync } from 'fastify';

export const configRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/config — return parsed config
  server.get('/', async () => {
    const configPath = resolve(server.rootDir, 'config.yaml');
    if (!existsSync(configPath)) return {};
    return parseYaml(readFileSync(configPath, 'utf-8'));
  });

  // PATCH /api/config — deep-merge partial updates into config.yaml
  server.patch('/', async (request, reply) => {
    const configPath = resolve(server.rootDir, 'config.yaml');
    const current = existsSync(configPath)
      ? parseYaml(readFileSync(configPath, 'utf-8')) as Record<string, any>
      : {};

    const updates = request.body as Record<string, any>;
    const merged = deepMerge(current, updates);
    writeFileSync(configPath, stringifyYaml(merged));
    return merged;
  });
};

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])
      && typeof target[key] === 'object' && target[key] !== null) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
