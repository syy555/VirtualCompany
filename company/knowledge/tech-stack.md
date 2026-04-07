# 默认技术栈

## 后端

- 主语言：TypeScript (Node.js) / Python
- API 框架：NestJS（TypeScript）/ FastAPI（Python）
- ORM：Prisma（TypeScript）/ SQLAlchemy（Python）
- 数据库：PostgreSQL（主库）、Redis（缓存/队列）
- 消息队列：RabbitMQ（常规场景）、Kafka（高吞吐场景）
- 搜索引擎：Elasticsearch（全文检索需求时引入）

## 前端

- 框架：React + Next.js
- 语言：TypeScript（严格模式）
- 状态管理：Zustand（轻量）/ TanStack Query（服务端状态）
- UI 组件库：Shadcn/UI + Tailwind CSS
- 表单处理：React Hook Form + Zod
- 测试：Vitest + Testing Library + Playwright（E2E）

## 基础设施

- 云平台：AWS 为主
- 容器化：Docker + Kubernetes
- CI/CD：GitHub Actions
- IaC：Terraform
- 监控：Prometheus + Grafana
- 日志：ELK Stack（Elasticsearch + Logstash + Kibana）
- APM：OpenTelemetry

## AI/ML

- 框架：LangChain / LlamaIndex
- 模型服务：自建推理服务优先，按需使用云端 API
- 向量数据库：Pgvector（轻量）/ Milvus（大规模）

## 选型原则

- 优先选择团队熟悉的技术，降低认知负担
- 新技术引入需经过技术委员会评审，提交 ADR（架构决策记录）
- 避免为了新而新，解决实际问题才是目标
- 同一层级只保留一个主选方案，减少技术碎片化
