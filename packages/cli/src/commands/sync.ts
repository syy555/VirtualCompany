import chalk from 'chalk';
import { createDb, EmployeeManager, TemplateRenderer } from '@vc/core';
import { getRoot, getDbPath } from '../utils.js';

export async function syncCommand(projectName: string, options: { employee?: string }) {
  const root = getRoot();
  const db = createDb(getDbPath(root));
  const employeeManager = new EmployeeManager(db, root);
  const renderer = new TemplateRenderer(root);

  if (options.employee) {
    // Sync for a specific employee
    renderer.sync(employeeManager, options.employee, projectName);
    console.log(chalk.green(`✓ 已为 ${options.employee} 生成指令文件`));
  } else {
    // Sync for all active employees
    const employees = employeeManager.listActive();
    if (employees.length === 0) {
      console.log(chalk.yellow('没有活跃员工。请先使用 vc hire <role> 招聘员工'));
      return;
    }
    // Use the first employee as default (typically secretary)
    const secretary = employees.find(e => e.role === 'secretary') || employees[0];
    renderer.sync(employeeManager, secretary.id, projectName);
    console.log(chalk.green(`✓ 已为项目 ${projectName} 生成指令文件（默认角色: ${secretary.role}）`));
  }

  console.log(`  生成文件: CLAUDE.md, AGENTS.md, OPENCODE.md`);
}
