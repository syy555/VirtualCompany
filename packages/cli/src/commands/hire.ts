import chalk from 'chalk';
import { createDb, EmployeeManager } from '@vc/core';
import { getRoot, getDbPath } from '../utils.js';

export async function hireCommand(role: string, options: { name?: string; count?: string }) {
  const root = getRoot();
  const db = createDb(getDbPath(root));
  const em = new EmployeeManager(db, root);

  const count = parseInt(options.count || '1');

  // Validate role exists
  const roles = em.listRoles();
  if (!roles.includes(role)) {
    console.log(chalk.red(`角色 "${role}" 不存在。可用角色: ${roles.join(', ')}`));
    return;
  }

  for (let i = 0; i < count; i++) {
    const employee = em.hire(role, options.name);
    console.log(chalk.green(`✓ 已招聘 ${employee.id} (${employee.name})`));
  }
}
