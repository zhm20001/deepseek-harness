# 节点 1 的三段实跑（可复制重跑）

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
