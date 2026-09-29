# 实跑记录（可复制重跑）

全部用仓库里真实的 cordis 跑过，不是设想。跑法：

```sh
cd /Users/zhm20001/deepseek-harness
# 文件扩展名必须是 .mts，否则顶层 await 会被当成 CommonJS 报错
node --import tsx/esm /tmp/文件名.mts
```

## 一、Proxy：读格子时会跑一段看不见的代码

```js
const store = { tools: '这是 tools 插件提供的能力' };
const ctx = new Proxy(store, {
  get(target, name) {
    if (name in target) return target[name];
    throw new Error('没声明就读取 ' + String(name) + '：我不知道它是什么');
  },
});
console.log('1) 读 ctx.tools →', ctx.tools);
store.llm = '刚被别人塞进来的 llm';
console.log('2) 读 ctx.llm   →', ctx.llm);
try { console.log(ctx.nope); } catch (e) { console.log('3) 读 ctx.nope  →', e.message); }
```

实际输出：

```
1) 读 ctx.tools → 这是 tools 插件提供的能力
2) 读 ctx.llm   → 刚被别人塞进来的 llm
3) 读 ctx.nope  → 没声明就读取 nope：我不知道它是什么
```

## 二、环依赖会静默锁死（`/tmp/cycle-proof.ts`）

A 需要 b、B 需要 a，对照组 C 只等已存在的 tools。

```ts
import { Context } from '/Users/zhm20001/deepseek-harness/vendor/cordis/src/index.ts'
const ctx = new Context()
void ctx.plugin({ name: 'giver', apply: (c: any) => c.provide('tools', '能力 tools') })

const A = { name: 'A', inject: ['b'], apply: (c: any) => { c.provide('a', 1); console.log('  A 执行了') } }
const B = { name: 'B', inject: ['a'], apply: (c: any) => { c.provide('b', 2); console.log('  B 执行了') } }
const C = { name: 'C', inject: ['tools'], apply: () => console.log('  C 执行了') }
void ctx.plugin(A); void ctx.plugin(B); void ctx.plugin(C)

const state = (p: any) => [...(ctx.registry.get(p)?.fibers ?? [])].map((f: any) => f.state)
setTimeout(() => console.log('A →', state(A), ' B →', state(B), ' C →', state(C)), 300)
```

实际输出（"A 执行了""B 执行了"两行始终没出现）：

```
  C 执行了
A → [ 0 ]  B → [ 0 ]  C → [ 2 ]
```

`0 = PENDING`、`2 = ACTIVE`（`vendor/cordis/src/fiber.ts` 第 147 行的 `FiberState`）。全程没有异常，进程自然结束。**症状是"功能没出现"，不是"报错"。**

## 三、五种 dispatch mode 的实测差异（`/tmp/modes.mts`）

同一份监听者，换五种喊法。关键构造：`快` 是同步返回，`慢` 是异步（等若干毫秒再返回），会签版收 `next` 参数。

```ts
import { Context } from '/Users/zhm20001/deepseek-harness/vendor/cordis/src/index.ts'
const ctx = new Context()
const t0 = Date.now()
const log = (s: string) => console.log('  +' + String(Date.now() - t0).padStart(3) + 'ms  ' + s)
const 清空 = () => { for (const k of Object.keys(ctx.events._hooks)) delete ctx.events._hooks[k] }
const 快 = (n: string, v: any) => () => { log('监听者' + n + ' 返回 ' + JSON.stringify(v)); return v }
const 慢 = (n: string, ms: number, v: any) => async () => { await new Promise(r => setTimeout(r, ms)); log('监听者' + n + ' 等完 ' + ms + 'ms'); return v }
const 会签 = (n: string, 放行: boolean, next: () => any) => { log('监听者' + n + (放行 ? ' 签字' : ' 拒绝签字')); return 放行 ? next() : '被' + n + '否决' }

async function 场景(标题: string, 喊法: string, 装: () => void) {
  清空(); 装()
  log('=== ' + 标题 + ' ===')
  const r = await (ctx as any)[喊法](...(喊法 === 'waterfall'
    ? ['demo', '参数', () => { log('    内置行为执行了'); return '内置返回值' }]
    : ['demo', '参数']))
  log('喊话人拿到 → ' + JSON.stringify(r))
}

await 场景('emit', 'emit', () => { ctx.on('demo', 慢('甲', 100, undefined)); ctx.on('demo', 快('乙', '我反对')) })
await 场景('parallel', 'parallel', () => { ctx.on('demo', 慢('甲', 100, undefined)); ctx.on('demo', 慢('乙', 60, undefined)) })
await 场景('serial', 'serial', () => { ctx.on('demo', 慢('甲', 100, undefined)); ctx.on('demo', 慢('乙', 60, '乙说可以')); ctx.on('demo', 快('丙', '轮不到我')) })
await 场景('bail', 'bail', () => { ctx.on('demo', 慢('甲', 100, '甲说可以')); ctx.on('demo', 快('乙', '轮不到我')) })
await 场景('waterfall', 'waterfall', () => { ctx.on('demo', (p: any, next: any) => 会签('审批', true, next)); ctx.on('demo', (p: any, next: any) => 会签('守卫', false, next)) })
```

实际输出摘要：

```
+  1ms  === emit ===          乙 返回 "我反对" → 喊话人拿到 undefined（表态被丢弃）
+ 62ms  乙 等完 60ms
+101ms  甲 等完 100ms          完成顺序 ≠ 登记顺序
+101ms  === serial ===        甲 返回 undefined 继续 → 乙 返回 "乙说可以" 停 → 丙 从未被叫
+264ms  === bail ===          甲 的凭条算表态 → 乙 从未被叫 → 喊话人手上是未兑现的凭条
+366ms  === waterfall ===     审批签字 → 守卫不签 → "内置行为执行了"这行始终没打印
```

三条要背下来的结论：

1. `bail` 配异步监听者是陷阱：不等结果，但 Promise 对象本身就是"表态值"，于是既拦住了后面的人，又没给喊话人答案。
2. `waterfall` 忘记调 `next()` = **静默短路**，连内置行为都不发生。dsh 根规则里"必须调用 next()"就是针对它。
3. dsh 的真实选型（`docs/architecture.md` 第 109 行）：`agent/pre-step`、`agent/request`、`llm/stream`、三个 `tools/*` 是 waterfall；`agent/turn-stopping` 是 serial 且没有 next。

## 四、节点 2 之一：patch 是对配置行的纯函数改写（`/tmp/dsh-lesson2/patch-demo.mts`）

```ts
import { applyEntryPatches } from '/Users/zhm20001/deepseek-harness/vendor/include/src/index.ts'
const warn = (msg: string, ...args: any[]) => console.log('  [warn]', msg, ...args)
const base = [
  { id: 'tools', name: 'tools-plugin', config: { allowed: ['fs'] } },
  { id: 'grp', name: 'group', group: true, config: [{ id: 'inner', name: './inner.mjs', config: { level: 1 } }] },
]
const layer1 = [
  { id: 'tools', config: { allowed: ['fs', 'shell'] } },
  { id: 'grp', insert: [{ id: 'extra', name: './extra.mjs' }] },
]
const layer2 = [
  { id: 'extra', disabled: true },
  { id: 'tools', config: { allowed: ['fs', 'shell', 'web'] } },
]
console.log(JSON.stringify(applyEntryPatches(applyEntryPatches(base, layer1, warn), layer2, warn), null, 2))
applyEntryPatches(base, [{ id: 'tools', name: 'wrong-name', disabled: true }], warn) // name 校验
applyEntryPatches(base, [{ id: 'nope', disabled: true }], warn) // 找不到只告警
```

实测要点：多层叠加后 `tools.config` 是最后一层的三项；`extra`（第一层插入的行）被第二层成功 `disabled`——**insert 的行立刻进索引**；原始 `base` 完全没被改（structuredClone）；name 不匹配和 id 不存在都只告警不抛错。

## 五、节点 2 之二：Loader + Include 全链（`/tmp/dsh-lesson2/loader-demo.mts`）

```ts
import { Context } from '/Users/zhm20001/deepseek-harness/vendor/cordis/lib/index.js'
import Loader from '/Users/zhm20001/deepseek-harness/vendor/loader/src/index.ts'
import Include from '/Users/zhm20001/deepseek-harness/vendor/include/src/index.ts'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const dir = await mkdtemp(join(tmpdir(), 'dsh-lesson2-'))
await writeFile(join(dir, 'hello.mjs'), `
export function apply(ctx, config) { console.log('  [hello] 启动，config =', JSON.stringify(config)) }`)
await writeFile(join(dir, 'cordis.yml'), [
  '- id: hello', '  name: ./hello.mjs', '  config:',
  `    user: !!js "process.env.USER ?? 'nobody'"`, '    level: 1', '',
].join('\n'))

const ctx: any = new Context()
ctx.baseUrl = pathToFileURL(dir + '/').href
await ctx.plugin(Loader, {})
ctx.loader.builtins['include'] = Include          // 注册 cordis: 内建名（dsh 里由 bundle 完成）
await ctx.loader.create({ name: 'cordis:include', config: { path: './cordis.yml' } }, null)
await ctx.loader.await()

const entry = [...ctx.loader.entries()].find((e: any) => e.options.id === 'hello')!
const tree = [...ctx.loader.entries()].find((e: any) => e.options.name === 'cordis:include')!.subtree
await tree.update('hello', { config: { user: 'zhm', level: 2 } })  // 树级 API 才带落盘
await new Promise(r => setTimeout(r, 50))                          // write-back 是 debounce 的
await tree.update('hello', { disabled: true })
await new Promise(r => setTimeout(r, 50))
console.log(await readFile(join(dir, 'cordis.yml'), 'utf8'))
```

实际输出（摘要）：

```
  [hello] 启动，config = {"user":"zhm20001","level":1}   ← !!js 现场求值（process.env.USER）
1) 装载后：fiber 状态 = 2 （2 = ACTIVE）
2) …
  [hello] 启动，config = {"user":"zhm","level":2}        ← 配置变更 = dispose + 重跑代码体
--- cordis.yml ---
- id: hello
  name: ./hello.mjs
  disabled: true
  config:
    user: zhm
    level: 2                                             ← !!js 表达式被整行替换后变为字面量
```

### 四个实跑坑（每个都对应一条机制）

1. **两份 cordis 实例**：demo 引 `vendor/cordis/src/index.ts`、而 vendor 包的裸包名 `@deepseek-ai/cordis` 解析到 `lib/index.js`（tsx 还会把链接路径的 src 视为独立模块）——登记板/符号表各一份，`ctx.loader` 永远 undefined。**必须让 ctx 和插件解析到同一份实例**（demo 统一走 lib）。这就是 AGENTS.md"Source plane 与 artifact plane 不得混用"的运行期版本。
2. **class 插件构造器在微任务里执行**：`ctx.plugin(Loader)` 同步返回，构造器里那次 `provide('loader')` 还没跑；`await ctx.plugin(...)` 之后服务才在。
3. **Include 必须作为配置行挂载**：裸 `ctx.plugin(Include)` 的 fiber 没有 `entry` 标记，子树无法从根遍历（HMR 找 Include 就是靠 `entry.subtree`）。正确姿势：注册 `cordis:` 内建名后用 `tree.create`——与 dsh `mountRootInclude` 同一条路。
4. **只有树级 API 才落盘**：`entry.update()` 只改内存；`EntryTree.create/remove/update` 末尾才调 `tree.write()`（`tree.ts:85,93,107`）。
