import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import type { FastifyPluginAsync } from 'fastify';
import { channels } from '@vc/core';

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

  /**
   * POST /api/chat/:employeeId
   * Body: { message: string }
   *
   * Chat with a specific employee/agent. Creates a DM channel if needed.
   */
  server.post('/:employeeId', async (request, reply) => {
    const { employeeId } = request.params as { employeeId: string };
    const { message } = request.body as { message: string };
    if (!message?.trim()) return reply.status(400).send({ error: 'message is required' });

    const employee = server.employeeManager.get(employeeId);
    if (!employee) return reply.status(404).send({ error: 'Employee not found' });
    if (employee.status !== 'active') return reply.status(400).send({ error: '该员工已离职' });

    // DM channel id
    const channelId = `dm-${employeeId}`;

    // Ensure DM channel exists
    const existing = server.imService.getChannel(channelId);
    if (!existing) {
      server.db.insert(channels).values({
        id: channelId,
        name: `与 ${employee.name} 的对话`,
        type: 'dm' as any,
        projectId: null,
        members: JSON.stringify(['owner', employeeId]),
        createdAt: new Date(),
      }).run();
    }

    // Save user message
    server.imService.sendMessage(channelId, 'owner', message, 'text');

    // Ensure _system project dir exists
    const systemProjectDir = resolve(server.rootDir, 'projects', '_system');
    if (!existsSync(systemProjectDir)) {
      mkdirSync(systemProjectDir, { recursive: true });
    }

    try {
      const result = await server.agentExecutor.execute({
        employeeId,
        projectId: '_system',
        instruction: message,
      });

      const agentReply = result.success
        ? (result.output || '任务已完成，但没有输出内容。')
        : `执行出错: ${result.error || '未知错误'}`;

      server.imService.sendMessage(channelId, employeeId, agentReply, 'text');
      return { reply: agentReply, from: employeeId, channelId };
    } catch (err: any) {
      const errorMsg = `执行失败: ${err.message}`;
      server.imService.sendMessage(channelId, 'system', errorMsg, 'text');
      return reply.status(500).send({ error: errorMsg });
    }
  });
};
