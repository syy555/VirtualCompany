#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { statusCommand } from './commands/status.js';
import { hireCommand } from './commands/hire.js';
import { fireCommand } from './commands/fire.js';

const program = new Command();

program
  .name('vc')
  .description('Virtual Company — AI Agent 虚拟公司管理工具')
  .version('0.1.0');

program
  .command('init <project>')
  .description('初始化一个新项目')
  .action(initCommand);

program
  .command('sync <project>')
  .description('为项目生成 AI 工具指令文件（CLAUDE.md / AGENTS.md / OPENCODE.md）')
  .option('--employee <id>', '指定员工 ID')
  .action(syncCommand);

program
  .command('status')
  .description('查看公司状态概览')
  .action(statusCommand);

program
  .command('hire <role>')
  .description('招聘新员工')
  .option('-n, --name <name>', '员工名称')
  .option('-c, --count <count>', '招聘人数', '1')
  .action(hireCommand);

program
  .command('fire <employeeId>')
  .description('解雇员工（清除记忆，终止实例）')
  .action(fireCommand);

program
  .command('chat')
  .description('启动对话式 REPL（自然语言交互，由 LLM 理解意图）')
  .action(async () => {
    const { startRepl } = await import('./chat/repl.js');
    await startRepl();
  });

program
  .command('ui')
  .description('启动菜单式 TUI（全屏终端界面，键盘导航）')
  .action(async () => {
    const { startTUI } = await import('./tui/app.js');
    await startTUI();
  });

program.parse();
