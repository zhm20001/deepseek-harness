# 每票收尾:本票用了哪些通用 dsh 模式

> mytool dsh 化的每一票收尾时,把「这票里出现的、换一个项目还能复用的 dsh 写法」记在这里。
> 这是「指挥 + 验收」清单:以后看 AI 写的插件,对着这里问"该有的模式有没有、有没有越界"。
> 只记通用模式;mytool 特有的领域逻辑(打分权重、stale 阈值)不记。

## Ticket 05 — 骨架 + 存读(补记)

1. **类即插件**:`class NotesService extends Service`,`static inject = ['tools']` 声明依赖,`static Config`(schemastery)声明可从 cordis.yml 校验的配置。服务名 'notes' → 全局 `ctx.notes`,经 `declare module` 声明合并补类型。
2. **注册是 effect**:每个工具注册 `ctx.effect(() => registerXxxTool(ctx, this), 'notes.tool(...)')`,插件卸载时 registry disposer 自动清场。
3. **defineTool 三件套**:parameters DSL(required/enum/array)→ 模型可见的参数面;output.schema(ValueSchemaSpec)→ 结果的类型契约;output.render → 结果给用户看的纯函数。execute 里抛错 = isError,不需要自己 try/catch。
4. **外部源码插件装载**:`--patch` 绝对路径行 + tsx 直载 TS 源码;裸包名(`@deepseek-ai/dsh-tools`)靠插件包自己 node_modules 里的 link: 依赖解析到 harness 源码树——同 realpath 同模块实例,无版本漂移。
5. **core/service 分层**:确定性行为全在 `core/` 纯函数(测试直接打它),Service 只做 config 持有 + 委托 + 工具注册——测试不需要 fake ctx。

## Ticket 06 — 检索/最近/回滚

1. **新工具 = 三步走,零 loop 改动**:`core/<行为>.ts` 纯函数 → `tools/<tool>.ts` 薄壳(defineTool 只做参数声明 + 委托 service)→ service constructor 里多一行 `ctx.effect`。加三个工具没碰任何既有文件的核心逻辑——"新行为上扩展点,不改 loop"的直接体感。
2. **输出 schema 的递归性**:顶层可以是 `{type:'array', items:{type:'object', additionalProperties:false, ...}}`;可空数值用 `oneOf: [{type:'integer'},{type:'null'}]`。schema 是给回放/UI 的契约,不是运行时校验(信任同进程类型)。
3. **enum 参数**:list_recent 的 status 数组参数用 `items: {type:'string', enum:[...]}`,让框架在模型 JSON 边界拒绝非法值;core 层仍显式校验(纵深防御,但拒绝的报错信息归 core 管)。
4. **同构不变量跨语言对齐**:pytest 是 oracle,JS 测试逐条对应同一行为(排序稳定性、stale 含等、坏文件跳过)。验收 AI 移植时,看测试是不是从 oracle 翻的、差异点(如 CLI 输入源消失)有没有显式备注——本票 find 测试头部的说明就是范本。
5. **一个 TS 陷阱的通用教训**:`parseTimestampMs` 显式把无偏移时间戳归一为 UTC,因为裸 `new Date()` 按本地时区解析——跨语言移植时,标准库的隐式默认(时区、稳定性、比较语义)就是差异源,得逐个点名。

## Ticket 08 — note_integrate(ctx.llm 直调 + diff + runtime skill)

1. **ctx.llm 直调五件套**(仓内先例 session-title-llm):`createUserMessage({content, source:{kind:'plugin', plugin:'<归属>'}})` 标记请求来源 → `using callDeadline = deadline(signal, timeoutMs, TIMEOUT_CODE)`(`using` 语法保证异常路径也释放)→ `deepFreeze(GenerateOptions)` 冻结请求 → `ctx.llm.stream(options)` 循环里 `assembler.push()` + `throwIfAborted()` 收集 → `finishError(finish)` 把终止原因翻译成该报的错(stop 过、error/aborted 带 code、max-tokens/tool-calls 各自具体)。验收 AI 写的 LLM 调用时对这五件逐一问。
2. **闭 union 字段留空,不改 union**:`GenerateOptions.purpose` 是 `'compaction'|'session-title'` 闭集合,外部插件不自造值——声明合并扩不了字面量 union,硬塞就是类型撒谎。
3. **可选依赖 = `ctx.inject(['skills'], cb)`**:vendored cordis 没有"可选 inject"语法;`static inject` 是硬门(服务缺席插件不装)。想要"有则用、无则跳"就在 constructor 里 `ctx.inject(['skills'], sctx => { sctx.effect(...) })`——回调在依赖齐备时运行,卸载/重载自动跟随。
4. **diff 呈现三通道**:①工具返回值里带结构化 diff 数组(进会话日志,可回放);②`presentationMeta(args, value)` 把 diff 写进 result.meta(UI 持久呈现的读取面);③`presentResult(args, result)` 从 meta 读回、错误/畸形时返回 undefined 退化为普通结果。render(模型面)只出摘要行——**全文进日志不进模型上下文**,这是控制上下文体积的常规分工。
5. **JsonValue 兼容靠 type alias**:工具返回值类型要能赋给 `JsonValue`,而 interface 没有隐式 index signature——interface 换 type alias 即过。遇到"类型上不该错的 TS2322",先想到这类结构性差异而非 as 断言。
6. **模型输出是校验边界**:裸 JSON 契约用严格 parse(恰好键集、类型、枚举),**不做容错性剥离**(markdown 围栏不剥)——失败硬报错给模型自纠,比静默修复更安全;这对应仓库规则"在 model/tool JSON 边界做运行时校验"。
7. **提案与事实分离**:模型返回的 `proposed_status` 只进工具结果(对话可见、可商量),落盘值由数据流强制透传既有值——"改动需确认"这类软纪律,能用数据流保证就不用 prompt 纪律。

## Ticket 09 — 真模型 soft-invariant 评测

1. **真模型测试的最小装配**(仓内先例 llm-deepseek adapter.e2e):`new Context()` + 逐个 `ctx.plugin(...)` 装真插件(LlmRuntime → credentials-local → SystemPrompt → ToolRuntime → LlmDeepSeek → 被测插件),然后**直接调 service 方法**。不起 agent loop、不 spawn 进程——测什么装配什么,依赖链(inject)拖出多少装多少。
2. **key 门认多种来源**:`describe.skipIf` 只看 env 会漏掉「key 在 credentials 文档里」的环境;门条件 = env **或** `$DSH_HOME/.credentials.yaml` 存在,后者还用 `LocalCredentialProvider` 装进上下文——评测走生产同款接缝,而不是把密钥抄进测试环境。
3. **评测器先于被评测对象可信**:检查器是纯函数、返回违规列表;先给它自己写 keyless 单测(并故意埋正反例),再让它上岗判模型。评测器没测过,评测结果只是装饰。
4. **硬软分层 + expect.soft**:硬保证(确定性)用 expect 首错即停;软不变量用 `expect.soft(v, '信息')` 一次跑全——质量评测要的是完整画像,不是第一个失败点。这与 harness e2e 的 retry 2 配套逻辑相反:质量评测 retry 0,传输偶发失败就让它红。
5. **检查器的容错方向要预先定**:漏报可接受、误报不可接受——于是句界只认句末标点(折行长句按整句检)、空白归一、bullet 前缀差异放过。写检测器前先写"哪边错更糟",否则调阈值没有方向。
6. **返回值里的路径语义是隐式约定**:`bak` 返回 basename 而非绝对路径(Python 版同款),真跑第一轮就翻车。跨语言/跨接口移植,凡返回"路径"处先问:绝对还是相对、相对什么。

## Ticket 10 — 收尾(打包/安装/退役)

1. **插件自带 bundle patch 会自动生效**:`dsh plugin --profile <p> add <路径>` 只是 pnpm 安装;装载行来自包内 `dsh.bundle.patch` 声明的 cordis.patch.yml,loader 自动叠一层——**不需要**再往 profile patch 手写行(同 id 手写=冗余覆盖)。验收问法:装完跑 `--dump-config`,行在哪一层出现、出现了几次。
2. **TS 源码插件要出 lib**:`rewriteRelativeImportExtensions`(TS 5.7+)让 noEmit 源配置与 emit 构建配置共存,`.ts` 导入重写为 `.js`,不需要打包器;package.json 补 `main`/`types`/`files`。验收问法:装好的插件在**纯 Node**(无 tsx)下 import 一把。
3. **正面证据优于"没报错"**:验证插件加载,要看它产生的**效果**(如 `ctx.tools.schemas()` 里出现 note_*),启动没崩只说明没炸。顺带复现了 inject 硬门:漏装 LlmRuntime,插件静默 pend、无任何报错——这是"为什么验收要正面证据"的活例。
4. **退役前的告别跑**:删 Python 前最后跑一遍 oracle(70/70),删后重跑继承者(88/88)+ 重建 lib;头注里的死路径引用(.py 文件名)同步改成"已退役原版(ADR+git 历史)"——文档不指向不存在的文件。

---
票制完结(05–10):骨架→检索→契约 drill→整合实现→真模型评测→打包退役。mytool 已是可日常使用的 dsh 插件。
