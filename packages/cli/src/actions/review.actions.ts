import { getContext, type ActionResult } from './context.js';
import type { ReviewResult } from '@vc/core';

export const reviewActions = {
  async run(period?: string): Promise<ActionResult<{ period: string; results: ReviewResult[] }>> {
    try {
      const { rs } = getContext();
      const results = await rs.runReviewCycle(period);
      const p = period ?? getCurrentPeriod();
      return { ok: true, data: { period: p, results } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  history(employeeId: string): ActionResult<any[]> {
    try {
      const { rs } = getContext();
      const records = rs.getEmployeeHistory(employeeId);
      return { ok: true, data: records };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  summary(period?: string): ActionResult<any> {
    try {
      const { rs } = getContext();
      const p = period ?? getCurrentPeriod();
      const data = rs.getPeriodSummary(p);
      return { ok: true, data };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
