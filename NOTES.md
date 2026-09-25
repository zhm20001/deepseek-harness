# 教学偏好与工作笔记

- 用户中文交流,技术术语保留英文(plugin、Service、inject 等)。
- 用户是开发者,可直接读源码;对 Cordis 是新手。
- 切入点是好奇心驱动的:「连 loop 都是插件,拔了不就坏了?」——用它作为第一课的主线效果好。
- 教学文件(MISSION.md、RESOURCES.md、NOTES.md、lessons/、reference/、assets/、learning-records/)放在仓库根目录但不入 git;不要提交它们。
- 引用源码时给出从仓库根可点的相对路径。

## 2026-08-17 增补

- 诉求明确(见 MISSION.md):个人项目 × AI 集成;代码交给 AI 写;用户要到「能指挥、能验收」的程度,不是默写级。
- 有畏难情绪(「知难而退」)。教学策略:小步、每课开头先讲 payoff、练习尽量绑定他自己的项目。
- 术语卡壳点:patch(已由 Lesson 0002 处理)。后续注意:任何带仓库行话的词第一次出现就用真实文件示例解释。
- 已确认的理解水平:五概念级(plugin=Service、ctx、inject、events、effects)已内化,见 learning-records/0001。
- assets/quiz.js 是共享测验组件;新 lesson 引它,不要再内联脚本。

## 2026-08-17 增补二(mytool 票制推进后)

- mytool dsh 化已走完 ticket 05–08(骨架/检索/契约 drill/整合实现),81 测试全绿 + 真模型冒烟通过。课程随之转向「以他自己的插件为标本」:Lesson 0003 解剖插件、Lesson 0004 讲契约 drill 方法,均链接仓外路径 `../../projects/mytool/…`(本地 file:// 浏览可点)。
- 票制小结沉淀在 `learning-records/ticket-patterns.md`(每票的通用 dsh 模式,是用户的「验收清单」素材);Lesson 0003/0004 大量取材于此,后续新票继续增录。
- 教学要点实证:用户对「硬软分工」「蒸发点考古」「追记式修正」反应最好——都是验收视角而非实现视角,保持这个取向。
- 下一步:ticket 09(soft-invariant 评测器)完成后考虑 Lesson 0005(怎么验收 AI 写的 AI 功能)。

## 2026-08-18 增补三(票制完结)

- **ticket 05–10 全部完成**:mytool 已是可日常使用的 dsh 插件(`dsh plugin --profile web add` 装好,6 工具 + skill + 真模型评测全绿),Python 版退役(ADR-0005 闭环)。总计:88 keyless + 3 案例真模型评测 + lib 打包。
- Lesson 0005(怎么验收 AI 写的 AI 功能)素材已齐:09 的评测器(硬软分层/expect.soft/检查器先测/retry 0)就是全部内容,用户下次课时可以写。
- mytool 工作树未提交(用户自审后自己 commit);教学文件照旧不入 git。

## 2026-08-28 增补四(真实事故教学:dsh-usage-board exit(1))

- 教学首次从「标本解剖」升级为「活体事故复盘」:用户自己的 dsh-usage-board 插件(AI 重写,v0.1.0)连续杀死宿主进程。根因:手写 HostContext 镜像里 flush 签名写错(string vs Session 对象)+ 定时器 fire-and-forget → unhandledRejection → dsh fail-loud exit(1)。事故全记录在仓外 `../../projects/usage-dashboard/dsh-usage-board/docs/incident-2026-08-27-exit-1.md`(该仓库 docs/ 不入 git,属其本地惯例);修复 commit 7750c36。
- **Lesson 0005 编号已用掉**:给了「一张没兑付的欠条,杀死了整个程序」(Promise/unhandledRejection/崩溃栈倒读/镜像与 mock 一起骗过测试)。原计划的「怎么验收 AI 写的 AI 功能」顺延为 Lesson 0006,素材仍在 ticket-patterns/09。
- 用户 misconception 修正记录在 learning-records/0002:曾把崩溃归因于换 LM Studio 本地模型,证据面前自行纠正——「相关 ≠ 因果」从此是他亲历的锚点。
- 课程基建补漏:lessons/ 一直引用的 `assets/course.css` 此前根本不存在(0001–0004 长期裸奔),本次补齐;.quiz/.explain/table/callout/dark mode/print 全套,后续 lesson 直接复用。
- 验收清单新增两条(已教):① 插件里定时器/回调发起的异步必须有 .catch;② 新插件装好后必须做一次真实对话冒烟——安装期 backfill 路径不经过事故屏障,「装好且有历史数据」不等于没病。
- 下次课先验收:能否独立从下往上读一段崩溃栈(LR-0002 的 follow-up),再决定是否深化到契约测试。

## 2026-08-29 增补五(工具链事故课:停在旧版的全局 dsh)

- 第三次活体事故复盘:用户 pull 被本地脏文件挡住(拒绝信息被看漏,落后 1933 commits 不自知),且全局 dsh 是 8-22 手动打包的冻结拷贝 → `dsh --version` 停 0.1.0-rc.5。已当场修复:丢弃脏文件、pull 到 0.1.2-alpha.1、install/clean/build、全局命令改为 wrapper(`~/Library/pnpm/bin/dsh` → `apps/cli/lib/bin.js`,④层指向③层)。
- **Lesson 0006 编号被用户点名用于「从源码到命令」工具链课**(四层管线 + clone vs release + bin 字段);原顺延的「怎么验收 AI 写的 AI 功能」再次顺延为 **Lesson 0007**。配了 `reference/dsh-update-cheatsheet.html`(追更口诀 + 症状诊断表),lesson 与速查表互链。
- misconception 记录见 LR-0003(pull 过了≠更新了;仓库更新≠命令更新)。**下次课开头检索检验**:独立画四层管线 + 解释 bin 字段,过了才确认内化;崩溃栈倒读(LR-0002 follow-up)也还没验收,两件一起查。
- 教法再证:真实标本取向依然最有效——这次用的全是他机器上的真东西(which 输出、wrapper 内容、behind 1933、clean 掉 233 路径)。工具链课抽象度高,靠"每层对应他亲自跑过的命令"压住。

## 2026-08-31 增补六(新话题线:Web UI 呈现方式术语)

- 用户主动发起提问:自己的 6 个插件出现了 4 种 UI 形态(覆盖/弹窗/新页面/tab),想知道学名与选型。这是从 dsh 插件课自然长出的 web 前端话题线,Lesson **0008** + `reference/ui-surfaces-glossary.html` 已交付。
- 教学主线定为一条主轴:「同 document(浮层系) vs 新 browsing context」,浮层内再分「打断(modal) vs 不打断」+「临时/常驻/并行」三档生命周期。用户自己观察里暗埋的混淆点(两种 tab;diary 是新标签页不是弹窗)直接当第一课的钩子。
- 标本全部实证过(palette modal 指纹/usage-board 三形态/diary anchor target=_blank/dsh-context conversation.view tab),Explore 代理报告路径在对话里,写进了课件。dsh 宿主 UI 扩展点谱系(conversation.view、shell.overlay、conversation.input.overlay、sidebar.footer.action、webServer.register、自建 portal 逃生门)沉淀在 glossary 的对照表——这张表本身对「指挥 AI 做插件 UI」有直接复用价值。
- 待验收(下次课开头检索检验,与 LR-0002/0003 的 follow-up 一并):①能否不看书说出四种形态学名+第一主轴;②给他一个新需求(如「会话里嵌一个TODO 面板」)能否按四问选出 surface 并说理由。过了再记 learning-record。
- 教法延续:真实标本取向依然最有效——这次全部 6 个插件都是他亲手装过的。palette 的 portal.tsx 注释、PaletteBoard.tsx 头注释自己就写着 role=dialog/焦点陷阱,拿插件自己的注释当「官方自白」效果好。

## 2026-09-04 增补八(真实事故教学 II:契约配对——dsh web 选工作区弹回)

- 第四次活体事故,且是 LR-0002「相关≠因果」的正统续集:用户先疑自己改 profile/palette(全部有不在场证明),真凶是「dsh-context 0.33.1 的 undefined 投影值 × 8/29 23:20:08 的 pull(一次到位带来创建广播内嵌投影 + 无损 JSON 校验)」。bug 出生时刻可用 reflog+孤儿日志精确到 8/29 23:29;用户「装好时还能用」的记忆被投影缓存物证证实——教学价值极高。
- **Lesson 0010 已交付**(三张名词卡:契约/广播与回滚/版本钉住;三条件表;全物证时间线;验收清单 +2:大 pull 后必做新建会话冒烟、手动推 ^0.x 钉住的插件)。修复本身(升级 dsh-context 0.41.3)在事故当轮已完成并在隔离副本验证。
- misconception 记入 LR-0006:「好插件=不会坏」→「插件只对出生时的宿主契约负责;病属于版本对」。生态适配窗口(宿主 8/28 发版→插件 8/30 修复)是讲 semver 0.x caret 的现成锚点。
- 待验收(下次课开头,与 LR-0002/0003/0005/0008 的 follow-up 并队):①Lesson 0010 四道 quiz 口头重做;②能否独立说出三条件各自的提供者与「转真时刻」;③崩溃栈倒读仍未验收。
- 排查方法论首次显式命名:「在场者名单 + 逐个不在场证明」(备份 diff / mtime / reflog / npm time / 日志指纹),用户对这套流程的反应好,后续事故课直接复用。

## 2026-08-31 增补七(slots 登记形态课:footer 动作区与注册表)

- palette-board v1.8→v1.9 的扫描口径事故长成了 Lesson **0009**(footer 动作区 + slots 注册表):主线「UI 是一张可查询的名单」,教 entriesOfSlot 读面、label thunk、口径同源围栏、link/footerTrigger 两条点击路(正好接第 8 课主轴两端),第 6 节把 v1.8 为什么先扫 DOM 做了正面复盘。
- misconception 修正记入 LR-0005:「发现界面内容要扫 DOM」→「有登记处就读登记处」,且他能自行说出因果(palette 的对象是插件,插件都在 slots 里)。以后指挥 AI 做发现类需求可直接引这条锚点。
- 基建再补漏:Lesson 0008 有 quiz 标记却没挂 `assets/quiz.js`(测验是死的),已补;0006 复查无恙,0007 顺带挂上(该课暂无 quiz,防御性)。
- 待验收(下次课开头,与 LR-0002/0003/0008 的 follow-up 并队):①三道 quiz 口头重做;②给他「列出所有 tab 面板」这类新需求,看他是否先问「宿主有没有注册表」。过了才记新 learning-record。
- 一手来源再立功:slot-catalog.ts(:1988 footer.action 户口)、registry.ts(:95/:366/:379 服务面)、SidebarRoot.tsx(:213 render 现场)——「官方清单当教材」这条路持续有效。
