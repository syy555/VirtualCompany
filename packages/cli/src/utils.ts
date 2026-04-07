import { resolve } from 'path';
import { existsSync } from 'fs';

/** Find the virtual-company root directory */
export function getRoot(): string {
  // Check env var first
  if (process.env.VC_ROOT) return process.env.VC_ROOT;

  // Walk up from cwd looking for config.yaml
  let dir = process.cwd();
  while (dir !== '/') {
    if (existsSync(resolve(dir, 'config.yaml')) && existsSync(resolve(dir, 'agents'))) {
      return dir;
    }
    dir = resolve(dir, '..');
  }

  // Default to ~/virtual-company
  const home = process.env.HOME || process.env.USERPROFILE || '/';
  return resolve(home, 'virtual-company');
}

/** Get the database file path */
export function getDbPath(root: string): string {
  return resolve(root, 'data', 'vc.db');
}
