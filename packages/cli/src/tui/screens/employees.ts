import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { employeeActions } from '../../actions/employee.actions.js';
import { getContext } from '../../actions/context.js';

export async function employeesScreen() {
  while (true) {
    const action = await select({
      message: chalk.bold('👥 员工管理'),
      choices: [
        { name: '查看在职员工', value: 'list' },
        { name: '查看可用角色', value: 'roles' },
        { name: '招聘新员工', value: 'hire' },
        { name: '解雇员工', value: 'fire' },
        { name: '← 返回主菜单', value: 'back' },
      ],
    });

    if (action === 'back') break;

    if (action === 'list') {
      const r = employeeActions.list();
      if (!r.ok) { console.log(chalk.red(`错误：${r.error}`)); continue; }
      if (r.data.length === 0) {
        console.log(chalk.dim('  暂无在职员工\n'));
      } else {
        console.log('');
        for (const e of r.data) {
          const icon = e.status === 'active' ? '🟢' : e.status === 'warning' ? '🟡' : '🔴';
          console.log(`  ${icon} ${chalk.bold(e.id)}  ${e.name}  (${e.role})`);
        }
        console.log('');
      }
    }

    if (action === 'roles') {
      const r = employeeActions.listRoles();
      if (!r.ok) { console.log(chalk.red(`错误：${r.error}`)); continue; }
      console.log('\n  可用角色：' + r.data.join(', ') + '\n');
    }

    if (action === 'hire') {
      const roles = employeeActions.listRoles();
      if (!roles.ok) { console.log(chalk.red(`错误：${roles.error}`)); continue; }
      const role = await select({
        message: '选择角色',
        choices: roles.data.map(r => ({ name: r, value: r })),
      });
      const name = await input({ message: '员工姓名（留空自动生成）' });
      const r = employeeActions.hire(role, name || undefined);
      if (!r.ok) { console.log(chalk.red(`招聘失败：${r.error}\n`)); }
      else { console.log(chalk.green(`✓ 已招聘 ${r.data.name}（${r.data.id}）\n`)); }
    }

    if (action === 'fire') {
      const emps = employeeActions.list();
      if (!emps.ok || emps.data.length === 0) {
        console.log(chalk.dim('  暂无在职员工\n')); continue;
      }
      const empId = await select({
        message: '选择要解雇的员工',
        choices: emps.data.map(e => ({ name: `${e.id} — ${e.name}`, value: e.id })),
      });
      const ok = await confirm({ message: `确认解雇 ${empId}？`, default: false });
      if (!ok) { console.log(chalk.dim('  已取消\n')); continue; }
      const r = employeeActions.fire(empId);
      if (!r.ok) { console.log(chalk.red(`解雇失败：${r.error}\n`)); }
      else { console.log(chalk.yellow(`✓ 已解雇 ${r.data.id}\n`)); }
    }
  }
}
