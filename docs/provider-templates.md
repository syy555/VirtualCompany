# Provider 配置模板参考

本文档列出所有支持的 AI 模型提供商的 `provider.yaml` 配置模板。

将对应配置复制到 `agents/<role>/provider.yaml` 中使用。

---

## Anthropic（Claude）

```yaml
default:
  provider: anthropic
  model: claude-sonnet-4-20250514
  api_key_env: ANTHROPIC_API_KEY

tools:
  claude-code:
    model: claude-sonnet-4-20250514
  codex:
    provider: openai
    model: o3
    api_key_env: OPENAI_API_KEY
```

可用模型：
- `claude-opus-4-20250514` — 最强推理，适合架构师/秘书
- `claude-sonnet-4-20250514` — 均衡性价比，适合日常开发
- `claude-haiku-4-5-20251001` — 最快速度，适合简单任务

环境变量：
```bash
export ANTHROPIC_API_KEY="sk-ant-xxxxx"
```

---

## OpenAI

```yaml
default:
  provider: openai
  model: gpt-4o
  api_key_env: OPENAI_API_KEY

tools:
  claude-code:
    provider: anthropic
    model: claude-sonnet-4-20250514
    api_key_env: ANTHROPIC_API_KEY
  codex:
    model: o3
```

可用模型：
- `o3` — 最强推理
- `o4-mini` — 推理性价比
- `gpt-4o` — 均衡
- `gpt-4o-mini` — 快速

环境变量：
```bash
export OPENAI_API_KEY="sk-xxxxx"
```

---

## MiniMax（海螺 AI）

```yaml
default:
  provider: minimax
  model: MiniMax-Text-01
  api_key_env: MINIMAX_API_KEY
  base_url: https://api.minimax.chat/v1

tools:
  claude-code:
    provider: anthropic
    model: claude-sonnet-4-20250514
    api_key_env: ANTHROPIC_API_KEY
```

可用模型：
- `MiniMax-Text-01` — 主力文本模型（100 万 token 上下文）
- `MiniMax-M1` — 深度推理模型

环境变量：
```bash
export MINIMAX_API_KEY="eyJhbGciOixxxxx"
```

API 文档：https://platform.minimaxi.com/document/text

---

## 阿里百炼（通义千问）

```yaml
default:
  provider: dashscope
  model: qwen-max
  api_key_env: DASHSCOPE_API_KEY
  base_url: https://dashscope.aliyuncs.com/compatible-mode/v1

tools:
  claude-code:
    provider: anthropic
    model: claude-sonnet-4-20250514
    api_key_env: ANTHROPIC_API_KEY
```

可用模型：
- `qwen-max` — 最强能力（适合架构师/秘书）
- `qwen-plus` — 均衡性价比（适合日常开发）
- `qwen-turbo` — 最快速度（适合简单任务）
- `qwen-coder-plus` — 代码专用模型
- `qwen3-235b-a22b` — 开源最强

环境变量：
```bash
export DASHSCOPE_API_KEY="sk-xxxxx"
```

API 文档：https://help.aliyun.com/zh/model-studio/

---

## 智谱 AI（GLM）

```yaml
default:
  provider: zhipu
  model: glm-4-plus
  api_key_env: ZHIPU_API_KEY
  base_url: https://open.bigmodel.cn/api/paas/v4

tools:
  claude-code:
    provider: anthropic
    model: claude-sonnet-4-20250514
    api_key_env: ANTHROPIC_API_KEY
```

可用模型：
- `glm-4-plus` — 旗舰模型
- `glm-4-air` — 性价比
- `glm-4-flash` — 免费快速
- `codegeex-4` — 代码专用

环境变量：
```bash
export ZHIPU_API_KEY="xxxxx.xxxxx"
```

API 文档：https://open.bigmodel.cn/dev/api/

---

## 月之暗面（Kimi）

```yaml
default:
  provider: moonshot
  model: moonshot-v1-128k
  api_key_env: MOONSHOT_API_KEY
  base_url: https://api.moonshot.cn/v1

tools:
  claude-code:
    provider: anthropic
    model: claude-sonnet-4-20250514
    api_key_env: ANTHROPIC_API_KEY
```

可用模型：
- `moonshot-v1-128k` — 128K 上下文
- `moonshot-v1-32k` — 32K 上下文
- `moonshot-v1-8k` — 8K 上下文（最快）

环境变量：
```bash
export MOONSHOT_API_KEY="sk-xxxxx"
```

API 文档：https://platform.moonshot.cn/docs/

---

## 深度求索（DeepSeek）

```yaml
default:
  provider: deepseek
  model: deepseek-chat
  api_key_env: DEEPSEEK_API_KEY
  base_url: https://api.deepseek.com/v1

tools:
  claude-code:
    provider: anthropic
    model: claude-sonnet-4-20250514
    api_key_env: ANTHROPIC_API_KEY
```

可用模型：
- `deepseek-chat` — 通用对话（V3）
- `deepseek-reasoner` — 深度推理（R1）

环境变量：
```bash
export DEEPSEEK_API_KEY="sk-xxxxx"
```

API 文档：https://platform.deepseek.com/api-docs/

---

## 百度文心（千帆）

```yaml
default:
  provider: qianfan
  model: ernie-4.5-8k
  api_key_env: QIANFAN_API_KEY
  base_url: https://qianfan.baidubce.com/v2

tools:
  claude-code:
    provider: anthropic
    model: claude-sonnet-4-20250514
    api_key_env: ANTHROPIC_API_KEY
```

可用模型：
- `ernie-4.5-8k` — 旗舰模型
- `ernie-4.5-turbo-8k` — 快速版
- `ernie-x1-turbo-32k` — 深度推理

环境变量：
```bash
export QIANFAN_API_KEY="xxxxx"
```

API 文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/

---

## 字节豆包（火山引擎）

```yaml
default:
  provider: doubao
  model: doubao-1.5-pro-256k
  api_key_env: ARK_API_KEY
  base_url: https://ark.cn-beijing.volces.com/api/v3

tools:
  claude-code:
    provider: anthropic
    model: claude-sonnet-4-20250514
    api_key_env: ANTHROPIC_API_KEY
```

可用模型：
- `doubao-1.5-pro-256k` — 旗舰模型
- `doubao-1.5-lite-32k` — 轻量快速
- `doubao-1.5-thinking-pro-250k` — 深度推理

> 注意：豆包需要先在火山引擎控制台创建推理接入点（Endpoint），model 字段填接入点 ID。

环境变量：
```bash
export ARK_API_KEY="xxxxx"
```

API 文档：https://www.volcengine.com/docs/82379/

---

## 腾讯混元

```yaml
default:
  provider: hunyuan
  model: hunyuan-t1-latest
  api_key_env: HUNYUAN_API_KEY
  base_url: https://api.hunyuan.cloud.tencent.com/v1

tools:
  claude-code:
    provider: anthropic
    model: claude-sonnet-4-20250514
    api_key_env: ANTHROPIC_API_KEY
```

可用模型：
- `hunyuan-t1-latest` — 深度推理
- `hunyuan-turbos-latest` — 快速

环境变量：
```bash
export HUNYUAN_API_KEY="xxxxx"
```

API 文档：https://cloud.tencent.com/document/product/1729

---

## OpenRouter（聚合网关）

如果你想通过一个 API Key 访问多家模型，可以使用 OpenRouter：

```yaml
default:
  provider: openrouter
  model: anthropic/claude-sonnet-4
  api_key_env: OPENROUTER_API_KEY
  base_url: https://openrouter.ai/api/v1

tools:
  claude-code:
    model: anthropic/claude-sonnet-4
  codex:
    model: openai/o3
```

可用模型（示例）：
- `anthropic/claude-opus-4` / `anthropic/claude-sonnet-4`
- `openai/gpt-4o` / `openai/o3`
- `deepseek/deepseek-chat` / `deepseek/deepseek-reasoner`
- `google/gemini-2.5-pro`
- `qwen/qwen3-235b-a22b`

环境变量：
```bash
export OPENROUTER_API_KEY="sk-or-xxxxx"
```

API 文档：https://openrouter.ai/docs

---

## 混合配置示例

一个角色可以为不同工具配置不同提供商，实现最优组合：

```yaml
# 秘书：默认用国产模型省钱，Claude Code 用 Opus 保质量
default:
  provider: dashscope
  model: qwen-max
  api_key_env: DASHSCOPE_API_KEY
  base_url: https://dashscope.aliyuncs.com/compatible-mode/v1

tools:
  claude-code:
    provider: anthropic
    model: claude-opus-4-20250514
    api_key_env: ANTHROPIC_API_KEY
  codex:
    provider: deepseek
    model: deepseek-reasoner
    api_key_env: DEEPSEEK_API_KEY
    base_url: https://api.deepseek.com/v1
```

```yaml
# 后端开发：日常用 DeepSeek 省钱，复杂任务切 Claude
default:
  provider: deepseek
  model: deepseek-chat
  api_key_env: DEEPSEEK_API_KEY
  base_url: https://api.deepseek.com/v1

tools:
  claude-code:
    provider: anthropic
    model: claude-sonnet-4-20250514
    api_key_env: ANTHROPIC_API_KEY
```

---

## 环境变量汇总

根据你使用的提供商，在 `~/.zshrc` 或 `~/.bashrc` 中配置：

```bash
# --- 海外 ---
export ANTHROPIC_API_KEY="sk-ant-xxxxx"      # Anthropic (Claude)
export OPENAI_API_KEY="sk-xxxxx"             # OpenAI
export OPENROUTER_API_KEY="sk-or-xxxxx"      # OpenRouter

# --- 国产 ---
export MINIMAX_API_KEY="eyJhbGciOixxxxx"     # MiniMax
export DASHSCOPE_API_KEY="sk-xxxxx"          # 阿里百炼 (通义千问)
export ZHIPU_API_KEY="xxxxx.xxxxx"           # 智谱 AI (GLM)
export MOONSHOT_API_KEY="sk-xxxxx"           # 月之暗面 (Kimi)
export DEEPSEEK_API_KEY="sk-xxxxx"           # DeepSeek
export QIANFAN_API_KEY="xxxxx"               # 百度文心 (千帆)
export ARK_API_KEY="xxxxx"                   # 字节豆包 (火山引擎)
export HUNYUAN_API_KEY="xxxxx"               # 腾讯混元
```
