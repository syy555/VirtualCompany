import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import type { createDb, EmployeeManager } from './index.js';
import { pipelineRuns, pipelineStages } from './schema.js';
import type { PipelineDefinition, PipelineStageDefinition, PipelineStatus } from './types.js';
import type { AgentExecutionResult } from './agent-executor.js';

type Db = ReturnType<typeof createDb>;

export type AgentExecuteFn = (
  employeeId: string,
  projectId: string,
  instruction: string,
  input?: string,
) => Promise<AgentExecutionResult>;

interface PipelineEventPayload {
  runId: string;
  stageId?: string;
  stageName?: string;
  data?: Record<string, unknown>;
}

export class PipelineEngine {
  private runningPipelines: Map<string, boolean> = new Map();
  private approvalResolvers: Map<string, () => void> = new Map();
  private executeFn?: AgentExecuteFn;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;

  constructor(
    private db: Db,
    private employeeManager: EmployeeManager,
  ) {}

  setAgentExecutor(fn: AgentExecuteFn): void {
    this.executeFn = fn;
  }

  setMaxRetries(max: number): void {
    this.maxRetries = max;
  }

  on(event: string, listener: (payload: PipelineEventPayload) => void): void {
    // Simple event bus — stores listeners in a map
    if (!(this as any)._listeners) (this as any)._listeners = {};
    if (!(this as any)._listeners[event]) (this as any)._listeners[event] = [];
    (this as any)._listeners[event].push(listener);
  }

  private emit(event: string, payload: PipelineEventPayload): void {
    const listeners = ((this as any)._listeners?.[event] || []) as Array<(p: PipelineEventPayload) => void>;
    for (const fn of listeners) fn(payload);
  }

  async startRun(
    definition: PipelineDefinition,
    projectId: string,
    goal: string,
  ): Promise<string> {
    const runId = `run-${nanoid(8)}`;
    const now = new Date();

    this.db.insert(pipelineRuns).values({
      id: runId,
      type: definition.name,
      projectId,
      goal,
      status: 'running',
      startedAt: now,
    }).run();

    for (const stageDef of definition.stages) {
      this.createStages(runId, stageDef);
    }

    this.runningPipelines.set(runId, true);
    this.emit('pipeline_started', { runId });

    this.executePipeline(runId, definition).catch(err => {
      this.failPipeline(runId, err.message);
    });

    return runId;
  }

  private createStages(runId: string, stageDef: PipelineStageDefinition): void {
    if (stageDef.parallel && stageDef.tasks) {
      for (const task of stageDef.tasks) {
        const employee = this.employeeManager.findAvailable(task.agent);
        this.db.insert(pipelineStages).values({
          id: `stage-${nanoid(8)}`,
          runId,
          name: `${stageDef.name}-${task.agent}`,
          employeeId: employee?.id || null,
          status: 'pending',
          input: task.input || null,
          output: task.output || null,
        }).run();
      }
    } else {
      const agent = stageDef.agent || stageDef.tasks?.[0]?.agent;
      const employee = agent ? this.employeeManager.findAvailable(agent) : undefined;
      this.db.insert(pipelineStages).values({
        id: `stage-${nanoid(8)}`,
        runId,
        name: stageDef.name,
        employeeId: employee?.id || null,
        status: 'pending',
        input: stageDef.input || null,
        output: stageDef.output || null,
      }).run();
    }
  }

  private async executePipeline(runId: string, definition: PipelineDefinition): Promise<void> {
    const allStages = this.db.select().from(pipelineStages).where(eq(pipelineStages.runId, runId)).all();

    const groups = this.groupStages(allStages, definition.stages);

    for (const group of groups) {
      if (!this.runningPipelines.get(runId)) return;

      if (group.definition.requires_approval) {
        this.updateRunStatus(runId, 'paused');
        this.emit('approval_requested', { runId, stageName: group.definition.name });
        await this.waitForApproval(runId);
        if (!this.runningPipelines.get(runId)) return;
        this.updateRunStatus(runId, 'running');
      }

      if (group.definition.parallel) {
        await Promise.all(group.stages.map(s => this.executeStage(s)));
      } else {
        await this.executeStage(group.stages[0]);
      }
    }

    this.completePipeline(runId);
  }

  private groupStages(
    stages: typeof pipelineStages.$inferSelect[],
    definitions: PipelineStageDefinition[],
  ): { definition: PipelineStageDefinition; stages: typeof pipelineStages.$inferSelect[] }[] {
    const groups: { definition: PipelineStageDefinition; stages: typeof pipelineStages.$inferSelect[] }[] = [];
    let idx = 0;

    for (const def of definitions) {
      if (def.parallel && def.tasks) {
        const count = def.tasks.length;
        groups.push({ definition: def, stages: stages.slice(idx, idx + count) });
        idx += count;
      } else {
        groups.push({ definition: def, stages: [stages[idx]] });
        idx += 1;
      }
    }

    return groups;
  }

  private async executeStage(stage: typeof pipelineStages.$inferSelect): Promise<void> {
    const now = new Date();

    this.db.update(pipelineStages)
      .set({ status: 'running', startedAt: now })
      .where(eq(pipelineStages.id, stage.id))
      .run();

    this.emit('stage_started', { runId: stage.runId, stageId: stage.id, stageName: stage.name });

    try {
      if (this.executeFn && stage.employeeId) {
        const run = this.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, stage.runId)).all()[0];
        const attempts = this.retryAttempts.get(stage.id) || 0;
        const result = await this.executeFn(stage.employeeId, run.projectId, stage.name, stage.input || undefined);

        if (!result.success) {
          if (attempts < this.maxRetries) {
            this.retryAttempts.set(stage.id, attempts + 1);
            this.emit('stage_retry', { runId: stage.runId, stageId: stage.id, stageName: stage.name, data: { attempt: attempts + 1, maxRetries: this.maxRetries } });
            await new Promise(r => setTimeout(r, 1000 * (attempts + 1)));
            return this.executeStage(stage);
          }
          throw new Error(result.error || 'Agent execution failed');
        }

        this.retryAttempts.delete(stage.id);
        this.db.update(pipelineStages)
          .set({ status: 'completed', completedAt: new Date(), output: result.output || `Completed: ${stage.name}` })
          .where(eq(pipelineStages.id, stage.id))
          .run();
      } else {
        await this.simulateWork(stage);
        this.db.update(pipelineStages)
          .set({ status: 'completed', completedAt: new Date(), output: stage.output || `Completed: ${stage.name}` })
          .where(eq(pipelineStages.id, stage.id))
          .run();
      }

      this.emit('stage_completed', { runId: stage.runId, stageId: stage.id, stageName: stage.name });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const attempts = this.retryAttempts.get(stage.id) || 0;
      if (attempts < this.maxRetries) {
        this.retryAttempts.set(stage.id, attempts + 1);
        this.emit('stage_retry', { runId: stage.runId, stageId: stage.id, stageName: stage.name, data: { attempt: attempts + 1, maxRetries: this.maxRetries, error: message } });
        await new Promise(r => setTimeout(r, 1000 * (attempts + 1)));
        return this.executeStage(stage);
      }
      this.retryAttempts.delete(stage.id);
      this.db.update(pipelineStages)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(pipelineStages.id, stage.id))
        .run();

      this.emit('stage_failed', {
        runId: stage.runId,
        stageId: stage.id,
        stageName: stage.name,
        data: { error: message },
      });

      throw err;
    }
  }

  private simulateWork(_stage: typeof pipelineStages.$inferSelect): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  private waitForApproval(runId: string): Promise<void> {
    return new Promise<void>(resolve => {
      this.approvalResolvers.set(runId, resolve);
      const check = setInterval(() => {
        const run = this.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId)).all()[0];
        if (!run) { clearInterval(check); resolve(); return; }
        if (run.status !== 'paused') {
          clearInterval(check);
          this.approvalResolvers.delete(runId);
          resolve();
        }
      }, 1000);
    });
  }

  approveStage(runId: string): void {
    const run = this.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId)).all()[0];
    if (!run) throw new Error(`Pipeline run not found: ${runId}`);
    if (run.status !== 'paused') throw new Error(`Pipeline run not paused: ${runId}`);

    this.db.update(pipelineRuns)
      .set({ status: 'running' })
      .where(eq(pipelineRuns.id, runId))
      .run();

    const resolver = this.approvalResolvers.get(runId);
    if (resolver) {
      resolver();
      this.approvalResolvers.delete(runId);
    }
  }

  pauseRun(runId: string): void {
    this.runningPipelines.set(runId, false);
    this.updateRunStatus(runId, 'paused');
    this.emit('pipeline_paused', { runId });
  }

  cancelRun(runId: string): void {
    this.runningPipelines.set(runId, false);
    this.db.update(pipelineRuns)
      .set({ status: 'failed', completedAt: new Date() })
      .where(eq(pipelineRuns.id, runId))
      .run();
    this.emit('pipeline_failed', { runId });
  }

  private completePipeline(runId: string): void {
    this.runningPipelines.delete(runId);
    this.db.update(pipelineRuns)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(pipelineRuns.id, runId))
      .run();
    this.emit('pipeline_completed', { runId });
  }

  private failPipeline(runId: string, error: string): void {
    this.runningPipelines.delete(runId);
    this.db.update(pipelineRuns)
      .set({ status: 'failed', completedAt: new Date() })
      .where(eq(pipelineRuns.id, runId))
      .run();
    this.emit('pipeline_failed', { runId, data: { error } });
  }

  private updateRunStatus(runId: string, status: PipelineStatus): void {
    this.db.update(pipelineRuns)
      .set({ status })
      .where(eq(pipelineRuns.id, runId))
      .run();
  }

  getRunStatus(runId: string) {
    const run = this.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId)).all()[0];
    if (!run) return undefined;
    const stages = this.db.select().from(pipelineStages).where(eq(pipelineStages.runId, runId)).all();
    return { ...run, stages };
  }
}
