import { resolve } from 'path';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import chalk from 'chalk';
import { createDb, EmployeeManager } from '@vc/core';
import { getRoot, getDbPath } from '../utils.js';

export async function initCommand(projectName: string) {
  const root = getRoot();
  const projectDir = resolve(root, 'projects', projectName);

  if (existsSync(projectDir)) {
    console.log(chalk.yellow(`项目 ${projectName} 已存在`));
    return;
  }

  // Create project directory structure
  const dirs = [
    resolve(projectDir, '.vc', 'tasks', 'backlog'),
    resolve(projectDir, '.vc', 'tasks', 'active'),
    resolve(projectDir, '.vc', 'tasks', 'done'),
    resolve(projectDir, 'src'),
  ];
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }

  // Create default project rules
  writeFileSync(
    resolve(projectDir, '.vc', 'project-rules.md'),
    `# ${projectName} 项目规则\n\n> 在此添加项目特定的规则和约定\n`,
  );

  // Create project context
  writeFileSync(
    resolve(projectDir, '.vc', 'context.md'),
    `# ${projectName}\n\n> 项目上下文摘要（由 Agent 自动更新）\n`,
  );

  // Register project in DB
  const db = createDb(getDbPath(root));
  const { projects } = await import('@vc/core');

  db.insert(projects).values({
    id: projectName,
    name: projectName,
    status: 'active',
    createdAt: new Date(),
  }).run();

  // Create project channel in DB
  const { channels } = await import('@vc/core');
  db.insert(channels).values({
    id: `project-${projectName}`,
    name: `#${projectName}`,
    type: 'project',
    projectId: projectName,
    members: '[]',
    createdAt: new Date(),
  }).run();

  console.log(chalk.green(`✓ 项目 ${projectName} 已创建`));
  console.log(`  目录: ${projectDir}`);
  console.log(`  群聊: #${projectName}`);
  console.log(`\n  下一步: ${chalk.cyan(`vc sync ${projectName} --employee=<id>`)}`);
}
