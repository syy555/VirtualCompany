import { getContext, type ActionResult } from './context.js';
import { pipelineRuns, PipelineLoader } from '@vc/core';
import type { PipelineRun } from '@vc/core';

export const pipelineActions = {
  listDefinitions(): ActionResult<{ name: string; description: string }[]> {
    try {
      const { root } = getContext();
      const loader = new PipelineLoader(root);
      const defs = loader.listAll();
      return { ok: true, data: defs.map((d: any) => ({ name: d.name, description: d.description })) };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  listRuns(): ActionResult<PipelineRun[]> {
    try {
      const { db } = getContext();
      const rows = db.select().from(pipelineRuns).all() as PipelineRun[];
      return { ok: true, data: rows };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  async start(type: string, projectId: string, goal: string): Promise<ActionResult<{ runId: string }>> {
    try {
      const { pe, root } = getContext();
      const loader = new PipelineLoader(root);
      const defs = loader.listAll();
      const def = defs.find((d: any) => d.name === type);
      if (!def) {
        const names = defs.map((d: any) => d.name).join(', ');
        return { ok: false, error: `流水线 "${type}" 不存在，可用：${names}` };
      }
      const runId = await pe.startRun(def, projectId, goal);
      return { ok: true, data: { runId } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  approve(runId: string): ActionResult<{ runId: string }> {
    try {
      const { pe } = getContext();
      pe.approveStage(runId);
      return { ok: true, data: { runId } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};
