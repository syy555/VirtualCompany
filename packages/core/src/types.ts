// ============================================================
// Virtual Company — Core Type Definitions
// ============================================================

// --- Agent Role (template) ---

export interface AgentProfile {
  name: string;
  role: string;
  responsibilities: string[];
  skills: string[];
  authority?: {
    can_approve?: string[];
    can_assign?: boolean;
  };
  personality: string;
}

// --- Provider ---

export interface ProviderConfig {
  provider: string;
  model: string;
  api_key_env: string;
}

export interface AgentProviderConfig {
  default: ProviderConfig;
  tools?: Record<string, Partial<ProviderConfig>>;
}

// --- Employee (instance of a role) ---

export type EmployeeStatus = 'active' | 'warning' | 'terminated';

export interface Employee {
  id: string;           // e.g. "backend-dev-001"
  role: string;         // e.g. "backend-dev"
  name: string;         // display name
  status: EmployeeStatus;
  createdAt: Date;
  terminatedAt?: Date;
}

// --- Project ---

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: Date;
}

// --- Task ---

export type TaskStatus = 'backlog' | 'active' | 'in_progress' | 'review' | 'done' | 'blocked';

export interface Task {
  id: string;
  projectId: string;
  employeeId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  pipelineStageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Pipeline ---

export type PipelineStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface PipelineStageDefinition {
  name: string;
  agent?: string;       // role name
  parallel?: boolean;
  tasks?: {
    agent: string;
    input?: string;
    output?: string;
  }[];
  input?: string;
  output?: string;
  requires_approval?: boolean;
}

export interface PipelineDefinition {
  name: string;
  description: string;
  stages: PipelineStageDefinition[];
}

export interface PipelineRun {
  id: string;
  type: string;         // pipeline name
  projectId: string;
  goal: string;
  status: PipelineStatus;
  startedAt: Date;
  completedAt?: Date;
}

export interface PipelineStage {
  id: string;
  runId: string;
  name: string;
  employeeId?: string;
  status: StageStatus;
  input?: string;
  output?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// --- IM / Messages ---

export type ChannelType = 'project' | 'direct' | 'company';
export type MessageType = 'text' | 'task_update' | 'code_review' | 'approval_request' | 'system';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  projectId?: string;
  members: string[];
  createdAt: Date;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;     // employee ID or "owner"
  content: string;
  type: MessageType;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// --- Performance Review ---

export type ReviewResult = 'pass' | 'warning' | 'replace';

export interface PerformanceScores {
  task_completion_rate: number;   // 0-1
  task_quality_score: number;     // 0-1
  response_time: number;          // 0-1
  collaboration_score: number;    // 0-1
  memory_utilization: number;     // 0-1
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;   // usually secretary
  period: string;       // e.g. "2026-W14"
  scores: PerformanceScores;
  total: number;        // weighted average
  result: ReviewResult;
  createdAt: Date;
}

// --- Config ---

export interface VCConfig {
  company: {
    name: string;
    description: string;
  };
  defaults: {
    provider: string;
    model: string;
    api_key_env: string;
    tool: string;
  };
  review: {
    cycle: string;
    thresholds: {
      warning: number;
      replace: number;
    };
    auto_replace: boolean;
  };
  server: {
    port: number;
    ws_port: number;
  };
  database: {
    path: string;
  };
}
