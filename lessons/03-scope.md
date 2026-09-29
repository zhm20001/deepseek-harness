# 节点 3 — Scope 与能力接缝（capability seam）

> 从这一课起改用两层讲法：**逻辑层**是你需要记住的全部；**源码层**只是回溯地址，卡住时再查。源码文件名和内部函数不属于必记内容。

## 逻辑层（要记住的只有两个概念）

### 一、接缝（capability seam）：插件之间怎么合作

问题：插件之间不能互相 import（换了实现就要改所有使用者的代码）。解决办法：它们在**一块有名字的接缝**上碰头，接缝上有三个角色：

| 角色 | 大白话 | 记一个例子（shell） |
|---|---|---|
| Service Definition | **定契约的**：这个名字 promise 什么能力 | `dsh-shell`——"一个能执行 bash 的东西" |
| Service Provider | **给实现的**：真正干活的一种做法 | `bash-local`（本机跑）、`bash-sandbox`（沙箱里跑）、`pwsh-local` |
| Consumer | **只用不管的**：只认契约，不认实现 | `tool-bash`——暴露给模型的 bash 工具 |

记住这串例子的推论就够了：**本地换沙箱换远程，工具一行不改**。这就是主线不变量"换 provider 换整个世界，前提是 Definition 不含某个 Consumer 的私有物"的意思。

一问验三角色（以后读任何插件，先问这三个问题）：它 provide 什么？它 inject 什么？它 on 什么？
例：`tool-todo`（待办清单工具）——provide 无、inject `['tools', 'sessionProjections']`、on 无。它是个纯 Consumer：把一个工具挂上 `tools` 登记板、把清单状态记进会话投影，别的什么都不做。三个问题问完，插件就读懂了一半。

### 二、Scope：一个进程怎么同时跑多个 agent

问题：整个 dsh 是一个进程、一块登记板，但可能同时跑好几个 agent，各有各的对话、工具、甚至各自的模型。怎么互不串线？

答案（全建立在节点 1 上，没有新机器）：给**每个 agent 单独发一套前台**（dsh 叫 `createScope`——每个 Scope 一个不透明 ID + 一套 ctx）。两条规则：

1. **登记算谁的，就随谁走**：通过某套前台登记的一切（工具、监听、子插件）都记在它名下——节点 1 的账本机制——agent 结束时一次 dispose 全部收回。
2. **事件向上可见，不向下**：一个"总管"前台登记的监听，能听到它名下所有 agent 的事件（所以总管能同时观察多个 agent）；反过来，agent 之间互相听不见。方向只有向上。

### 三、合在一起

接缝回答"**插件和插件之间**怎么解耦"，Scope 回答"**agent 和 agent 之间**怎么隔离"。前者靠契约（三角色），后者靠每人一套前台（节点 1 的 extend/isolate/intercept 打包）。dsh 里几十个 `ctx.xxx` 服务，几乎每个都是一条接缝；`docs/capability-seams.md` 那张大表就是全部接缝的清单——以后想知道"某个能力是谁定的、有几种实现、谁在用"，查那张表，不用读源码。

## 记住什么 / 不用记什么

**记（4 个词）**：接缝（seam）、三角色（Definition / Provider / Consumer）、Scope（每人一套前台）、事件向上可见。

**不用记**（卡住时回这里查）：`ScopedLayers` / `NamedEntries`（带撤销单的登记表）、`chainLayers` / `merge`（沿祖先链叠层，近者胜）、`scopeTarget`（按 Scope ID 路由事件的喇叭）、`bindScopeParent`（登记上下级关系，防环）。这些全是上面两条规则的具体实现。

## 源码层（回溯地址，不要求读）

- Scope 的发源：`packages/core/scope/src/index.ts`（`createScope` 在 ：137——一个 fiber + 一套带 ID 的 ctx）；`store.ts`（按 ID 分层的登记表）。
- 接缝的官方定义：`docs/glossary.md` 搜 "seam"；全量接缝清单：`docs/capability-seams.md`（那张表三列就是三角色）。
- 例子：`packages/todo/tool-todo/src/index.ts:22-23`（`inject = ['tools', 'sessionProjections']`）。

## 自测（可选，跳过不影响后续）

任选 `docs/capability-seams.md` 表里一行（比如 `ctx.llm` 或 `ctx.fs`），用三问答出它的三角色各是哪些包。
