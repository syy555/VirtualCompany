import { getContext, type ActionResult } from './context.js';
import { projects } from '@vc/core';
import type { Project } from '@vc/core';

export const projectActions = {
  list(): ActionResult<Project[]> {
    try {
      const { db } = getContext();
      const rows = db.select().from(projects).all() as Project[];
      return { ok: true, data: rows };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  create(name: string, description?: string): ActionResult<Project> {
    try {
      const { db } = getContext();
      const id = `proj-${Date.now()}`;
      const now = new Date();
      db.insert(projects).values({ id, name, description, status: 'active', createdAt: now }).run();
      const created = db.select().from(projects).all().find((p: any) => p.id === id) as Project;
      return { ok: true, data: created };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};
