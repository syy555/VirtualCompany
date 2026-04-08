# 快速上手指南

从零开始，一步步把 Virtual Company 跑起来。

---

## 第一步：环境准备

确认以下工具已安装：

```bash
node -v   # >= 18，推荐 20+
pnpm -v   # >= 8，没有就运行：npm i -g pnpm
git -v
```

---

## 第二步：克隆并构建

```bash
git clone https://github.com/syy555/VirtualCompany.git
cd VirtualCompany

pnpm install   # 安装所有依赖
pnpm build     # 构建全部包（core / cli / server / web）
```

---

## 第三步：链接 CLI

```bash
cd packages/cli
pnpm link --global
cd ../..

# 验证
vc --help
```

成功后你会看到 `vc` 的命令列表。

---

## 第四步：配置 API Key

打开 `config.yaml`，确认 `defaults` 里的 provider 和模型：

```yaml
defaults:
  provider: anthropic
  model: claude-opus-4-20250514
  api_key_env: ANTHROPIC_API_KEY   # 读取这个环境变量
```

然后在终端设置对应的环境变量（写入 `~/.zshrc` 或 `~/.bashrc` 永久生效）：

```bash
# 使用 Anthropic（默认）
export ANTHROPIC_API_KEY="sk-ant-xxxxx"

# 或者换成其他兼容 OpenAI 协议的模型，修改 config.yaml 后设置对应 key：
# export OPENAI_API_KEY="sk-xxxxx"
# export DEEPSEEK_API_KEY="sk-xxxxx"
```

> 如果使用 Ollama 本地模型，设置 `provider: ollama`，`base_url: http://localhost:11434/v1`，`api_key_env` 随便填一个（值不重要）。

---

## 第五步：招聘员工

```bash
# 先招一个秘书——她是你和团队之间的唯一对接人
vc hire secretary

# 按需招聘其他角色
vc hire backend-dev
vc hire frontend-dev
vc hire qa-engineer

# 查看当前员工状态
vc status
```

可用角色：`secretary` `backend-dev` `frontend-dev` `qa-engineer` `product-manager` `lead-architect` `devops` `security-engineer` `tech-writer` `ops-agent`

---

## 第六步：创建第一个项目

```bash
vc init my-app

# 生成 AI 工具指令文件（CLAUDE.md / AGENTS.md / OPENCODE.md）
vc sync my-app
```

---

## 第七步：选择你的交互方式

### 方式 A — 对话式 REPL（推荐新手）

```bash
vc chat
```

启动后直接用中文下达指令：

```
你 > 查看所有员工
你 > 招聘一个后端工程师叫小明
你 > 启动 feature 流水线，项目 my-app，目标是实现用户登录
你 > 执行本周绩效考核
你 > exit
```

### 方式 B — 菜单式 TUI

```bash
vc ui
```

方向键选择菜单项，回车确认，支持员工管理、项目管理、流水线、绩效考核。

### 方式 C — 直接命令

```bash
vc status                          # 公司概览
vc hire backend-dev -n "小明"      # 招聘
vc fire backend-dev-002            # 解雇
```

---

## 第八步（可选）：启动 Web 看板

在两个终端分别运行：

```bash
# 终端 1：后端 API + WebSocket
cd packages/server && node dist/index.js

# 终端 2：前端看板
cd packages/web && pnpm start
```

浏览器打开 [http://localhost:3002](http://localhost:3002) 查看实时看板。

> 开发模式用 `pnpm dev`（根目录）同时启动所有服务并开启热重载。

---

## 常见问题

**`vc` 命令找不到**
```bash
# 重新 link
cd packages/cli && pnpm link --global
```

**修改源码后不生效**
```bash
pnpm build   # 在根目录重新构建
```

**API Key 报错**
- 确认环境变量已 `source ~/.zshrc`（或重开终端）
- 确认 `config.yaml` 里的 `api_key_env` 和你设置的变量名一致

**想换模型**

编辑 `config.yaml` 的 `defaults` 部分，支持任意 OpenAI 兼容接口：

```yaml
defaults:
  provider: deepseek
  model: deepseek-chat
  api_key_env: DEEPSEEK_API_KEY
  base_url: https://api.deepseek.com/v1
```

---

## 下一步

- 查看 [README.md](README.md) 了解完整功能和架构
- 在 `agents/<role>/profile.yaml` 自定义角色的职责和性格
- 在 `pipelines/` 目录编辑或新增流水线定义
