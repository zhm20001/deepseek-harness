# DeepSeek Harness 源码学习计划

这是一份按依赖顺序排列的源码精读清单。节点是"必经系统"：读完前一组，后一组才有意义。每个节点四行——**源码**（读哪里）、**关键词**（要能定义）、**占位句**（读完自己填）、**检验**（怎么证明真读懂了）。

不安排时间，只安排顺序。逐节点的精读笔记开在 `NN-<node>.md`。

这条路线是 `MISSION.md` 的第二条线（读源码掌握 agent 架构），与「个人项目集成」那条并列，按原深度走完。讲法约定见 `MISSION.md` 的 Constraints：新文件先过语言层与术语共识（[00-vocabulary.md](00-vocabulary.md)），引用源码写「文件 X 第 N 行」，能实跑的先实跑（[demos.md](demos.md)）。

**当前进度**：节点 1 全部收尾（2026-09-27）——inject 对象形态、Config 校验链、类型声明合并已落盘进 [01-cordis-kernel.md](01-cordis-kernel.md)，两道自检题已给参考答案；[01-system-map.md](01-system-map.md) 重画全景图并新增三张时序图（生 / 营业 / 死与重生）。节点 2 机制已讲完并落盘（[02-loader.md](02-loader.md)）：patch 纯函数、`!!js` 插值与豁免、write-back、realm isolate、HMR 三分支，两段实跑见 [demos.md](demos.md)。节点 3 已按新讲法讲完（[03-scope.md](03-scope.md)）。节点 4 已按规约讲完（[主线课/04-session事件日志.md](主线课/04-session事件日志.md)）：append-only 流水账、模型可见 ⟺ 可重建、事件词表与 ignorable、版本迁移只加不改。节点 5 已按规约讲完（[主线课/05-agent事件域.md](主线课/05-agent事件域.md)）：事件三域、通知与闸门、三道闸（pre-step / request / turn-stopping）。节点 6 已按规约讲完（[主线课/06-agent-loop状态机.md](主线课/06-agent-loop状态机.md)）：turn/step、收件箱在日志里、请求从日志现算并冻结、取消与重试的落点。节点 7 已按规约讲完（[主线课/07-tools执行流水线.md](主线课/07-tools执行流水线.md)）：先记账再动手、三道工具闸、审批与单调门卫、结果先冻结再入档。节点 8 已按规约讲完（[主线课/08-prompt组装与上下文工程.md](主线课/08-prompt组装与上下文工程.md)）：段落拼装与中央排号、缓存前缀、空渲染清空一切、上下文工程走窄门。节点 9 已按规约讲完（[主线课/09-llm-adapter.md](主线课/09-llm-adapter.md)）：中立词表、adapter 只做翻译、prepareCall 票根、换厂商的契约清单。节点 10 已按规约讲完（[主线课/10-执行世界.md](主线课/10-执行世界.md)）：执行世界三件套、argv 先包装后执行、fs 意图闸、远程 = 整个世界换装。下一站：节点 11（委派与并行）。

**讲法约定（2026-09-29 起）**：课件分两层——**逻辑层**（概念、比喻、推论，是必记的全部）与**源码层**（文件行号，只是回溯地址）。规约全文、文档模板与生成流程见 **[主线课/00-课程规约.md](主线课/00-课程规约.md)**；统一课程文档收在 [主线课/](主线课/)（01–10，后续课程骨架见 [主线课/90-后续课程骨架.md](主线课/90-后续课程骨架.md)）。填空与自测默认可选，卡住时回溯本目录的原始精读版。

主线不变量（贯穿所有节点，读代码时拿它们当探针）：

1. 注册是 effect，卸载必须回卷。
2. 事件是扩展点，选域先于选包。
3. 模型可见 ⟺ 可从日志重建。
4. 换 provider 换整个世界，前提是 Definition 不含某个 Consumer 的私有物。
5. 强制要发生在做决定的那个操作里，schema 省略和门面包装不算强制。

## 流程图

```
[0 全景地图]
     ↓
框架层   [1 Cordis 内核] → [2 Loader 与声明式组合] → [3 Scope 与 capability seam]
              (DI/事件/生命周期)   (cordis.yml / patch / HMR)      (Definition-Provider-Consumer)
     ↓
循环层   [4 Session 事件日志] → [5 Agent 抽象与事件域] → [6 agent-loop 状态机]
              (上下文唯一真相源)         (live registry)          (turn / step)
                → [7 Tools 执行流水线] → [8 Prompt 组装与上下文工程] → [9 LLM adapter]
     ↓
能力层   [10 执行世界 fs/shell/subprocess/sandbox/terminal]   [11 委派与并行 subagent/jobs/workflow/PTC]
     ↓
外壳层   [12 boot → profile/bundle → headless/web/sdk/acp → host/client]
     ↓
输出层   [13 设计原则复盘 + 自己加一个 seam]
```

## 节点清单

### 0 全景地图
- [ ] 源码：`docs/architecture.md`、`packages/README.md`、`docs/module-graph.md`、`docs/capability-seams.md`
- [ ] 关键词：all-plugin、profile/bundle、capability seam、extension point
- [ ] 占位句：dsh 没有可打补丁的特权核心，因为 ____。
- [ ] 检验：`dsh --profile web --dump-config`，任选一行说出它由哪个 bundle 插入。

### 1 Cordis 内核
- [ ] 源码：`vendor/cosmokit/src/types.ts` → `vendor/schemastery/src/index.ts`（`Schema`/`validate`/`toJSON`）→ `vendor/cordis/src/context.ts`、`registry.ts`、`fiber.ts`、`events.ts`、`service.ts`、`reflect.ts`
- [ ] 关键词：Context 是服务仓库、`inject` 决定加载时机、Fiber 与 effect、五种 dispatch mode、`Service` 基类、`extend`/`isolate`/`intercept`
- [ ] 占位句：插件的启动顺序由 ____ 决定而不是手工序列；`ctx.tools` 能读到的前提是 ____；waterfall 监听器不调 `next()` 的效果是 ____。
- [ ] 检验：背出五种 dispatch 在"是否 await / 是否有返回值 / 何时停止"上的差异，并在 `events.ts:183-243` 指认每一段实现。
- [ ] 笔记：[01-cordis-kernel.md](01-cordis-kernel.md)

### 2 Loader 与声明式组合
- [ ] 源码：`vendor/loader/src/index.ts`、`config/entry.ts`+`tree.ts`+`group.ts`、`config/utils.ts`（`!!js` interpolate）、`vendor/include/src/index.ts`（`applyEntryPatches`）、`vendor/hmr/src/index.ts`
- [ ] 关键词：config row / entry、patch by id、有序层叠加、realm `isolate`、write-back
- [ ] 占位句：bundle 写入的东西仍可被上层改写，因为 ____；`!!js` 只允许出现在 ____ 字段。（参考答案见笔记）
- [ ] 检验：走完 `docs/cordis-tutorial/index.md`，然后写一个 patch 禁掉某个插件，再解释它为什么不需要改代码。
- [ ] 笔记：[02-loader.md](02-loader.md)；实跑见 [demos.md](demos.md) 第四、五节

### 3 Scope 与 capability seam
- [ ] 源码：`packages/core/scope/src/index.ts`、`store.ts`（`ScopedLayers`）、`vendor/cordis/src/context.ts` 的 `isolate/extend/intercept`；`docs/capability-seams.md`、`docs/glossary.md#capability-seam`
- [ ] 关键词：Service Definition / Provider / Consumer、per-agent 作用域注册
- [ ] 占位句：一个 seam 缺一角就不成其为 seam，最常缺的是 ____。
- [ ] 笔记：[03-scope.md](03-scope.md)（逻辑层讲法；占位句与自测可选）

### 4 Session 事件日志
- [ ] 源码：`packages/core/session/src/types.ts`（`SessionEventMap` :281、`SESSION_FORMAT_VERSION` :89）、`surface.ts`、`index.ts`（`append` :720、`deriveMessages` :842、`fork` :1237）、`invariant.ts`；`packages/session/session-persistence/src/index.ts`、`session-persistence-jsonl/src/storage.ts`、`session-persistence-jsonl/src/index.ts`（`appendLines` :1324）、`session-format/src/chain.ts`
- [ ] 关键词：append-only、sealed generation、相邻 `vN → vN+1` 迁移、projection seam、pure message projection
- [ ] 占位句："model-visible ⟺ logged" 由 ____ 强制；进程在 settlement 前硬挂会留下 ____。
- [ ] 检验：读 `packages/core/session/tests/session.spec.ts` + `packages/core/agent-loop/src/invariant.ts:40`，说出请求历史为何必然可重建。
- [ ] 笔记：[主线课/04-session事件日志.md](主线课/04-session事件日志.md)（逻辑层讲法；占位句与自测可选）

### 5 Agent 抽象与事件域
- [ ] 源码：`packages/core/agent/src/types.ts`、`dispatch.ts`（`agentEvents` :107、`agentCarrier` :94）、`index.ts`（`AgentRegistry` :245、initiator stack）；`docs/event-producer-consumer.md`、`docs/agent-lifecycle.md`
- [ ] 关键词：三个事件域（session / agent / capability）、`agent/created` 串行初始化与回滚、initiator scope
- [ ] 占位句：观察在飞的工作用 ____ 事件，需要跨重载存活的事实用 ____ 事件。
- [ ] 检验：画出 `agent/pre-step`、`agent/request`、`agent/turn-stopping` 各自的 mode、返回值与"谁能否决"。
- [ ] 笔记：[主线课/05-agent事件域.md](主线课/05-agent事件域.md)（逻辑层讲法；占位句与自测可选）

### 6 agent-loop 状态机
- [ ] 源码：`packages/core/agent-loop/src/index.ts`（`AgentLoop` :330、`raceAbort` :151）、`agent.ts`（`Phase` :41、`wakeDriver` :213、`turn` :295、`preStep` :266、`step` :380、`cancel` :174、`prepareRequest` :529、`buildRequest` :581、冻结 :631）、`inbox.ts`（`claim` :109）、`tool-calls.ts`（`executeToolCalls` :60）、`assistant-stream.ts`、`runtime-context.ts`；对照 `docs/architecture.md` 的 turn flow
- [ ] 关键词：step vs turn、claim、`startsRequestSeries`、`prepareCall` 与提交时机、retry via `agent/request-error`、cancellation cause
- [ ] 占位句：取消发生在 `prepareCall` 之后、提交之前时，日志里 ____；重试不重跑 ____。
- [ ] 检验：`pnpm run test:snapshot -- -t <case>` 挑一条回放，把每个 durable 事件名对回 `agent.ts` 的行号。
- [ ] 笔记：[主线课/06-agent-loop状态机.md](主线课/06-agent-loop状态机.md)（逻辑层讲法；占位句与自测可选）

### 7 Tools 注册与执行流水线
- [ ] 源码：`packages/core/tools/src/index.ts`（`ToolRuntime` :806、`PreToolDecision` :606、scheduler :465、`ToolGuard` :730）、`schema.ts`、`json-schema.ts`、`presentation.ts`、`ptc.ts`；`docs/tool-execution-pipeline.md`、`docs/cookbook/adding-a-tool.md`；`packages/guard/*`、`packages/interaction/user-approval/src/index.ts`
- [ ] 关键词：`tools/pre-execute → execute → post-execute`、schema 进 prompt assembly、UI presentation 前置设计、审批属于 Consumer
- [ ] 占位句：一次拒绝必须在 ____ 生效，因为 schema 省略不算强制。
- [ ] 检验：在 `packages/core/tools/tests/` 找到一条真实拒绝路径，说出它绕过了哪些层。
- [ ] 笔记：[主线课/07-tools执行流水线.md](主线课/07-tools执行流水线.md)（逻辑层讲法；占位句与自测可选）

### 8 Prompt 组装与上下文工程
- [ ] 源码：`packages/core/system-prompt/src/index.ts`（`SECTION_ORDERS` :162、`renderPrompt` :279）、`packages/context/*`（`agent-instructions`、`time-context`、`file-reference`、`session-reference`）、`packages/compaction/*`、`packages/spill/*`、`packages/attachment/*`
- [ ] 关键词：section order、system node 与 cached prefix、`agent.inject()`、`request/context`、offload/compaction 触发新 request series
- [ ] 占位句：空 prompt 渲染会清掉所有 active system node，因此模型看到的旧 prompt 是 ____。
- [ ] 检验：对照 `packages/core/agent-loop/README.md#understand-the-implementation`，说出无 cache 能力的路由为何要在首个 system node 合并 prompt 文本。
- [ ] 笔记：[主线课/08-prompt组装与上下文工程.md](主线课/08-prompt组装与上下文工程.md)（逻辑层讲法；占位句与自测可选）

### 9 LLM adapter seam
- [ ] 源码：`packages/llm/llm/src/index.ts`、`types.ts`；`packages/llm/llm-deepseek/src/adapter.ts`（对照 `llm-pi-ai/src/adapter.ts`）；`docs/subsystems/llm-streaming.md`、`docs/cookbook/adding-an-llm-adapter.md`、`docs/subsystems/token-meter.md`
- [ ] 关键词：消息与流词表、`prepareCall` capability、token/KV-cache 计费
- [ ] 占位句：换 provider 不改 loop，前提是 provider 满足 ____。
- [ ] 检验：读一个 provider 的 e2e 断言（`pnpm run test:e2e` 无 key 自跳过），说出它测的是词表还是 adapter 行为。
- [ ] 笔记：[主线课/09-llm-adapter.md](主线课/09-llm-adapter.md)（逻辑层讲法；占位句与自测可选）

### 10 执行世界
- [ ] 源码：`packages/fs/fs/src/index.ts`+`fs-local`+`tool-fs`；`packages/subprocess/subprocess/src/index.ts`+`subprocess-local/spawn.ts`；`packages/shell/shell`+`bash-local`+`tool-bash`；`packages/terminal/*`；`packages/sandbox/sandbox/src/index.ts`+`sandbox-policy`+`sandbox-local`；`packages/ssh/*`
- [ ] 关键词：共享 execution world、wrap argv 后 spawn、bwrap/Landlock/Seatbelt、fs+subprocess+sandbox 三件套配对
- [ ] 占位句：指向远程 sandbox 时 Bash/PTY/LSP 一起搬走且无需 provider 分叉，因为 ____。
- [ ] 检验：列出一个读文件调用从工具入参到落盘经过哪几个 seam，标出策略在哪一步。
- [ ] 笔记：[主线课/10-执行世界.md](主线课/10-执行世界.md)（逻辑层讲法；占位句与自测可选）

### 11 委派、并行与长任务
- [ ] 源码：`packages/subagent/subagent/src/index.ts`（+`internal.ts`）、`subagent-fork-in-process`、`tool-subagent*`；`docs/subsystems/agent-team.md`（roster / task board / mailbox）；`packages/jobs/*`、`packages/workflow/*`、`packages/core/tools/src/ptc.ts`、`packages/skill/*`、`packages/mcp/mcp-client/src/index.ts`
- [ ] 关键词：同一接口下的极端 provider 差异、continuable subagent、background job、skill 目录 vs loader
- [ ] 占位句：subagent 与 agent-team 的区别在于后者额外提供 ____。
- [ ] 检验：说出 `subagent-fork-in-process` 复用了节点 3 的哪个机制来隔离作用域。

### 12 应用外壳与传输面
- [ ] 源码：`apps/cli/src/bin.ts`、`args.ts`、`profile-boot.ts`；`packages/boot/app-boot/src/profile.ts`（`resolveProfileDir` :146、`bundlePatchPaths` :71、`composeEntries` :710）、`app-boot/src/index.ts`（overlay 顺序、`ConfigDumpLayer`）、`boot/plugin-manager/src/patch.ts`；`packages/bundle/base/cordis.patch.yml` 与四个 app bundle；`packages/sdk/*`、`packages/acp/*`、`packages/host/*`、`packages/client/*`、`packages/session-query/*`
- [ ] 关键词：层顺序（bundle → profile patch → home patch → `--patch`）、application launch 白名单、从 `session/event` 渲染
- [ ] 占位句：SDK 只能选 profile 而不能自带一棵 Cordis 树，理由是 ____。
- [ ] 检验：`dsh --profile headless --dump-config` 对比 `web`，说出三处差异各归属哪个 bundle。

### 13 复盘与动手
- [ ] 源码：`AGENTS.md` 的 Conventions、`docs/defensive-patterns.md`、`docs/glossary.md`；Agent Notes 四篇：`.agents/notes/implemented/architecture/2026-06-13-capability-seams.md`、`2026-08-19-session-projection-mandatory-seam.md`、`2026-09-01-v2-embedded-assistant-streams.md`、`2026-09-02-system-prompt-as-surface-node.md`
- [ ] 关键词：plugins not loop changes、explicit > implicit at boundaries、no hardcoded tunables、fail loud、branded ids
- [ ] 占位句：这套 harness 反复使用的三条"守住不变量"手法是 ____、____、____。
- [ ] 检验：照 `docs/cookbook/adding-a-package.md` 加一个最小 seam（Definition + Provider + 一个 tool），让 `pnpm run test:coverage` 与 `pnpm run doc-sync` 全绿。
