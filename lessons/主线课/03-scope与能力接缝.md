# 03 — Scope 与能力接缝：插件之间、agent 之间怎么不打架

> 本课回答两个"怎么不打架"：**插件和插件**之间怎么解耦（接缝），**agent 和 agent** 之间怎么隔离（Scope）。学完本课，你就有了读懂任何一个 dsh 插件的钥匙——从这里起，课程进入"读真实插件"。

## 逻辑层

### 一、接缝（capability seam）：插件之间怎么合作

**大白话**：插件之间不能互相 import（换了实现，所有用它的代码都得跟着改）。解决办法：它们在**一块有名字的接缝**上碰头。接缝上站着三种铺子：

| 角色 | 大白话 | 记一个例子（shell） |
|---|---|---|
| Service Definition | **定契约的**：这个名字承诺什么能力 | `dsh-shell`——"一个能执行 bash 的东西" |
| Service Provider | **给实现的**：真正干活的一种做法 | `bash-local`（本机跑）、`bash-sandbox`（沙箱里跑）、`pwsh-local` |
| Consumer | **只用不管的**：只认契约，不认实现 | `tool-bash`——暴露给模型的 bash 工具 |

**推论**：本地换沙箱换远程，工具一行不改。这是主线不变量"换 provider 换整个世界"的意思。dsh 里几十个 `ctx.xxx` 服务几乎每条都是接缝；全部接缝的清单在 `docs/capability-seams.md` 那张表里——想查"某个能力谁定的、几种实现、谁在用"，查表，不用读源码。

### 二、Scope：一个进程怎么同时跑多个 agent

**大白话**：整个 dsh 是一个进程、一块登记板，但可能同时跑好几个 agent，各有各的对话、工具、甚至模型。办法：给**每个 agent 单独发一套前台**（dsh 叫 `createScope`——每个 Scope 一个不透明 ID + 一套 ctx）。两条规则：

1. **登记算谁的，就随谁走**：通过某套前台登记的一切（工具、监听、子插件）都记在它名下（上一课的账本机制），agent 结束时一次收回。
2. **事件向上可见，不向下**：一个"总管"前台登记的监听，能听到它名下所有 agent 的事件（所以总管能同时观察多个 agent）；反过来，agent 之间互相听不见。方向只有向上。

**推论**：隔离不是复制整个系统，而是"每人一套前台、共用一块登记板"——这也是节点 1 的 extend / isolate / intercept 打包后的样子。

### 三、合在一起：三问检验法

接缝回答**插件之间**怎么解耦（靠契约三角色），Scope 回答 **agent 之间**怎么隔离（靠每人一套前台）。以后拿到任何插件，先问三个问题就能读懂一半：

**它 provide 什么？inject 什么？on 什么？**

**例子**：`tool-todo`（待办清单工具）——provide 无、inject `['tools', 'sessionProjections']`、on 无。它是个纯 Consumer：把一个工具挂上 `tools` 登记板、把清单状态记进会话投影，别的什么都不做。

## 记住什么 / 不用记什么

**记（4 个）**：接缝（seam）；三角色（Definition / Provider / Consumer）；Scope（每个 agent 一套前台）；事件向上可见。

**不用记**（卡住回溯）：`ScopedLayers` / `NamedEntries`（带撤销单的登记表）、`chainLayers` / `merge`（沿祖先链叠层，近者胜）、`scopeTarget`（按 Scope ID 路由事件的喇叭）、`bindScopeParent`（登记上下级关系，防环）——这些全是上面两条规则的具体实现。

## 源码层（回溯地址，不要求读）

| 想查什么 | 地址 |
|---|---|
| Scope 的发源 | `packages/core/scope/src/index.ts:137`（createScope：一个 fiber + 一套带 ID 的前台）；`store.ts`（按 ID 分层的登记表） |
| 接缝的官方定义 | `docs/glossary.md` 搜 "seam"；全量接缝清单 `docs/capability-seams.md`（表格三列即三角色） |
| 贯穿实例 | `packages/todo/tool-todo/src/index.ts:22-23`（inject 清单） |
| 时间视图（图） | `../01-system-map.md` 时序图二：一次被守卫拦下的工具调用（名单顺序与前台过滤）；全景图：一套前台怎么派生 |
| 原始精读版 | `lessons/03-scope.md`（同讲法首版） |

## 自测（可选）

任选 `docs/capability-seams.md` 表里一行（比如 `ctx.llm` 或 `ctx.fs`），用三问说出它的三角色各是哪些包。
