# 节点 2 — Loader 与声明式组合

节点 1 留下的最大空位：装载由谁发起、卸载由谁决定。答案就是这一层——**Loader 把"配置行"变成"商户"**。连同 include / hmr 一共 1645 行，全在 `vendor/`。

## 一句话定义

Loader 是一棵**配置行树**：YAML 里的一行（`Entry`）= 一份开业申请，`import` 出模块、交给节点 1 的 `registry.plugin()`；patch 是对这棵树的**数据改写**（纯函数）；`!!js` 让配置值在装载现场求值；write-back 把运行期变更写回文件；HMR 把文件变化接到重导出上。

## 因果主线（接节点 1 的第 6 条）

1. 节点 1 说"装载由 Loader 调 `ctx.plugin()` 发起"——具体在 `Entry._init()`（`entry.ts:221-235`）：按行的 `name` 导入模块 → `unwrapExports` 归一 ESM/CJS 形状 → `registry.plugin(plugin, options.config)`。**Loader 自己不含任何插件逻辑，它只是"读配置、导模块、提交给内核"**。
2. 一行配置凭什么能随时增删改？因为它是**数据**不是代码：`EntryOptions`（`entry.ts:10-23`）就六个核心字段 `id / name / config / group / disabled / inject`（isolate 插件再补 `intercept / isolate` 两个）。改商户 = 改数据行 → dispose 或重启 fiber，全部走节点 1 的既有机制。
3. 谁把数据行持久化、热更新？`Include`（`vendor/include`）= 文件背书的子树：读 YAML/JSON → `applyEntryPatches` → `root.update()`；文件变了 → `refresh()` 重新 diff。dsh 的 `cordis.yml` 就是一个根 Include（`packages/boot/app-boot/src/index.ts:538` `mountRootInclude`）。
4. 节点 1 的三个内部频道在这里接上电（`loader/index.ts`）：
   - `internal/config`（:104）：行配置先**插值** `!!js` 再交内核校验；
   - `internal/update`（:115）：fiber 配置更新 → 写回 `entry.options` → `tree.write()` 落盘；
   - `internal/plugin`（:129）：给 fiber 盖 entry 章（`fiber.entry`），并检测"自杀式 dispose"→ 写回 `disabled: true`。

## 源码地图（按读的顺序）

| 顺序 | 文件 | 行数 | 这里定的是什么 |
|---|---|---|---|
| 1 | `vendor/loader/src/config/entry.ts` | 236 | `EntryOptions` 配置行、`Entry`（init/update/插值豁免）、volatile 快速通道 |
| 2 | `vendor/loader/src/config/tree.ts` | 133 | `EntryTree`：id 索引、嵌套 id（`:` 分隔）、create/remove/update（**唯一带 write 的入口**）、`import()`（`cordis:` 内建名） |
| 3 | `vendor/loader/src/config/group.ts` | 90 | `EntryGroup` 行数组、diff 式 `update`（新表 create / 旧表 remove）、`Group` 插件 |
| 4 | `vendor/loader/src/index.ts` | 211 | `Loader` 服务本体：三个内部频道钩子、`builtins`、自杀检测 |
| 5 | `vendor/loader/src/config/utils.ts` | 32 | `evaluate`（`with(ctx) eval`）与 `interpolate` |
| 6 | `vendor/loader/src/config/isolate.ts` | 173 | entry 级 `isolate/intercept` 选项 → `LocalRealm`(#id) / `GlobalRealm`(@label) |
| 7 | `vendor/include/src/index.ts` | 343 | 文件背书的树：YAML 方言（`!!js` tag）、**`applyEntryPatches`**、原子写回 |
| 8 | `vendor/hmr/src/index.ts` | 427 | 文件监听三分支：全量重启 / 插件部分重载 / 配置 refresh |

## 核心机制

### 1. patch：对配置行的纯函数改写（`include/src/index.ts:57-127`）

`applyEntryPatches(data, patches, warn)` 是**全部 patch 语义**， mounting 和 `dsh --dump-config` 共用同一个函数，所以 dump 永远不偏离真实启动：

- 输入**永不被改动**（`structuredClone`）——热重载反复应用时才能"撤销"一个被移除的 patch；
- 非 insert 的 patch 按 `id` 定位、逐字段覆盖；`name` 可选校验，不匹配告警跳过（防改错行）；找不到 `id` 告警跳过，**不抛错**；
- `insert` 的行**立刻被索引进 map**（:95-100）——同一层里后面的 patch 能改到前面插入的行，所以"bundle 插入的行，用户的 patch 层还能禁掉它"；
- 多层叠加 = 每层依次过这一个函数。app-boot 把 bundle/profile/home/`--patch` 各层压平后调用（`app-boot/src/index.ts:401-464`）。

**占位句答案**：bundle 写入的东西仍可被上层改写，因为 patch 是对数据行的有序纯函数改写——每层克隆后按 id 覆写，insert 的行也进索引，后层天然胜出；配置是数据，改数据不需要改代码。

### 2. `!!js`：装载现场求值（`loader/index.ts:104-113` + `utils.ts`）

YAML tag `tag:yaml.org,2002:js` 被解析成 `{ __jsExpr }` 节点（`include:9-15`）；Loader 在 `internal/config` 里 `interpolate`：递归遍历配置，遇到表达式节点就 `with(ctx) eval`（`utils.ts:5-9`）。求值发生在**这一行的 fiber 的 ctx** 上——所以表达式里能读 `process.env`、也能读当时已提供的服务。

**只有两处生效**：行的 `config`（递归）和 `disabled`（`entry.ts:89-93`，`disabledOf` 现场求布尔）。其余字段（name/id/inject/group…）永远字面量——这就是 AGENTS.md"条件组合用 overlay 不用表达式"规则的来源。**树载体豁免**：`Group` / `Include` 自己的 config 是别的行的清单，整体不求值（`loader/index.ts:107-111` 的 `EntryGroup.key` 检查），嵌套行的 `!!js` 留到那一行自己的 fiber 里求。

**占位句答案**：`!!js` 只允许出现在插件的 `config` 和 entry 的 `disabled` 字段。

### 3. write-back：运行期变更落盘（`tree.ts:97-109` + `include:289-340`）

只有**树级 API**（`tree.create / remove / update`）会调 `tree.write()`；`entry.update()` 只改内存。`Include.write()` 把 `root.data` 序列化回文件：debounce 合并、写 `.tmp` 再 `rename`（原子）、EBUSY 等错误指数退避重试、只读文件拒绝写。`!!js` 表达式经 `represent` 原样往返——改别的字段不会丢表达式形式；但**用新 config 整行替换时**，新值就是字面量（demo 第 2 步实测）。

运行期改配置的三条路在此汇合：(a) 用户改文件 → HMR/refresh → diff；(b) 插件代码里 `ctx.fiber.dispose()` → Loader 的 `internal/plugin` 钩子写回 `disabled: true`（`loader/index.ts:149-165`）；(c) 树 API / 网页控制台 → `tree.update`。

### 4. entry.update 的两条更新路（`entry.ts:116-155`）

合并 options 后：禁用了 → `fiber.dispose()`；配置变了 → 看**是不是只有 volatile 值变了**。`Volatile`（cosmokit 的引用单元格）只变单元格内容，**不重挂载**：原地提交后 `emit loader/volatile-update`（`entry.ts:162-195`）；普通值变了才走 partial-dispose + fiber.update（= 节点 1 时序图三的"死与重生"）。

### 5. realm isolate：entry 级门牌（`config/isolate.ts`）

行选项 `isolate: { 服务名: true | 标签 }` → `LocalRealm`（#行id）/ `GlobalRealm`（@标签）→ 给服务名生成隔离 symbol，写进这条行前台的 `[Context.isolate]` 表。读哪个实例由节点 1 的 `Service[symbols.filter]`（比较 isolate label）裁决。**节点 3 的 dsh `Scope` 就是把这套包装成"每个 agent 一套注册"。**

### 6. HMR 三分支（`hmr/src/index.ts:129-153`）

文件变化先分类：**框架文件**（进程入口的依赖树，`externals`）→ `loader.exit()` 全量重启——框架代码没法安全热换；**插件源文件**（在 ESM loadCache 里）→ 部分重载：stash → `analyzeChanges` 沿依赖图传播 accepted/declined → 插件入口文件是原子单位 → 同时清 ESM `loadCache` 和 CJS `require.cache`（Node 24 的 LoadCache 要用 `Map.prototype.delete`）→ 重 import → `registry.delete` + 重挂 fiber → **失败回滚**（恢复缓存、重挂旧插件）；**配置文件** → 对应 `Include.refresh()` 重读 diff。改一次插件文件看到的行为 = dispose 旧的 + 用新模块重放 fiber，节点 1 的"重跑代码体"。

## 实跑（demos.md 节点 2 节）

两段：patch 纯函数（改配置/禁用/插行/多层叠加/name 校验）；Loader+Include 全链（YAML 行 → 插件启动 → `!!js` 求值 → 树 API 改配置落盘 → 禁用落盘）。四个实跑坑都记在 demos.md：**两份 cordis 实例**（引 src 还是 lib）、class 插件构造器在**微任务**、Include 必须作为**配置行**挂载（`cordis:` 内建名）才有 entry 标记、只有**树级 API**才落盘。

## 填空（读完再写，答案指到具体行）

1. 一行配置从 YAML 到插件体执行经过哪五步？给出每步的文件行号。
2. 插件代码里调 `ctx.fiber.dispose()` 之后，为什么重启进程它仍然是关的？
3. 同一层 patch 里，后写的 patch 为什么能改到前面 insert 进来的行？
4. `Group` 的 config 变了，子行如何自动增删？指出做 diff 的行号。
5. HMR 为什么对框架文件只肯全量重启、对插件文件才部分重载？"部分"的边界画在哪？

## 注意

`!!js` 用的是 `with(ctx) eval`——任意代码执行。dsh 只在自己的配置文件里允许它，这就是"配置文件 ≈ 代码"的信任级别；不要把不可信输入喂给 cordis.yml。

## 检验

- 跑通 demos.md 两段实跑，口头复述四个坑分别对应哪条机制。
- `dsh --profile headless --dump-config`，任选一行说出它来自 cordis.yml 还是某层 patch。
- 下一节点入口：`packages/core/scope/src/store.ts`（dsh 怎么把 realm isolate 包装成 per-agent Scope）。
