# Virtual Company 🏢

AI Agent 驱动的虚拟软件公司平台。通过 CLI 管理一支 AI 员工团队，自动化完成软件开发全流程。

## 核心理念

- **角色是模板，员工是实例** — 同一角色可以有多个员工（如 3 个后端开发）
- **秘书是你的唯一对接人** — Owner 通过秘书 Agent 下达指令，秘书负责任务分发和员工考核
- **全自动流水线** — 从需求分析到部署上线，Pipeline 自动编排 Agent 协作
- **兼容多种 AI 工具** — Claude Code / Codex / OpenCode 均可驱动

## 快速开始

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 链接 CLI
cd packages/cli && pnpm link --global

# 查看公司状态
vc status

# 招聘员工
vc hire secretary
vc hire backend-dev -c 2
vc hire frontend-dev
vc hire qa-engineer
vc hire product-manager
vc hire lead-architect
vc hire devops

# 创建项目
vc init my-app

# 为项目生成 AI 指令文件
vc sync my-app

# 解雇员工（清除记忆，重新实例化）
vc fire backend-dev-002
```

## 项目结构

```
virtual-company/
├── config.yaml                 # 全局配置
├── company/
│   ├── rules/                  # 公司规则（注入所有 Agent）
│   │   ├── code-standards.md
│   │   ├── git-workflow.md
│   │   ├── security-policy.md
│   │   └── communication.md
│   ├── knowledge/              # 公司知识库
│   │   ├── tech-stack.md
│   │   └── architecture-principles.md
│   └── templates/              # 指令文件模板（Handlebars）
│       ├── CLAUDE.md.hbs       # → Claude Code
│       ├── AGENTS.md.hbs       # → Codex / OpenClaw
│       └── OPENCODE.md.hbs     # → OpenCode
├── agents/                     # 角色定义（模板）
│   ├── secretary/
│   │   ├── profile.yaml        # 角色描述、职责、技能
│   │   └── provider.yaml       # AI 模型配置
│   ├── backend-dev/
│   ├── frontend-dev/
│   ├── qa-engineer/
│   ├── product-manager/
│   ├── lead-architect/
│   ├── devops/
│   ├── tech-writer/
│   ├── security-engineer/
│   └── ops-agent/
├── employees/                  # 员工实例（运行时生成）
│   └── backend-dev-001/
│       ├── instance.yaml
│       └── memory/             # 员工记忆（可被清除）
├── pipelines/                  # 流水线定义
│   ├── feature.yaml            # 新功能开发
│   ├── bugfix.yaml             # Bug 修复
│   ├── refactor.yaml           # 重构
│   └── launch.yaml             # 上线
├── projects/                   # 项目目录（运行时生成）
│   └── my-app/
│       ├── .vc/                # VC 元数据
│       │   ├── project-rules.md
│       │   ├── context.md
│       │   └── tasks/
│       ├── CLAUDE.md           # 生成的指令文件
│       ├── AGENTS.md
│       └── src/
├── packages/
│   ├── core/                   # 核心库（类型、DB、员工管理、模板渲染）
│   ├── cli/                    # CLI 工具（vc 命令）
│   ├── server/                 # API 服务器（Phase 2）
│   └── web/                    # Web Dashboard（Phase 2）
└── data/
    └── vc.db                   # SQLite 数据库（运行时生成）
```

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

## 流水线

每个流水线定义了一系列 stage，每个 stage 由指定角色的员工执行：

| 流水线 | 用途 | 阶段 |
|--------|------|------|
| `feature` | 新功能开发 | 需求分析 → 架构设计 → 实现(并行) → 质量检查(并行) → 文档 → 部署 |
| `bugfix` | Bug 修复 | 分析 → 修复 → 验证 → 部署 |
| `refactor` | 代码重构 | 分析 → 实现 → 评审 → 测试 |
| `launch` | 项目上线 | 上线评审 → 安全审计 → 部署 → 运维交接 |

## 考核机制

秘书定期对员工进行考核，评分维度：

- 任务完成率
- 任务质量
- 响应速度
- 协作能力
- 记忆利用率

不合格员工将被替换（清除记忆，重新实例化同角色新员工）。

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

## 开发路线

- [x] Phase 1: 核心骨架 — 类型、DB、员工管理、CLI、Pipeline 定义
- [ ] Phase 2: IM 系统 + Server — 消息持久化、WebSocket 实时通信、REST API
- [ ] Phase 3: Pipeline Engine — 自动编排 Agent 执行、状态追踪
- [ ] Phase 4: Web Dashboard — 进度看板、IM 聊天界面、Agent 管理
- [ ] Phase 5: 考核 + 运营 — 自动考核、员工替换、ops-agent 上线后运营

## License

MIT
