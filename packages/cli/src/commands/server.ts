import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, openSync } from 'fs';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { getRoot } from '../utils.js';

const SERVICES = ['server', 'web'] as const;
type Service = typeof SERVICES[number];

function pidDir(root: string) {
  const dir = resolve(root, '.vc');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function pidFile(root: string, svc: Service) {
  return resolve(pidDir(root), `${svc}.pid`);
}

function readPid(root: string, svc: Service): number | null {
  const f = pidFile(root, svc);
  if (!existsSync(f)) return null;
  const n = parseInt(readFileSync(f, 'utf-8').trim(), 10);
  return isNaN(n) ? null : n;
}

function isRunning(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function writePid(root: string, svc: Service, pid: number) {
  writeFileSync(pidFile(root, svc), String(pid));
}

function clearPid(root: string, svc: Service) {
  const f = pidFile(root, svc);
  if (existsSync(f)) rmSync(f);
}

function serviceConfig(root: string, svc: Service): { cwd: string; cmd: string; args: string[]; label: string; port: number } {
  if (svc === 'server') {
    return {
      cwd: resolve(root, 'packages/server'),
      cmd: 'node',
      args: ['dist/index.js'],
      label: 'API Server',
      port: 3000,
    };
  }
  return {
    cwd: resolve(root, 'packages/web'),
    cmd: 'node_modules/.bin/next',
    args: ['start'],
    label: 'Web 看板',
    port: 3002,
  };
}

function startService(root: string, svc: Service): boolean {
  const pid = readPid(root, svc);
  if (pid && isRunning(pid)) {
    console.log(chalk.yellow(`  ${svc} 已在运行中 (PID ${pid})`));
    return false;
  }

  const { cwd, cmd, args, label, port } = serviceConfig(root, svc);
  if (!existsSync(cwd)) {
    console.log(chalk.red(`  找不到目录: ${cwd}，请先运行 pnpm build`));
    return false;
  }

  const logFile = resolve(root, '.vc', `${svc}.log`);
  const out = openSync(logFile, 'a');
  const child = spawn(cmd, args, {
    cwd,
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env },
  });
  child.unref();
  writePid(root, svc, child.pid!);
  console.log(chalk.green(`  ✓ ${label} 已启动 (PID ${child.pid})  →  http://localhost:${port}`));
  console.log(chalk.dim(`    日志: ${logFile}`));
  return true;
}

function stopService(root: string, svc: Service): boolean {
  const pid = readPid(root, svc);
  if (!pid || !isRunning(pid)) {
    console.log(chalk.dim(`  ${svc} 未运行`));
    clearPid(root, svc);
    return false;
  }
  try {
    process.kill(pid, 'SIGTERM');
    clearPid(root, svc);
    const { label } = serviceConfig(root, svc);
    console.log(chalk.yellow(`  ✓ ${label} 已停止 (PID ${pid})`));
    return true;
  } catch (e: any) {
    console.log(chalk.red(`  停止 ${svc} 失败: ${e.message}`));
    return false;
  }
}

function statusService(root: string, svc: Service) {
  const pid = readPid(root, svc);
  const { label, port } = serviceConfig(root, svc);
  if (pid && isRunning(pid)) {
    console.log(chalk.green(`  ● ${label.padEnd(12)} 运行中  PID ${pid}  http://localhost:${port}`));
  } else {
    console.log(chalk.dim(`  ○ ${label.padEnd(12)} 未运行`));
    clearPid(root, svc);
  }
}

export async function serverCommand(action: string, options: { service?: string }) {
  const root = getRoot();
  const targets: Service[] = options.service
    ? ([options.service] as Service[]).filter(s => SERVICES.includes(s))
    : [...SERVICES];

  if (options.service && targets.length === 0) {
    console.log(chalk.red(`未知服务: ${options.service}，可用: ${SERVICES.join(', ')}`));
    return;
  }

  switch (action) {
    case 'start':
      console.log(chalk.bold('\n启动服务...\n'));
      for (const svc of targets) startService(root, svc);
      break;

    case 'stop':
      console.log(chalk.bold('\n停止服务...\n'));
      for (const svc of targets) stopService(root, svc);
      break;

    case 'restart':
      console.log(chalk.bold('\n重启服务...\n'));
      for (const svc of targets) stopService(root, svc);
      // 短暂等待进程退出
      await new Promise(r => setTimeout(r, 800));
      for (const svc of targets) startService(root, svc);
      break;

    case 'status':
      console.log(chalk.bold('\n服务状态:\n'));
      for (const svc of targets) statusService(root, svc);
      console.log('');
      break;

    case 'logs': {
      const svc = targets[0];
      const logFile = resolve(root, '.vc', `${svc}.log`);
      if (!existsSync(logFile)) {
        console.log(chalk.dim(`暂无日志: ${logFile}`));
        return;
      }
      // tail -f style: print last 50 lines then follow
      const { execSync } = await import('child_process');
      try {
        execSync(`tail -n 50 -f "${logFile}"`, { stdio: 'inherit' });
      } catch { /* Ctrl+C */ }
      break;
    }

    default:
      console.log(chalk.red(`未知操作: ${action}，可用: start | stop | restart | status | logs`));
  }
}
