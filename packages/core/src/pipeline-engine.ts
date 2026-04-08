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

type EventListener = (payload: PipelineEventPayload) => void;

export class PipelineEngine {
  private runningPipelines: Map<string, boolean> = new Map();
  private approvalResolvers: Map<string, { resolve: () => void; reject: (err: Error) => void; timer: ReturnType<typeof setInterval> }> = new Map();
  private listeners: Map<string, EventListener[]> = new Map();
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

  on(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(listener);
  }

  private emit(event: string, payload: PipelineEventPayload): void {
    const fns = this.listeners.get(event) || [];
    for (const fn of fns) fn(payload);
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
    if (!this.executeFn) throw new Error('Agent executor not set');
    if (!stage.employeeId) throw new Error(`No employee assigned to stage: ${stage.name}`);

    this.db.update(pipelineStages)
      .set({ status: 'running', startedAt: new Date() })
      .where(eq(pipelineStages.id, stage.id))
      .run();
    this.emit('stage_started', { runId: stage.runId, stageId: stage.id, stageName: stage.name });

    const stageKey = stage.id;
    const attempts = this.retryAttempts.get(stageKey) || 0;

    try {
      const employee = this.employeeManager.get(stage.employeeId);
      if (!employee) throw new Error(`Employee not found: ${stage.employeeId}`);

      const result = await this.executeFn(
        stage.employeeId,
        this.getProjectIdFromRun(stage.runId),
        stage.input || `Execute stage: ${stage.name}`,
        stage.output || undefined,
      );

      if (result.success) {
        this.db.update(pipelineStages)
          .set({ status: 'completed', output: result.output, completedAt: new Date() })
          .where(eq(pipelineStages.id, stage.id))
          .run();
        this.emit('stage_completed', { runId: stage.runId, stageId: stage.id, stageName: stage.name });
        this.retryAttempts.delete(stageKey);
      } else {
        throw new Error(result.error || 'Agent execution failed');
      }
    } catch (err: any) {
      if (attempts < this.maxRetries) {
        this.retryAttempts.set(stageKey, attempts + 1);
        this.emit('stage_retry', { runId: stage.runId, stageId: stage.id, stageName: stage.name, data: { attempt: attempts + 1, error: err.message } });
        return this.executeStage(stage);
      }

      this.db.update(pipelineStages)
        .set({ status: 'failed', completedAt: new Date() })
        .where(eq(pipelineStages.id, stage.id))
        .run();
      this.emit('stage_failed', { runId: stage.runId, stageId: stage.id, stageName: stage.name, data: { error: err.message } });
      this.retryAttempts.delete(stageKey);
      throw err;
    }
  }

  private getProjectIdFromRun(runId: string): string {
    const run = this.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId)).all()[0];
    if (!run) throw new Error(`Pipeline run not found: ${runId}`);
    return run.projectId;
  }

  private waitForApproval(runId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setInterval(() => {
        if (!this.runningPipelines.get(runId)) {
          clearInterval(timer);
          this.approvalResolvers.delete(runId);
          reject(new Error(`Pipeline ${runId} cancelled while waiting for approval`));
          return;
        }

        const run = this.db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId)).all()[0];
        if (run?.status === 'running') {
          clearInterval(timer);
          this.approvalResolvers.delete(runId);
          resolve();
        }
      }, 1000);

      this.approvalResolvers.set(runId, { resolve, reject, timer });
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

    const entry = this.approvalResolvers.get(runId);
    if (entry) {
      clearInterval(entry.timer);
      entry.resolve();
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

    // Clean up any pending approval
    const entry = this.approvalResolvers.get(runId);
    if (entry) {
      clearInterval(entry.timer);
      entry.reject(new Error('Pipeline cancelled'));
      this.approvalResolvers.delete(runId);
    }

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

    // Clean up any pending approval
    const entry = this.approvalResolvers.get(runId);
    if (entry) {
      clearInterval(entry.timer);
      this.approvalResolvers.delete(runId);
    }

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
