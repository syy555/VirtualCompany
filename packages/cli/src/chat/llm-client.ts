import OpenAI from 'openai';
import { getContext } from '../actions/context.js';

const BASE_URLS: Record<string, string> = {
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
  ollama: 'http://localhost:11434/v1',
  deepseek: 'https://api.deepseek.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
};

export function createLLMClient(): { client: OpenAI; model: string } {
  const { config } = getContext();
  const defaults = config.defaults;

  const apiKey = process.env[defaults.api_key_env] ?? 'no-key';
  const baseURL = (defaults as any).base_url ?? BASE_URLS[defaults.provider] ?? BASE_URLS.openai;

  const client = new OpenAI({ apiKey, baseURL });
  return { client, model: defaults.model };
}
