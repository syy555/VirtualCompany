import chalk from 'chalk';
import { createDb, EmployeeManager } from '@vc/core';
import { getRoot, getDbPath } from '../utils.js';

export async function fireCommand(employeeId: string) {
  const root = getRoot();
  const db = createDb(getDbPath(root));
  const em = new EmployeeManager(db, root);

  const employee = em.get(employeeId);
  if (!employee) {
    console.log(chalk.red(`员工 "${employeeId}" 不存在`));
    return;
  }

  if (employee.status === 'terminated') {
    console.log(chalk.yellow(`员工 "${employeeId}" 已离职`));
    return;
  }

  em.fire(employeeId);
  console.log(chalk.red(`✗ 已解雇 ${employeeId}（记忆已清除）`));
}
