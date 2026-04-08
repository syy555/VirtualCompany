import type OpenAI from 'openai';

export const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_status',
      description: '获取公司整体状态概览：员工数量、项目数量、流水线运行情况',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_employees',
      description: '列出所有在职员工',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_roles',
      description: '列出所有可招聘的角色',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hire_employee',
      description: '招聘一名新员工',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string', description: '角色名称，如 backend-dev、frontend-dev' },
          name: { type: 'string', description: '员工姓名（可选）' },
        },
        required: ['role'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fire_employee',
      description: '解雇一名员工',
      parameters: {
        type: 'object',
        properties: {
          employee_id: { type: 'string', description: '员工 ID，如 backend-dev-001' },
        },
        required: ['employee_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_projects',
      description: '列出所有项目',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: '创建一个新项目',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '项目名称' },
          description: { type: 'string', description: '项目描述（可选）' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pipeline_definitions',
      description: '列出所有可用的流水线类型',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pipeline_runs',
      description: '列出所有流水线运行记录',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_pipeline',
      description: '启动一条流水线',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: '流水线类型，如 feature、bugfix、refactor' },
          project_id: { type: 'string', description: '项目 ID' },
          goal: { type: 'string', description: '本次流水线的目标描述' },
        },
        required: ['type', 'project_id', 'goal'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'approve_pipeline',
      description: '批准一个等待审批的流水线阶段',
      parameters: {
        type: 'object',
        properties: {
          run_id: { type: 'string', description: '流水线运行 ID' },
        },
        required: ['run_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_review',
      description: '执行绩效考核',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: '考核周期，如 2026-W14（可选，默认当前周）' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_employee_history',
      description: '查看某员工的绩效历史',
      parameters: {
        type: 'object',
        properties: {
          employee_id: { type: 'string', description: '员工 ID' },
        },
        required: ['employee_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_review_summary',
      description: '获取某考核周期的汇总报告',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: '考核周期，如 2026-W14（可选，默认当前周）' },
        },
        required: [],
      },
    },
  },
];
