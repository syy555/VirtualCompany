import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { reviewActions } from '../../actions/review.actions.js';
import { employeeActions } from '../../actions/employee.actions.js';

export async function reviewsScreen() {
  while (true) {
    const action = await select({
      message: chalk.bold('📊 绩效考核'),
      choices: [
        { name: '执行本周绩效考核', value: 'run' },
        { name: '查看员工绩效历史', value: 'history' },
        { name: '查看周期汇总', value: 'summary' },
        { name: '← 返回主菜单', value: 'back' },
      ],
    });

    if (action === 'back') break;

    if (action === 'run') {
      const period = await input({ message: '考核周期（留空为当前周，格式 2026-W14）' });
      console.log(chalk.dim('  执行中...\n'));
      const r = await reviewActions.run(period.trim() || undefined);
      if (!r.ok) { console.log(chalk.red(`考核失败：${r.error}\n`)); continue; }
      const counts = r.data.results.reduce((acc: Record<string, number>, res: string) => {
        acc[res] = (acc[res] ?? 0) + 1; return acc;
      }, {});
      console.log(chalk.green(`✓ ${r.data.period} 考核完成`));
      for (const [k, v] of Object.entries(counts)) {
        const icon = k === 'pass' ? '🟢' : k === 'warning' ? '🟡' : '🔴';
        console.log(`  ${icon} ${k}: ${v} 人`);
      }
      console.log('');
    }

    if (action === 'history') {
      const emps = employeeActions.list();
      if (!emps.ok || emps.data.length === 0) {
        console.log(chalk.dim('  暂无在职员工\n')); continue;
      }
      const empId = await select({
        message: '选择员工',
        choices: emps.data.map(e => ({ name: `${e.id} — ${e.name}`, value: e.id })),
      });
      const r = reviewActions.history(empId);
      if (!r.ok) { console.log(chalk.red(`错误：${r.error}\n`)); continue; }
      if (r.data.length === 0) {
        console.log(chalk.dim(`  ${empId} 暂无绩效记录\n`)); continue;
      }
      console.log('');
      for (const rec of r.data) {
        const icon = rec.result === 'pass' ? '🟢' : rec.result === 'warning' ? '🟡' : '🔴';
        console.log(`  ${icon} ${rec.period}  总分 ${rec.total?.toFixed(2)}  [${rec.result}]`);
      }
      console.log('');
    }

    if (action === 'summary') {
      const period = await input({ message: '考核周期（留空为当前周）' });
      const r = reviewActions.summary(period.trim() || undefined);
      if (!r.ok) { console.log(chalk.red(`错误：${r.error}\n`)); continue; }
      const s = r.data;
      console.log(`\n  周期：${s.period}  共 ${s.total} 人  平均分 ${s.avgScore?.toFixed(2) ?? 'N/A'}\n`);
    }
  }
}
