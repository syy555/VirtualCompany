# Git 工作流规范

## 分支策略

- `main`：生产分支，始终保持可部署状态，禁止直接推送
- `develop`：开发主分支，所有功能分支从此拉出
- `feature/<issue-id>-<简述>`：功能开发分支
- `fix/<issue-id>-<简述>`：Bug 修复分支
- `hotfix/<issue-id>-<简述>`：生产紧急修复，从 main 拉出
- `release/<version>`：发布准备分支

## 提交信息规范

采用 Conventional Commits 格式：

```
<type>(<scope>): <简要描述>

<详细说明（可选）>

<关联 Issue（可选）>
```

Type 类型：
- `feat`：新功能
- `fix`：Bug 修复
- `refactor`：重构（不改变功能）
- `docs`：文档变更
- `test`：测试相关
- `chore`：构建/工具变更
- `perf`：性能优化

规则：
- 描述使用中文，不超过 50 字
- 必须关联 Issue 编号
- 每个 commit 只做一件事，禁止混合提交

## Pull Request 流程

1. 从 `develop` 创建功能分支
2. 本地开发并通过所有测试
3. 推送分支并创建 PR，填写模板
4. CI 自动运行检查（lint、test、build）
5. 指定 Reviewer 进行 Code Review
6. 所有检查通过 + Review 批准后，使用 Squash Merge 合并
7. 合并后自动删除源分支

## 其他规则

- 禁止 force push 到 main 和 develop
- 功能分支生命周期不超过 3 天，超过需拆分
- 合并前必须 rebase 到最新的目标分支
- Release 分支只允许 bug fix 提交
