import chalk from 'chalk';
import { employeeActions } from '../actions/employee.actions.js';
import { projectActions } from '../actions/project.actions.js';
import { pipelineActions } from '../actions/pipeline.actions.js';
import { reviewActions } from '../actions/review.actions.js';

export async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case 'get_status': {
      const emps = employeeActions.list();
      const projs = projectActions.list();
      const runs = pipelineActions.listRuns();
      const empCount = emps.ok ? emps.data.length : 0;
      const projCount = projs.ok ? projs.data.length : 0;
      const runCount = runs.ok ? runs.data.filter((r: any) => r.status === 'running').length : 0;
      return `公司状态：${empCount} 名在职员工，${projCount} 个项目，${runCount} 条流水线运行中`;
    }

    case 'list_employees': {
      const r = employeeActions.list();
      if (!r.ok) return `错误：${r.error}`;
      if (r.data.length === 0) return '暂无在职员工';
      return r.data.map(e =>
        `• ${e.id} (${e.role}) — ${e.name} [${e.status}]`
      ).join('\n');
    }

    case 'list_roles': {
      const r = employeeActions.listRoles();
      if (!r.ok) return `错误：${r.error}`;
      return `可用角色：${r.data.join(', ')}`;
    }

    case 'hire_employee': {
      const r = employeeActions.hire(args.role, args.name);
      if (!r.ok) return `招聘失败：${r.error}`;
      return `已招聘 ${r.data.name}（${r.data.id}），角色：${r.data.role}`;
    }

    case 'fire_employee': {
      const r = employeeActions.fire(args.employee_id);
      if (!r.ok) return `解雇失败：${r.error}`;
      return `已解雇员工 ${r.data.id}`;
    }

    case 'list_projects': {
      const r = projectActions.list();
      if (!r.ok) return `错误：${r.error}`;
      if (r.data.length === 0) return '暂无项目';
      return r.data.map((p: any) =>
        `• ${p.id} — ${p.name} [${p.status}]`
      ).join('\n');
    }

    case 'create_project': {
      const r = projectActions.create(args.name, args.description);
      if (!r.ok) return `创建失败：${r.error}`;
      return `已创建项目 "${r.data.name}"（${r.data.id}）`;
    }

    case 'list_pipeline_definitions': {
      const r = pipelineActions.listDefinitions();
      if (!r.ok) return `错误：${r.error}`;
      if (r.data.length === 0) return '暂无流水线定义';
      return r.data.map((d: any) => `• ${d.name} — ${d.description}`).join('\n');
    }

    case 'list_pipeline_runs': {
      const r = pipelineActions.listRuns();
      if (!r.ok) return `错误：${r.error}`;
      if (r.data.length === 0) return '暂无流水线运行记录';
      return r.data.map((run: any) =>
        `• ${run.id} [${run.type}] ${run.status} — ${run.goal}`
      ).join('\n');
    }

    case 'start_pipeline': {
      const r = await pipelineActions.start(args.type, args.project_id, args.goal);
      if (!r.ok) return `启动失败：${r.error}`;
      return `已启动流水线，运行 ID：${r.data.runId}`;
    }

    case 'approve_pipeline': {
      const r = pipelineActions.approve(args.run_id);
      if (!r.ok) return `批准失败：${r.error}`;
      return `已批准流水线 ${r.data.runId} 的待审批阶段`;
    }

    case 'run_review': {
      const r = await reviewActions.run(args.period);
      if (!r.ok) return `考核失败：${r.error}`;
      const summary = r.data.results.reduce((acc: Record<string, number>, res: string) => {
        acc[res] = (acc[res] ?? 0) + 1;
        return acc;
      }, {});
      return `${r.data.period} 绩效考核完成：${JSON.stringify(summary)}`;
    }

    case 'get_employee_history': {
      const r = reviewActions.history(args.employee_id);
      if (!r.ok) return `错误：${r.error}`;
      if (r.data.length === 0) return `员工 ${args.employee_id} 暂无绩效记录`;
      return r.data.map((rec: any) =>
        `• ${rec.period} — 总分 ${rec.total?.toFixed(2)} [${rec.result}]`
      ).join('\n');
    }

    case 'get_review_summary': {
      const r = reviewActions.summary(args.period);
      if (!r.ok) return `错误：${r.error}`;
      const s = r.data;
      return `${s.period} 汇总：共 ${s.total} 人，平均分 ${s.avgScore?.toFixed(2)}`;
    }

    default:
      return `未知工具：${name}`;
  }
}
