import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { createDb, EmployeeManager } from './index.js';
import { performanceReviews, employees, tasks, pipelineRuns, pipelineStages } from './schema.js';
import type { VCConfig, PerformanceScores, ReviewResult, EmployeeStatus } from './types.js';

type Db = ReturnType<typeof createDb>;

const SCORE_WEIGHTS = {
  task_completion_rate: 0.3,
  task_quality_score: 0.25,
  response_time: 0.15,
  collaboration_score: 0.15,
  memory_utilization: 0.15,
};

export class ReviewService {
  constructor(
    private db: Db,
    private employeeManager: EmployeeManager,
    private config: VCConfig,
  ) {}

  async runReviewCycle(period?: string): Promise<ReviewResult[]> {
    const activeEmployees = this.employeeManager.listActive();
    const results: ReviewResult[] = [];

    for (const employee of activeEmployees) {
      const scores = await this.calculateScores(employee.id, period);
      const total = this.calculateTotal(scores);
      const result = this.determineResult(total);

      await this.saveReview(employee.id, scores, total, result, period);

      if (result === 'warning') {
        this.db.update(employees).set({ status: 'warning' as EmployeeStatus }).where(eq(employees.id, employee.id)).run();
      } else if (result === 'replace') {
        if (this.config.review.auto_replace) {
          this.employeeManager.fire(employee.id);
        }
      } else {
        this.db.update(employees).set({ status: 'active' as EmployeeStatus }).where(eq(employees.id, employee.id)).run();
      }

      results.push(result);
    }

    return results;
  }

  private async calculateScores(employeeId: string, period?: string): Promise<PerformanceScores> {
    return {
      task_completion_rate: await this.calcTaskCompletionRate(employeeId, period),
      task_quality_score: await this.calcTaskQualityScore(employeeId, period),
      response_time: await this.calcResponseTime(employeeId, period),
      collaboration_score: await this.calcCollaborationScore(employeeId, period),
      memory_utilization: await this.calcMemoryUtilization(employeeId, period),
    };
  }

  private async calcTaskCompletionRate(employeeId: string, _period?: string): Promise<number> {
    const allTasks = this.db.select().from(tasks).where(eq(tasks.employeeId, employeeId)).all();
    if (allTasks.length === 0) return 0.5;

    const completed = allTasks.filter(t => t.status === 'done').length;
    return completed / allTasks.length;
  }

  private async calcTaskQualityScore(employeeId: string, _period?: string): Promise<number> {
    const stages = this.db.select().from(pipelineStages).where(eq(pipelineStages.employeeId, employeeId)).all();
    if (stages.length === 0) return 0.5;

    const completed = stages.filter(s => s.status === 'completed').length;
    const failed = stages.filter(s => s.status === 'failed').length;

    if (completed + failed === 0) return 0.5;
    return completed / (completed + failed);
  }

  private async calcResponseTime(employeeId: string, _period?: string): Promise<number> {
    const stages = this.db.select().from(pipelineStages).where(eq(pipelineStages.employeeId, employeeId)).all();
    const withTiming = stages.filter(s => s.startedAt && s.completedAt);
    if (withTiming.length === 0) return 0.5;

    const avgMs = withTiming.reduce((sum, s) => {
      return sum + (s.completedAt!.getTime() - s.startedAt!.getTime());
    }, 0) / withTiming.length;

    const avgMinutes = avgMs / (1000 * 60);
    if (avgMinutes <= 5) return 1.0;
    if (avgMinutes <= 15) return 0.8;
    if (avgMinutes <= 30) return 0.6;
    if (avgMinutes <= 60) return 0.4;
    return 0.2;
  }

  private async calcCollaborationScore(employeeId: string, _period?: string): Promise<number> {
    const stages = this.db.select().from(pipelineStages).where(eq(pipelineStages.employeeId, employeeId)).all();
    if (stages.length === 0) return 0.5;

    const withOutput = stages.filter(s => s.output && s.output.length > 0).length;
    return withOutput / stages.length;
  }

  private async calcMemoryUtilization(employeeId: string, _period?: string): Promise<number> {
    const memory = this.employeeManager.getMemory(employeeId);
    if (!memory || memory.length === 0) return 0.3;
    if (memory.length < 200) return 0.5;
    if (memory.length < 1000) return 0.7;
    return 1.0;
  }

  private calculateTotal(scores: PerformanceScores): number {
    return (
      scores.task_completion_rate * SCORE_WEIGHTS.task_completion_rate +
      scores.task_quality_score * SCORE_WEIGHTS.task_quality_score +
      scores.response_time * SCORE_WEIGHTS.response_time +
      scores.collaboration_score * SCORE_WEIGHTS.collaboration_score +
      scores.memory_utilization * SCORE_WEIGHTS.memory_utilization
    );
  }

  private determineResult(total: number): ReviewResult {
    const { thresholds } = this.config.review;
    if (total < thresholds.replace) return 'replace';
    if (total < thresholds.warning) return 'warning';
    return 'pass';
  }

  private async saveReview(
    employeeId: string,
    scores: PerformanceScores,
    total: number,
    result: ReviewResult,
    period?: string,
  ): Promise<string> {
    const id = `review-${nanoid(8)}`;
    const now = new Date();
    const reviewPeriod = period || this.getCurrentPeriod();

    this.db.insert(performanceReviews).values({
      id,
      employeeId,
      reviewerId: 'secretary',
      period: reviewPeriod,
      scores: JSON.stringify(scores),
      total,
      result,
      createdAt: now,
    }).run();

    return id;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getWeekNumber(now);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  getEmployeeHistory(employeeId: string, limit = 10) {
    const reviews = this.db.select().from(performanceReviews)
      .where(eq(performanceReviews.employeeId, employeeId))
      .orderBy(desc(performanceReviews.createdAt))
      .limit(limit)
      .all();

    return reviews.map(r => ({
      ...r,
      scores: JSON.parse(r.scores as string),
    }));
  }

  getPeriodSummary(period: string) {
    const reviews = this.db.select().from(performanceReviews)
      .where(eq(performanceReviews.period, period))
      .all();

    const parsed = reviews.map(r => ({ ...r, scores: JSON.parse(r.scores as string) }));
    const total = parsed.length;
    const pass = parsed.filter(r => r.result === 'pass').length;
    const warning = parsed.filter(r => r.result === 'warning').length;
    const replace = parsed.filter(r => r.result === 'replace').length;
    const avgScore = total > 0 ? parsed.reduce((sum, r) => sum + r.total, 0) / total : 0;

    return { period, total, pass, warning, replace, avgScore };
  }
}
