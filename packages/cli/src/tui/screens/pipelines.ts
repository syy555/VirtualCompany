import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { pipelineActions } from '../../actions/pipeline.actions.js';
import { projectActions } from '../../actions/project.actions.js';

export async function pipelinesScreen() {
  while (true) {
    const action = await select({
      message: chalk.bold('🔄 流水线'),
      choices: [
        { name: '查看运行记录', value: 'list' },
        { name: '查看可用流水线类型', value: 'defs' },
        { name: '启动流水线', value: 'start' },
        { name: '批准等待中的阶段', value: 'approve' },
        { name: '← 返回主菜单', value: 'back' },
      ],
    });

    if (action === 'back') break;

    if (action === 'list') {
      const r = pipelineActions.listRuns();
      if (!r.ok) { console.log(chalk.red(`错误：${r.error}`)); continue; }
      if (r.data.length === 0) {
        console.log(chalk.dim('  暂无运行记录\n'));
      } else {
        console.log('');
        for (const run of r.data) {
          const icon = run.status === 'running' ? '🔵' : run.status === 'completed' ? '🟢' : run.status === 'failed' ? '🔴' : '⚪';
          console.log(`  ${icon} ${chalk.bold(run.id)}  [${run.type}]  ${run.status}`);
          console.log(`     目标：${run.goal}`);
        }
        console.log('');
      }
    }

    if (action === 'defs') {
      const r = pipelineActions.listDefinitions();
      if (!r.ok) { console.log(chalk.red(`错误：${r.error}`)); continue; }
      console.log('');
      for (const d of r.data) {
        console.log(`  • ${chalk.bold(d.name)} — ${d.description}`);
      }
      console.log('');
    }

    if (action === 'start') {
      const defs = pipelineActions.listDefinitions();
      if (!defs.ok || defs.data.length === 0) {
        console.log(chalk.dim('  暂无可用流水线\n')); continue;
      }
      const projs = projectActions.list();
      if (!projs.ok || projs.data.length === 0) {
        console.log(chalk.dim('  请先创建项目\n')); continue;
      }
      const type = await select({
        message: '选择流水线类型',
        choices: defs.data.map(d => ({ name: `${d.name} — ${d.description}`, value: d.name })),
      });
      const projectId = await select({
        message: '选择项目',
        choices: projs.data.map((p: any) => ({ name: `${p.id} — ${p.name}`, value: p.id })),
      });
      const goal = await input({ message: '本次目标描述' });
      if (!goal.trim()) { console.log(chalk.dim('  已取消\n')); continue; }
      const r = await pipelineActions.start(type, projectId, goal.trim());
      if (!r.ok) { console.log(chalk.red(`启动失败：${r.error}\n`)); }
      else { console.log(chalk.green(`✓ 已启动流水线，运行 ID：${r.data.runId}\n`)); }
    }

    if (action === 'approve') {
      const runs = pipelineActions.listRuns();
      if (!runs.ok) { console.log(chalk.red(`错误：${runs.error}`)); continue; }
      const paused = runs.data.filter((r: any) => r.status === 'paused');
      if (paused.length === 0) {
        console.log(chalk.dim('  暂无等待审批的流水线\n')); continue;
      }
      const runId = await select({
        message: '选择要批准的流水线',
        choices: paused.map((r: any) => ({ name: `${r.id} — ${r.goal}`, value: r.id })),
      });
      const r = pipelineActions.approve(runId);
      if (!r.ok) { console.log(chalk.red(`批准失败：${r.error}\n`)); }
      else { console.log(chalk.green(`✓ 已批准 ${r.data.runId}\n`)); }
    }
  }
}
