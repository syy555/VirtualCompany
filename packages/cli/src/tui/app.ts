import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { employeeActions } from '../actions/employee.actions.js';
import { projectActions } from '../actions/project.actions.js';
import { pipelineActions } from '../actions/pipeline.actions.js';
import { getContext } from '../actions/context.js';
import { employeesScreen } from './screens/employees.js';
import { projectsScreen } from './screens/projects.js';
import { pipelinesScreen } from './screens/pipelines.js';
import { reviewsScreen } from './screens/reviews.js';

export async function startTUI() {
  const { config } = getContext();

  console.log(chalk.bold.cyan('\n🏢 Virtual Company'));
  console.log(chalk.dim(`${config.company?.name ?? 'Virtual Company'}\n`));

  while (true) {
    // 状态摘要
    const emps = employeeActions.list();
    const projs = projectActions.list();
    const runs = pipelineActions.listRuns();
    const empCount = emps.ok ? emps.data.length : 0;
    const projCount = projs.ok ? projs.data.length : 0;
    const runCount = runs.ok ? runs.data.filter((r: any) => r.status === 'running').length : 0;
    console.log(chalk.dim(`员工 ${empCount} · 项目 ${projCount} · 流水线运行中 ${runCount}\n`));

    const choice = await select({
      message: '主菜单',
      choices: [
        { name: '👥  员工管理', value: 'employees' },
        { name: '📁  项目管理', value: 'projects' },
        { name: '🔄  流水线', value: 'pipelines' },
        { name: '📊  绩效考核', value: 'reviews' },
        { name: '❌  退出', value: 'exit' },
      ],
    });

    if (choice === 'exit') {
      console.log(chalk.dim('\n再见！\n'));
      process.exit(0);
    }

    console.log('');
    if (choice === 'employees') await employeesScreen();
    if (choice === 'projects') await projectsScreen();
    if (choice === 'pipelines') await pipelinesScreen();
    if (choice === 'reviews') await reviewsScreen();
    console.log('');
  }
}
