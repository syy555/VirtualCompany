import chalk from 'chalk';
import { createDb, EmployeeManager, projects } from '@vc/core';
import { getRoot, getDbPath } from '../utils.js';

export async function statusCommand() {
  const root = getRoot();
  const db = createDb(getDbPath(root));
  const em = new EmployeeManager(db, root);

  // Employees
  const activeEmployees = em.listActive();
  const roles = em.listRoles();

  console.log(chalk.bold('\n🏢 Virtual Company 状态\n'));

  // Employee summary
  console.log(chalk.bold('👥 员工'));
  if (activeEmployees.length === 0) {
    console.log('  (暂无员工，使用 vc hire <role> 招聘)');
  } else {
    for (const emp of activeEmployees) {
      const statusIcon = emp.status === 'active' ? '🟢' : emp.status === 'warning' ? '🟡' : '🔴';
      console.log(`  ${statusIcon} ${emp.id} (${emp.role})`);
    }
  }

  // Projects
  const allProjects = db.select().from(projects).all();
  console.log(chalk.bold('\n📁 项目'));
  if (allProjects.length === 0) {
    console.log('  (暂无项目，使用 vc init <name> 创建)');
  } else {
    for (const proj of allProjects) {
      console.log(`  📋 ${proj.name} [${proj.status}]`);
    }
  }

  // Available roles
  console.log(chalk.bold('\n🎭 可用角色'));
  console.log(`  ${roles.join(', ')}`);

  console.log('');
}
