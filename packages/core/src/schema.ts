import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// --- Employees ---

export const employees = sqliteTable('employees', {
  id: text('id').primaryKey(),                    // e.g. "backend-dev-001"
  role: text('role').notNull(),                   // e.g. "backend-dev"
  name: text('name').notNull(),                   // display name
  status: text('status', { enum: ['active', 'warning', 'terminated'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  terminatedAt: integer('terminated_at', { mode: 'timestamp' }),
});

// --- Projects ---

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active', 'paused', 'completed', 'archived'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// --- Tasks ---

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  employeeId: text('employee_id').references(() => employees.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['backlog', 'active', 'in_progress', 'review', 'done', 'blocked'] }).notNull().default('backlog'),
  pipelineStageId: text('pipeline_stage_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// --- Pipeline Runs ---

export const pipelineRuns = sqliteTable('pipeline_runs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),                   // pipeline name
  projectId: text('project_id').notNull().references(() => projects.id),
  goal: text('goal').notNull(),
  status: text('status', { enum: ['pending', 'running', 'paused', 'completed', 'failed'] }).notNull().default('pending'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// --- Pipeline Stages ---

export const pipelineStages = sqliteTable('pipeline_stages', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => pipelineRuns.id),
  name: text('name').notNull(),
  employeeId: text('employee_id').references(() => employees.id),
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed', 'skipped'] }).notNull().default('pending'),
  input: text('input'),
  output: text('output'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// --- IM Channels ---

export const channels = sqliteTable('channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['project', 'direct', 'company'] }).notNull(),
  projectId: text('project_id').references(() => projects.id),
  members: text('members').notNull(),             // JSON array of employee IDs
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// --- IM Messages ---

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id),
  senderId: text('sender_id').notNull(),          // employee ID or "owner"
  content: text('content').notNull(),
  type: text('type', { enum: ['text', 'task_update', 'code_review', 'approval_request', 'system'] }).notNull().default('text'),
  metadata: text('metadata'),                     // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// --- Performance Reviews ---

export const performanceReviews = sqliteTable('performance_reviews', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  reviewerId: text('reviewer_id').notNull(),      // usually secretary
  period: text('period').notNull(),               // e.g. "2026-W14"
  scores: text('scores').notNull(),               // JSON of PerformanceScores
  total: real('total').notNull(),
  result: text('result', { enum: ['pass', 'warning', 'replace'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
