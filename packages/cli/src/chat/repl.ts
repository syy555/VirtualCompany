import * as readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import type OpenAI from 'openai';
import { createLLMClient } from './llm-client.js';
import { TOOLS } from './tools.js';
import { executeTool } from './executor.js';
import { employeeActions } from '../actions/employee.actions.js';
import { projectActions } from '../actions/project.actions.js';
import { pipelineActions } from '../actions/pipeline.actions.js';
import { getContext } from '../actions/context.js';

const SYSTEM_PROMPT = `你是虚拟公司（Virtual Company）的 AI 管理助手。你帮助 Owner 通过自然语言管理公司的员工、项目、流水线和绩效考核。

你的职责：
- 理解 Owner 的意图，调用合适的工具执行操作
- 操作前如有必要可先查询当前状态
- 用简洁的中文回复，说明执行了什么操作和结果
- 如果操作有风险（如解雇员工），先确认再执行

可用工具覆盖：员工管理（招聘/解雇/查看）、项目管理（创建/查看）、流水线（启动/批准/查看）、绩效考核（执行/查看历史）。`;

export async function startRepl() {
  const { config } = getContext();

  console.log(chalk.bold.cyan('\n🏢 Virtual Company — 对话助手'));
  console.log(chalk.gray(`模型：${config.defaults.provider} / ${config.defaults.model}`));
  console.log(chalk.gray('输入 exit 或 quit 退出，Ctrl+C 强制退出\n'));

  // 打印初始状态摘要
  const emps = employeeActions.list();
  const projs = projectActions.list();
  const runs = pipelineActions.listRuns();
  const empCount = emps.ok ? emps.data.length : 0;
  const projCount = projs.ok ? projs.data.length : 0;
  const runCount = runs.ok ? runs.data.filter((r: any) => r.status === 'running').length : 0;
  console.log(chalk.dim(`当前状态：${empCount} 名员工 · ${projCount} 个项目 · ${runCount} 条流水线运行中\n`));

  const { client, model } = createLLMClient();
  const history: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('你 > '),
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    if (input === 'exit' || input === 'quit') {
      console.log(chalk.dim('\n再见！'));
      rl.close();
      process.exit(0);
    }

    history.push({ role: 'user', content: input });

    const spinner = ora({ text: '思考中...', color: 'cyan' }).start();

    try {
      // 支持多轮 tool_calls
      let continueLoop = true;
      while (continueLoop) {
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
          tools: TOOLS,
          tool_choice: 'auto',
        });

        const msg = response.choices[0].message;
        history.push(msg as OpenAI.Chat.ChatCompletionMessageParam);

        if (msg.tool_calls && msg.tool_calls.length > 0) {
          // 执行所有 tool calls
          const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];
          for (const tc of msg.tool_calls) {
            let args: Record<string, any> = {};
            try { args = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
            const result = await executeTool(tc.function.name, args);
            toolResults.push({ role: 'tool', tool_call_id: tc.id, content: result });
          }
          history.push(...toolResults);
          // 继续循环让 LLM 生成最终回复
        } else {
          // 没有 tool_calls，输出最终回复
          spinner.stop();
          const content = msg.content ?? '';
          console.log(chalk.cyan('\n助手 > ') + content + '\n');
          continueLoop = false;
        }
      }
    } catch (err: any) {
      spinner.stop();
      console.log(chalk.red(`\n错误：${err.message}\n`));
    }

    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}
