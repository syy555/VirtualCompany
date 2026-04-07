# Virtual Company 🏢

AI Agent 驱动的虚拟软件公司平台。通过 CLI 管理一支 AI 员工团队，自动化完成软件开发全流程。

## 核心理念

- **角色是模板，员工是实例** — 同一角色可以有多个员工（如 3 个后端开发）
- **秘书是你的唯一对接人** — Owner 通过秘书 Agent 下达指令，秘书负责任务分发和员工考核
- **全自动流水线** — 从需求分析到部署上线，Pipeline 自动编排 Agent 协作
- **兼容多种 AI 工具** — Claude Code / Codex / OpenCode 均可驱动

---

## 环境要求

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | >= 18 | 推荐 20+ |
| pnpm | >= 8 | 包管理器，`npm i -g pnpm` |
| Git | >= 2.30 | 版本控制 |

AI 工具（至少安装一个）：

| 工具 | 安装方式 | 用途 |
|------|---------|------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `npm i -g @anthropic-ai/claude-code` | 主力 Agent 驱动工具 |
| [Codex](https://github.com/openai/codex) | `npm i -g @openai/codex` | OpenAI Agent 驱动 |
| [OpenCode](https://github.com/opencode-ai/opencode) | `go install github.com/opencode-ai/opencode@latest` | 开源替代方案 |

---

## API Key 配置

在 shell 配置文件（`~/.zshrc` / `~/.bashrc`）中设置环境变量：

```bash
# Anthropic（Claude Code 必需）
export ANTHROPIC_API_KEY="sk-ant-xxxxx"

# OpenAI（使用 Codex 时必需）
export OPENAI_API_KEY="sk-xxxxx"
```

每个角色的 `provider.yaml` 通过 `api_key_env` 字段指定读取哪个环境变量，你也可以自定义变量名。

---

## 安装与启动

```bash
# 1. 克隆项目
git clone https://github.com/syy555/VirtualCompany.git
cd VirtualCompany

# 2. 安装依赖
pnpm install

# 3. 构建
pnpm build

# 4. 全局链接 CLI（之后可在任意目录使用 vc 命令）
cd packages/cli && pnpm link --global
cd ../..

# 5. 验证安装
vc --help
```

---

## 快速开始

```bash
# 查看公司状态
vc status

# 招聘员工
vc hire secretary              # 招聘秘书（你的唯一对接人）
vc hire backend-dev --count 2  # 招聘 2 个后端开发
vc hire frontend-dev
vc hire qa-engineer
vc hire product-manager
vc hire lead-architect
vc hire devops

# 创建项目
vc init my-app

# 为项目生成 AI 指令文件（CLAUDE.md / AGENTS.md / OPENCODE.md）
vc sync my-app
vc sync my-app --employee backend-dev-001  # 指定员工视角

# 解雇员工（清除记忆，重新实例化）
vc fire backend-dev-002
```

---

## CLI 命令参考

| 命令 | 说明 | 示例 |
|------|------|------|
| `vc init <project>` | 创建新项目，生成项目目录和元数据 | `vc init my-app` |
| `vc sync <project>` | 生成 AI 指令文件到项目目录 | `vc sync my-app --employee backend-dev-001` |
| `vc status` | 查看公司状态（员工、项目、可用角色） | `vc status` |
| `vc hire <role>` | 招聘员工（从角色模板创建实例） | `vc hire backend-dev -c 2 -n "小明"` |
| `vc fire <id>` | 解雇员工（标记离职 + 清除记忆） | `vc fire backend-dev-002` |

---

## 模型配置

### 全局默认配置

编辑根目录 `config.yaml`：

```yaml
company:
  name: "Virtual Company"

defaults:
  provider: anthropic                  # AI 提供商
  model: claude-sonnet-4-20250514      # 默认模型
  api_key_env: ANTHROPIC_API_KEY       # API Key 环境变量名
  tool: claude-code                    # 默认使用的 AI 工具

review:
  cycle: weekly              # 考核周期
  thresholds:
    warning: 0.6             # 低于此分数发出警告
    replace: 0.4             # 低于此分数自动替换
  auto_replace: false        # 是否自动替换（需 Owner 确认）
```

### 角色级模型配置

每个角色目录下有 `provider.yaml`，可以为不同角色配置不同的模型。

`provider.yaml` 格式：

```yaml
# 默认模型配置
default:
  provider: anthropic
  model: claude-opus-4-20250514      # 该角色的默认模型
  api_key_env: ANTHROPIC_API_KEY

# 不同工具的模型覆盖
tools:
  claude-code:
    model: claude-sonnet-4-20250514  # 用 Claude Code 时使用的模型
  codex:
    provider: openai
    model: o3                        # 用 Codex 时使用的模型
    api_key_env: OPENAI_API_KEY
```

**配置优先级**：`角色 provider.yaml` > `全局 config.yaml defaults`

> 支持国产模型（MiniMax、阿里百炼、智谱、Kimi、DeepSeek、文心、豆包、混元）和 OpenRouter 聚合网关。
> 完整配置模板见 [docs/provider-templates.md](docs/provider-templates.md)。

### 当前角色默认模型

| 角色 | 默认模型 | 说明 |
|------|---------|------|
| secretary | claude-opus-4 | 需要更强的推理和协调能力 |
| lead-architect | claude-opus-4 | 架构决策需要深度思考 |
| backend-dev | claude-sonnet-4 | 日常编码，性价比优先 |
| frontend-dev | claude-sonnet-4 | 日常编码 |
| qa-engineer | claude-sonnet-4 | 测试编写 |
| product-manager | claude-sonnet-4 | 需求分析 |
| devops | claude-sonnet-4 | 运维脚本 |
| tech-writer | claude-sonnet-4 | 文档编写 |
| security-engineer | claude-sonnet-4 | 安全审计 |
| ops-agent | claude-sonnet-4 | 运营监控 |

你可以随时修改 `provider.yaml` 来切换模型，比如把所有角色都换成 Opus 或者换成 OpenAI 的模型。

---

## 角色配置

每个角色目录下有 `profile.yaml`，定义角色的职责和技能：

```yaml
name: 后端开发工程师
role: backend-dev
responsibilities:
  - 实现后端 API 和业务逻辑
  - 编写单元测试和集成测试
  - 数据库设计与优化
skills:
  - TypeScript / Node.js
  - RESTful API 设计
  - 数据库设计（SQL / NoSQL）
authority:
  can_approve: false    # 是否有审批权限
  can_assign: false     # 是否有分配任务权限
personality: 严谨务实，注重代码质量...
```

### 可用角色

| 角色 | 说明 | 审批权 | 分配权 |
|------|------|--------|--------|
| `secretary` | 秘书，Owner 的唯一对接人 | ✅ | ✅ |
| `product-manager` | 产品经理，需求分析 | ✅ | ✅ |
| `lead-architect` | 首席架构师，技术决策 | ✅ | ✅ |
| `backend-dev` | 后端开发 | ❌ | ❌ |
| `frontend-dev` | 前端开发 | ❌ | ❌ |
| `qa-engineer` | 测试工程师 | ❌ | ❌ |
| `devops` | 运维工程师 | ❌ | ❌ |
| `tech-writer` | 技术文档工程师 | ❌ | ❌ |
| `security-engineer` | 安全工程师 | ✅ | ❌ |
| `ops-agent` | 运营 Agent | ❌ | ❌ |

---

## 指令文件生成

`vc sync` 命令会根据 Handlebars 模板生成 AI 工具的指令文件，注入到项目目录中：

| 生成文件 | 对应工具 | 模板源 |
|---------|---------|------|
| `CLAUDE.md` | Claude Code | `company/templates/CLAUDE.md.hbs` |
| `AGENTS.md` | Codex | `company/templates/AGENTS.md.hbs` |
| `OPENCODE.md` | OpenCode | `company/templates/OPENCODE.md.hbs` |

生成的指令文件包含：
1. **员工身份** — 角色 profile（职责、技能、性格）
2. **公司规则** — `company/rules/*.md`（代码规范、Git 工作流、安全策略、沟通规范）
3. **公司知识库** — `company/knowledge/*.md`（技术栈、架构原则）
4. **项目规则** — `projects/<name>/.vc/project-rules.md`
5. **项目上下文** — `projects/<name>/.vc/context.md`（由 Agent 自动更新）
6. **当前任务** — `projects/<name>/.vc/tasks/`
7. **员工工作记忆** — `employees/<id>/memory/*.md`（可被清除）

你可以自定义模板内容，修改 `company/templates/` 下的 `.hbs` 文件即可。

---

## 自定义公司规则

编辑 `company/rules/` 下的 Markdown 文件，这些规则会被注入到所有 Agent 的指令文件中：

```
company/rules/
├── code-standards.md      # 编码规范（命名、函数大小、测试覆盖率）
├── git-workflow.md        # Git 工作流（分支策略、Commit 规范、PR 流程）
├── security-policy.md     # 安全策略（密钥管理、依赖扫描、OWASP）
└── communication.md       # 沟通规范（频道使用、日报、升级矩阵）
```

修改后运行 `vc sync <project>` 重新生成指令文件即可生效。

你也可以添加新的规则文件，只要放在 `company/rules/` 目录下即可自动被加载。

---

## 员工管理

### 员工生命周期

```
hire（招聘）→ active（在职）→ warning（警告）→ terminated（离职）
                                    ↓
                              fire（解雇）→ 清除记忆 → 可重新招聘同角色
```

### 员工实例目录

招聘员工后，会在 `employees/` 下创建实例目录：

```
employees/backend-dev-001/
├── instance.yaml          # 实例元数据（ID、角色、创建时间）
└── memory/                # 工作记忆（Markdown 文件）
    ├── project-notes.md   # Agent 自动记录的项目笔记
    └── decisions.md       # 重要决策记录
```

解雇员工（`vc fire`）会清除 `memory/` 目录，但保留实例记录。重新招聘同角色会创建新编号的实例。

---

## 流水线

每个流水线定义了一系列 stage，每个 stage 由指定角色的员工执行：

| 流水线 | 用途 | 阶段 |
|--------|------|------|
| `feature` | 新功能开发 | 需求分析 → 架构设计 → 实现(并行) → 质量检查(并行) → 文档 → 部署 |
| `bugfix` | Bug 修复 | 分析 → 修复 → 验证 → 部署 |
| `refactor` | 代码重构 | 分析 → 实现 → 评审 → 测试 |
| `launch` | 项目上线 | 上线评审 → 安全审计 → 部署 → 运维交接 |

流水线定义文件在 `pipelines/` 目录下，格式为 YAML。

---

## 组织架构

```
Owner (你)
  └── secretary-001 (秘书，你的唯一对接人)
        ├── product-manager-001
        ├── lead-architect-001
        ├── backend-dev-001
        ├── backend-dev-002
        ├── frontend-dev-001
        ├── qa-engineer-001
        ├── devops-001
        ├── tech-writer-001
        ├── security-engineer-001
        └── ops-agent-001
```

---

## 考核机制

秘书定期对员工进行考核，评分维度：

- 任务完成率
- 任务质量
- 响应速度
- 协作能力
- 记忆利用率

不合格员工将被替换（清除记忆，重新实例化同角色新员工）。考核阈值在 `config.yaml` 中配置。

---

## 项目结构

```
virtual-company/
├── config.yaml                 # 全局配置
├── company/
│   ├── rules/                  # 公司规则（注入所有 Agent）
│   ├── knowledge/              # 公司知识库
│   └── templates/              # 指令文件模板（Handlebars）
├── agents/                     # 角色定义（模板）
│   └── <role>/
│       ├── profile.yaml        # 角色描述、职责、技能
│       └── provider.yaml       # AI 模型配置
├── employees/                  # 员工实例（运行时生成）
│   └── <role>-<num>/
│       ├── instance.yaml
│       └── memory/
├── pipelines/                  # 流水线定义
├── projects/                   # 项目目录（运行时生成）
│   └── <project>/
│       ├── .vc/                # VC 元数据
│       ├── CLAUDE.md           # 生成的指令文件
│       ├── AGENTS.md
│       └── OPENCODE.md
├── packages/
│   ├── core/                   # 核心库（类型、DB、员工管理、模板渲染）
│   ├── cli/                    # CLI 工具（vc 命令）
│   ├── server/                 # API 服务器（Phase 2）
│   └── web/                    # Web Dashboard（Phase 2）
└── data/
    └── vc.db                   # SQLite 数据库（运行时生成）
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| Monorepo | Turborepo + pnpm |
| CLI | Commander + Chalk |
| 核心库 | TypeScript + Drizzle ORM |
| 数据库 | SQLite (better-sqlite3) |
| 模板 | Handlebars |
| 配置 | YAML |
| Server (Phase 2) | Fastify + WebSocket |
| Web (Phase 2) | Next.js + Tailwind + shadcn/ui |

---

## 开发路线

- [x] Phase 1: 核心骨架 — 类型、DB、员工管理、CLI、Pipeline 定义
- [ ] Phase 2: IM 系统 + Server — 消息持久化、WebSocket 实时通信、REST API
- [ ] Phase 3: Pipeline Engine — 自动编排 Agent 执行、状态追踪
- [ ] Phase 4: Web Dashboard — 进度看板、IM 聊天界面、Agent 管理
- [ ] Phase 5: 考核 + 运营 — 自动考核、员工替换、ops-agent 上线后运营

---

## License

MIT
