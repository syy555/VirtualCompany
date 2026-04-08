import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import {
  createDb,
  EmployeeManager,
  PipelineEngine,
  ReviewService,
  type VCConfig,
} from '@vc/core';
import { getRoot, getDbPath } from '../utils.js';

export interface ActionContext {
  root: string;
  config: VCConfig;
  db: ReturnType<typeof createDb>;
  em: EmployeeManager;
  pe: PipelineEngine;
  rs: ReviewService;
}

let _ctx: ActionContext | null = null;

export function getContext(): ActionContext {
  if (_ctx) return _ctx;

  const root = getRoot();
  const configPath = resolve(root, 'config.yaml');
  const config: VCConfig = existsSync(configPath)
    ? parseYaml(readFileSync(configPath, 'utf8'))
    : ({} as VCConfig);

  const db = createDb(getDbPath(root));
  const em = new EmployeeManager(db, root);
  const pe = new PipelineEngine(db, em);
  const rs = new ReviewService(db, em, config);

  _ctx = { root, config, db, em, pe, rs };
  return _ctx;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
