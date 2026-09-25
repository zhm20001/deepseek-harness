# dsh 架构学习资源

## Knowledge

- [docs/architecture.md](docs/architecture.md) — 权威总览：组合层叠、核心包表、turn flow、「新行为放哪里」决策表。任何架构问题先查这里。
- [docs/cordis-primer.md](docs/cordis-primer.md) — Cordis 五个核心概念(plugin = Service、context = service repository、inject、typed events、reversible effects)与 waterfall 语义、`!!js` 配置插值。理解插件机制的钥匙。
- [docs/capability-seams.md](docs/capability-seams.md) — capability seam(Service Definition / Provider / Consumer)的定义与范例。理解「可替换性」从哪来。
- [docs/agent-lifecycle.md](docs/agent-lifecycle.md) — agent 从创建到结束的生命周期与事件序列。
- [examples/headless-agent/cordis.yml](examples/headless-agent/cordis.yml) — 最小可运行组合的活样本：一个 leaf 如何声明 LLM provider、spine、backends。
- [packages/examples/agent-spine-demo](packages/examples/agent-spine-demo) — 「教学包」：一个 bundle plugin 挂载 agent 需要的全部共享脊柱，README 讲清了 bundle/leaf/app 三方分工。
- [docs/cookbook/extension-cookbook.md](docs/cookbook/extension-cookbook.md) — DIY 手册：加 LLM adapter、加 tool、写插件。
- [packages/bundle/base/cordis.patch.yml](packages/bundle/base/cordis.patch.yml) — 451 行真实组合清单，研究「dsh 到底由哪些插件组成」的第一手材料。

## Knowledge(用户自己的项目，仓外)

- [~/projects/mytool/dsh](../projects/mytool/dsh) — 用户第一个真实 dsh 插件(笔记沉淀引擎)：Service/Config/六工具/ctx.llm 直调/diff 呈现/runtime skill 的完整标本，81 测试。
- [~/projects/mytool/docs/specs/0002](../projects/mytool/docs/specs/0002-integration-contract.md) — 整合契约：把 prose 约定 drill 成硬软分工 + 裁决表 + 追记的范本(Lesson 0004 的标本)。
- [learning-records/ticket-patterns.md](learning-records/ticket-patterns.md) — 每票沉淀的通用 dsh 模式，「指挥 + 验收」清单素材。

## 工具链(git / pnpm / 命令注册)

- [Pro Git 中文版](https://git-scm.com/book/zh/v2) — git 权威书,免费全文。追更相关:第 2 章「远程仓库的使用」(fetch/pull 分工)、第 7 章「贮藏」(stash 栈语义)。
- [npm 文档:package.json 的 bin 字段](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#bin) — "release 安装为什么自带命令"的权威答案。
- [pnpm CLI 文档](https://pnpm.io/cli/install) — install/add 全局行为与 bin 链接。

## WebUI 风格资源(淘主题用)

- [dbohdan/classless-css (GitHub)](https://github.com/dbohdan/classless-css) — classless CSS 主题总索引,带截图。「一个 css 文件 = 一整套风格」这一流派的第一淘货地。Use for: 给新 webUI 找现成纸感之外的整风格。
- [Simple.css](https://simplecss.org/) — 维护活跃的 classless 框架,变量驱动,暗色模式完善。Use for: 语义 HTML 页面(lessons/diary 类)的快速换肤参照。
- [Pico CSS](https://picocss.com/) — class-light(少于 10 个类),带纯 classless 版本。Use for: 想要稍重的组件感但仍零构建的页面。
- [Water.css](https://watercss.kognise.dev/) — 极小 drop-in 美化。Use for: 给简单页面"稍微好看一点"的最小干预。
- [Open Props](https://open-props.style/) — 业界最大的 CSS 变量库(colors/easings/shadows/typography),即"半原子 token"。Use for: 给 tokens 体系借单个变量的值,或学习 token 分层方式([repo](https://github.com/argyleink/open-props))。
- [Flexoki — Steph Ango](https://stephango.com/flexoki) — 「墨与纸」配色方案([repo](https://github.com/kepano/flexoki),MIT),与纸感信纸风同宗,暖纸底+墨色。Use for: tokens-paper 的近亲第二主题,提取成 tokens-flexoki.css 的首选素材。
- [Oklchroma (OKLCH 生成器)](https://utilitybend.com/blog/oklchroma-an-oklch-color-pattern-generator-that-generates-css-variables) — 一个基色生成感知均匀的色阶,直接输出 CSS 变量。Use for: 给现有主题加"新增配色"时生成色阶。
- [Flavio Copes 色阶生成器](https://flaviocopes.com/tools/color-palette/) — OKLCH 生成 50–950 色阶,导出 CSS 变量/Tailwind @theme/JSON,带 WCAG 对比度提示。Use for: 校验新 token 的可读性对比度。

## Web UI 呈现方式(surface/pattern)资源

- [WAI-ARIA APG · Pattern 目录](https://www.w3.org/WAI/ARIA/apg/patterns/) — W3C 官方 UI 模式大全,「学名」的最终出处。每个 pattern 带 ARIA 语义/键盘交互/可运行示例。Use for: 验收 AI 写的组件时当权威清单。
- [NN/g · Modal & Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/) — 什么时候(不)该打断,modal 选型的实证依据。配 [Popups: 10 Problematic Trends](https://www.nngroup.com/articles/popups/)。
- [MDN · `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) / [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) / [window.open](https://developer.mozilla.org/en-US/docs/Web/API/Window/open) — 原生实现三件套;`show()` vs `showModal()` = modeless vs modal。
- [local] reference/ui-surfaces-glossary.html — 本课程自产速查表:术语 × 指纹 × dsh 挂载点对照(Lesson 0008 配套)。

## Wisdom (Communities)

- 仓库本身的 GitHub Issues / Discussions(deepseek-harness org) — 提问和看别人如何扩展的第一场所。用户暂未表示加入意愿。

## Gaps

- 尚未找到 Cordis 框架的上游独立文档(被 vendor 进来并 rescope)，目前以 docs/cordis-primer.md 为准。
