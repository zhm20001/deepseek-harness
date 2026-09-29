# 节点 1 — Cordis 内核

Cordis 一共 2696 行（`vendor/cordis/src/`，六个文件）。它是整个 harness 的地基：dsh 里每一个插件、每一处 `ctx.xxx`、每一个事件都走它。读完这一节点，节点 2/3/6 里的"魔法"就都变成普通代码。

## 一句话定义

一个**进程内的依赖注入容器 + 插件生命周期管理器 + 类型化事件总线**，三件套装在同一个 Proxy 对象里；服务按**字符串名**解析，生命周期按 **Fiber** 回卷，通信按**事件 mode** 分派。

## 课堂已建立的共识（2026-09-24）

语言层与四个术语的定义已单独落在 [00-vocabulary.md](00-vocabulary.md)，三段实跑证据在 [demos.md](demos.md)。此处只留因果主线，作为后面所有节点的公共底座。

1. 不能让插件互相 `import`（死链接），否则换实现要改所有使用者 →
2. 于是使用者只报**名字**，由 `ctx` 这个接待员在当下查登记板给答案 → 所以 `ctx` 必须是 Proxy（读格子时跑代码）→
3. 接待员必须**在被调用之前**就知道你要什么，才能决定"现在叫你"还是"再等" → 所以依赖要事先写进 `inject`，而不是跑到那行再说 →
4. 于是"加载顺序"这个概念消失，只剩"需求是否满足"：`PENDING`（不执行）↔ `ACTIVE`（执行），服务来了唤醒、走了退回、再回来**重跑代码体** →
5. 每一次登记（提供、监听、effect）都记在**这次装载**的账上，所以卸载是逆序收回而不是崩溃或修补 → 这本账就是 `Fiber` →
6. 要能力用**服务**（主动要），要插手用**事件**（被动被叫）；喊一声有五种规矩，由三问决定：等不等 / 要不要答案 / 谁能否决我。

三处已纠正的误解，留着防止复发：

- 卸载不由 `ctx` 发起。`ctx` 是板 + 接待员，全程被动；发起方是 fiber 的 `dispose`，被调用的是**登记那一刻存下的撤销函数**。
- 事件名单归 `EventsService` 所有（`_hooks`），fiber 只持有"我登记过哪些"的账。`Hook` 里存 `ctx` 是为了**过滤谁能听到**，不是把名单交给 fiber 管。
- `internal/config` 在 schema 校验**之前**，不是之后（`fiber.ts:641-643`：先 waterfall 再 validate）；FAILED 也不是盖上的章，是 `_error` 非空时读出的状态（`fiber.ts:576`）。

两道自检题的参考答案见下文〔自检题参考答案〕（2026-09-27）。

## 源码地图（按读的顺序）

| 顺序 | 文件 | 行数 | 这里定的是什么 |
|---|---|---|---|
| 1 | `vendor/cordis/src/context.ts` | 146 | `Context` 接口与构造：Proxy 化、四个内置服务、`extend` / `isolate` / `intercept` |
| 2 | `vendor/cordis/src/registry.ts` | 337 | 插件三形态与元数据（`name`/`Config`/`inject`/`provide`/`intercept`）、`ctx.plugin`、`ctx.inject`、`RegistryService` |
| 3 | `vendor/cordis/src/fiber.ts` | 754 | `FiberState` 六态、`ctx.effect`、disposer 收集与逆序回卷、`EffectMeta` 诊断树 |
| 4 | `vendor/cordis/src/events.ts` | 352 | `EventsService`、五种 dispatch 的实现、监听器按上下文过滤、`Events` 内置事件 |
| 5 | `vendor/cordis/src/reflect.ts` | 418 | Proxy get/set trap、`ctx.get`/`set`/`provide`/`accessor`/`mixin`、`internal/get` 兜底链 |
| 6 | `vendor/cordis/src/service.ts` | 115 | `Service` 基类：构造即注册、`[Service.check]` 可用性谓词、intercept 配置合并 |

`utils.ts`（287 行）是符号表和 `DisposableList`，遇到再查。

## 一次加载发生了什么

1. **拿到 ctx**：`new Context()`（`context.ts:71`）先建 isolate/intercept 两张原型链上的表，然后 `new Proxy(this, ReflectService.handler)` 并 `return self`——你手上的 `ctx` 从来不是普通对象。root fiber（`uid === 0`）建好后 `_disposables.clear()`（`:82`），四个内置服务挂它名下。
2. **提交插件**：`ctx.plugin(P, cfg)`（`registry.ts:316`）把插件归一成"可执行 callback"（`resolve()` `:222`：函数本身，或对象的 `apply`），当前 fiber 先 `assertActive()`，然后按 callback 找/建 `Plugin.Runtime`，再 `new Fiber(...)`。同一个插件被挂两次共享一个 Runtime，但各有 Fiber。返回值 `wrapped` 挂了一个 `then`（`:331`），所以 `await ctx.plugin(...)` 等的是"加载完成"而不是"函数返回"。
3. **等依赖**：`FiberState`（`fiber.ts:147`）= `PENDING → LOADING → ACTIVE → FAILED / UNLOADING → DISPOSED`。`inject`（`registry.ts:19`、`Inject.resolve` `:71`）声明需要哪些服务名；不齐就停在 `PENDING`，齐了才跑插件体，服务被撤销时回到非 `ACTIVE`，重新出现时**重跑**插件体。所以"加载顺序"这个概念在 Cordis 里不存在，只有"需求是否满足"。
4. **配配置**：先过 `internal/config` waterfall（`fiber.ts:641`；Loader 就是在这里插进 YAML 求值结果，`loader/src/index.ts:104`），再用 `runtime.Config`（Standard Schema，`fiber.ts:50`）校验。校验失败记 `_error`（`fiber.ts:659-664`），此后 `_getState()` 读作 FAILED（`fiber.ts:576`）——FAILED 是推导态，不是一次独立转移。
5. **注册东西**：插件体里调的每个 `ctx.effect()` / `ctx.on()` / `new Service(ctx, name)` 都把 disposer 收进当前 fiber 的 `_disposables`；子 fiber 的 dispose 本身是父 fiber 的一个 effect（`fiber.ts:265`），所以卸载是自上而下的一次遍历，不靠纪律。
6. **状态外泄**：状态变化发 `internal/status`，但只在跨过 `ACTIVE` 边界时通知（`fiber.ts:582-589`）——依赖图只关心"可用/不可用"。

## 读服务为什么必须声明 inject

`ReflectService.handler.get`（`reflect.ts:136`）：symbol、`prototype`、`then`、数字串、下划线开头的名字直接透传（`isSpecialProperty` `:86`）；其余先查 `reflect.props`，accessor 走自定义 get，服务走解析。没有声明过需求时，它先造一个 `cannot get property "x" without inject`（`:144`）并把该错误交给 `internal/get` waterfall 兜底，没人补就抛。

因此两条规矩是机制而不是风格：`ctx.<name>` 是"我在 `inject` 里声明过"的断言；可选服务用 `ctx.get(name)`（`reflect.ts:17` 的 JSDoc：拿不到返回 `undefined`，不抛）。`packages/AGENTS.md` 说属性读取"对拓扑敏感"、`ctx.get` 读全局存储，就是这个差别。

## 五种分派（`events.ts:183-243`，一共 60 行）

| mode | 等 promise | 有返回值 | 何时停 |
|---|---|---|---|
| `emit` | 否 | 否 | 全部同步发起，返回值丢弃 |
| `parallel` | 是（`allSettled`） | 否 | 全跑完，失败聚合成 `AggregateError` |
| `serial` | 是（按序 await） | 是 | 第一个 bail 值 |
| `bail` | 否 | 是 | 第一个 bail 值 |
| `waterfall` | 取决于监听器 | 是（最外层的返回） | 谁不调 `next()` 谁否决整条链 |

`isBailed`（`:13`）：非 `null`/`false`/`undefined` 即算否决。`waterfall`（`:234`）的实现是 `args.pop()` 取出最内层 `next`，再 `cbs.shift()` 逐层外裹——它就是 dsh 里 `agent/pre-step`、`tools/execute`、`llm/stream` 的骨架（节点 6/7/9）。

监听器解析时按上下文过滤：`dispatch()`（`:165`）用 `hook.global || !filter || filter.call(thisArg, hook.ctx)`，`Hook` 里存着注册当时的 `ctx`（`:120`）。`Service` 也有对应的 `[symbols.filter]`（`service.ts:61`），比较 isolate label。这一小段就是"每个 agent 有自己的作用域注册"的底层支撑（节点 3）。

## 作用域三兄弟（`context.ts`）

- `extend(meta)` `:99`：原型继承造子上下文，`meta` 的自有属性遮蔽父级，父级不被改动。
- `isolate(name, label)` `:121`：让某个服务名在此之下解析到新 label；传同一 label 的两次 isolate 共享该服务，于是"换一个 provider 只换这一片"。
- `intercept(name, config)` `:139`：给某服务的配置追加一层，`Service[symbols.resolveConfig]`（`service.ts:86`）从根到叶收集后按 `Config.merge` 合并。

dsh 的 per-agent scope、preset、按服务覆写配置，全都建在这三个方法上。

## 收尾：申请表的完整读法（2026-09-27）

### inject 的两种形态

`Inject`（`registry.ts:19`）是数组或对象：数组 `['llm']` 只要名字；对象 `{ llm: { model: '...' } }` 给每个名字附一份**拦截配置**。两者都被 `Inject.resolve`（`registry.ts:71`）归一成"名字 → 配置或 null"的映射；类插件沿原型链合并继承来的 inject（`registry.ts:77`）。

落点在 fiber 构造器（`fiber.ts:238-245`）：对象形态的配置值写进**这张登记条自己前台**的 intercept 表——含义是"我需要 llm，而且在我这套前台里，llm 的配置多一层 { model }"。真正生效要等招牌被使用时：`Service[symbols.resolveConfig]`（`service.ts:86`）从根到叶收集 intercept，用 `Config.merge` 或浅合并叠起来（`schemastery/src/index.ts:805` 起）。

三个等价入口：插件静态字段 `inject`；`ctx.inject(deps, callback)`（= `ctx.plugin({ inject, apply: callback })`，`registry.ts:300`）；`@Inject(name, config)` 装饰器（用在类上并进静态 inject，用在方法上把该方法调用推迟到服务可用，`registry.ts:37-60`）。

### Config 的一生

- 装载：`internal/config` waterfall（Loader 插入 YAML 求值）→ `runtime.Config['~standard'].validate`（Standard Schema，`fiber.ts:50-53`）→ 失败记 `_error`，状态读作 FAILED，`await ctx.plugin()` 时抛出。
- 更新：`fiber.update()` 先解析并校验新配置，再过 `internal/update` waterfall——监听者不调 `next()` 即否决这次重启，Loader 在这里写回文件（`fiber.ts:736-753`）。
- 拦截叠加：各层 intercept 按"离根近的先合并"叠进服务配置（`service.ts:86-102`）。

### `ctx.tools` 的类型从哪来（三级声明合并）

1. 框架内部：`registry.ts:164` 用 `declare module './context.ts'` 把 `ctx.plugin` / `ctx.inject` 补进 Context 接口。
2. dsh 包：各服务包自己合并——`packages/core/tools/src/index.ts:137` 加 `tools: ToolRuntime`；`packages/llm/llm/src/index.ts:57` 加 `llm: LlmRuntime`，并把 `'llm/stream'` 写进 `Events`（`@mode waterfall` 记在 JSDoc 上）。
3. 拦截配置的类型化：`Service<T>` 声明幽灵字段 `[symbols.config]: T`（`service.ts:27`），`InjectKey`（`registry.ts:22-24`）只挑带这个字段的服务名——所以 `@Inject('llm', { ... })` 的第二参有类型检查，给没声明配置类型的服务写拦截配置编译不过。

## 自检题参考答案（2026-09-27）

### 决策树：给事件选 mode 的三问

1. **要不要答案？** 要"层层包装一条链"（每个监听者包住后面的行为）→ waterfall；要"第一个表态就停"（同步）→ bail；要"按序等回复、有人表态即停"（异步）→ serial。
2. 不要答案：**那要不要等大家跑完？** 调用方必须等监听者完成才能继续 → parallel；发完就忘 → emit。
3. 反向检查：**这件事允不允许被否决？** 只有"监听者构成管道"的事件才允许否决；纯通知绝不能选 waterfall。

`tools/rename-display`（假想事件）：改名是纯通知——改名的事实已在工具登记处发生，UI 只是被告知；没人能"否决一次已经发生的改名"，也不需要答案 → **emit**。错选 waterfall 会漏什么：任何监听者忘了调 `next()`，这次改名就"没发生"，而真源里它已经改了——UI 与真源从此不一致；并且把纯通知做成链，等于邀请未来的监听者去否决不该否决的事。选 parallel 只是无谓等待（调用方挂起等 UI 跑完），不算错但没必要。超纲一步：显示名本属工具声明的静态呈现层（节点 7 的 presentation），只有"运行期改名"才需要事件。

### bail 为何短路：三句因果

1. `bail` 按名单顺序同步调用监听者，每个返回值立刻交给 `isBailed` 判定（`events.ts:13`）。
2. 甲是 async 函数：同步返回的已经是 Promise 对象；对象不是 null / false / undefined，所以**算表态**。
3. 表态成立 → 循环停在甲之后 → 乙从未被叫；喊话人拿到的是那个尚未兑现的 Promise——既拦住了后面的人，又没给出答案。

## 为什么这套框架适合做 agent harness

1. 可替换性来自按名解析而不是 import：换模型适配器 / sandbox / 持久化后端时 Consumer 不动。
2. 可逆性来自 effect 树而不是约定：热重载、fork、卸载都是 dispose 一次。
3. 扩展点来自类型化事件而不是子类化：agent-loop 不需要知道 guard 存在，`tools/pre-execute` 就是它的全部接口。

## 填空（读完再写，答案指到具体行）

1. 插件的启动时机由 ____ 决定，而不是 ____；证据在 `____:____`。
2. 在插件里读 `ctx.tools` 能成功的前提是 ____；读一个可选服务的正确写法是 ____。
3. 一个 waterfall 监听器不调 `next()`，效果是 ____；dsh 里靠这一点实现语义的事件举两个：____、____。
4. "卸载不泄漏"在本框架里由 ____ 保证；`ctx.on` 走的是 ____ 这个调用（给出文件行号）。
5. 两个 isolate 上下文共享同一服务实例的条件是 ____。

## 注意

`vendor/` 是钉住的上游副本。不要随手改 `vendor/*/src/`，每一处偏离都必须记进 `vendor/README.md` 的 Local modifications（`vendor/AGENTS.md`）。这一节点只读不改。

## 检验

- 说出 `Fiber` 与 `Context` 的关系：一个插件挂两次，Runtime / Fiber / Context 各几个？
- 打开 `packages/core/agent-loop/src/index.ts` 顶部，指出一处 `ctx.effect` 和一处 waterfall 监听，说明它卸载时会发生什么。
- 下一节点入口：`vendor/loader/src/index.ts`（看它如何在 `internal/config` / `internal/update` 上挂链）。
