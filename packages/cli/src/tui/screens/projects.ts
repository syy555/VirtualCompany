import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { projectActions } from '../../actions/project.actions.js';

export async function projectsScreen() {
  while (true) {
    const action = await select({
      message: chalk.bold('📁 项目管理'),
      choices: [
        { name: '查看所有项目', value: 'list' },
        { name: '创建新项目', value: 'create' },
        { name: '← 返回主菜单', value: 'back' },
      ],
    });

    if (action === 'back') break;

    if (action === 'list') {
      const r = projectActions.list();
      if (!r.ok) { console.log(chalk.red(`错误：${r.error}`)); continue; }
      if (r.data.length === 0) {
        console.log(chalk.dim('  暂无项目\n'));
      } else {
        console.log('');
        for (const p of r.data) {
          const icon = p.status === 'active' ? '🟢' : p.status === 'paused' ? '🟡' : '⚪';
          console.log(`  ${icon} ${chalk.bold(p.id)}  ${p.name}  [${p.status}]`);
        }
        console.log('');
      }
    }

    if (action === 'create') {
      const name = await input({ message: '项目名称' });
      if (!name.trim()) { console.log(chalk.dim('  已取消\n')); continue; }
      const description = await input({ message: '项目描述（可选）' });
      const r = projectActions.create(name.trim(), description.trim() || undefined);
      if (!r.ok) { console.log(chalk.red(`创建失败：${r.error}\n`)); }
      else { console.log(chalk.green(`✓ 已创建项目 "${r.data.name}"（${r.data.id}）\n`)); }
    }
  }
}
