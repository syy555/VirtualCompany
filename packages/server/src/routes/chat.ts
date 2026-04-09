import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import type { FastifyPluginAsync } from 'fastify';

export const chatRoutes: FastifyPluginAsync = async (server) => {
  /**
   * POST /api/chat
   * Body: { message: string }
   *
   * Sends user message to the system channel, then forwards to secretary agent.
   * Returns the agent's response.
   */
  server.post('/', async (request, reply) => {
    const { message } = request.body as { message: string };
    if (!message?.trim()) return reply.status(400).send({ error: 'message is required' });

    const SYSTEM_CHANNEL = 'ch-system';

    // 1. Save user message to system channel
    server.imService.sendMessage(SYSTEM_CHANNEL, 'owner', message, 'text');

    // 2. Find active secretary
    const employees = server.employeeManager.listActive();
    const secretary = employees.find((e: any) => e.role === 'secretary' && e.status === 'active');

    if (!secretary) {
      const botReply = '当前没有在职的秘书，请先招聘一个秘书：`vc hire secretary`';
      server.imService.sendMessage(SYSTEM_CHANNEL, 'system', botReply, 'text');
      return { reply: botReply, from: 'system' };
    }

    // 3. Ensure _system project dir exists
    const systemProjectDir = resolve(server.rootDir, 'projects', '_system');
    if (!existsSync(systemProjectDir)) {
      mkdirSync(systemProjectDir, { recursive: true });
    }

    // 4. Execute via agent
    try {
      const result = await server.agentExecutor.execute({
        employeeId: secretary.id,
        projectId: '_system',
        instruction: message,
      });

      const agentReply = result.success
        ? (result.output || '任务已完成，但没有输出内容。')
        : `执行出错: ${result.error || '未知错误'}`;

      server.imService.sendMessage(SYSTEM_CHANNEL, secretary.id, agentReply, 'text');
      return { reply: agentReply, from: secretary.id };
    } catch (err: any) {
      const errorMsg = `执行失败: ${err.message}`;
      server.imService.sendMessage(SYSTEM_CHANNEL, 'system', errorMsg, 'text');
      return reply.status(500).send({ error: errorMsg });
    }
  });
};
