# 0004 · 分发现实推翻指针方案：vendor 副本制

日期：2026-08-31
状态：已采纳（替代 0007 课时期的 symlink 活指针方案）

## 背景与决策过程

design tokens 统一后，架构经历了三个阶段：

1. **裸值散落**（初始）：palette/diary/lessons 各自手抄同一套值 → 半年漂移出两套纸色、两套朱红。
2. **symlink 活指针**（2026-08-31 上午）：各插件 symlink 指向权威文件 `deepseek-harness/assets/tokens-paper.css`，diary 运行时读绝对路径。前提假设：一切只在这台 Mac 上跑。
3. **vendor 副本制**（2026-08-31，本记录）：用户决定将插件开源发布到 GitHub——"仓库内容即分发物"，symlink 在别人机器上是悬空链接，前提假设死亡。最终改为：插件仓库内提交带生成头的实体副本（来源 + 日期 + 权威 sha256），`sync-tokens.mjs` 一键同步，`--check` 在 push 前校验。

## 关键洞察

- **架构决策绑定前提；前提死了，决策必须跟着死**，哪怕决策本身"感觉更优雅"。指针方案的优雅建立在"永不离开这台机器"上，开源一句话就把它变负担。
- **"复制 = 死"是伪二分**：手抄的复制才会死；机器生成、带校验和、可一键再生的复制是活的衍生品。业界名称就是 vendoring（Go vendor/、npm 的 lockfile 同理）。
- **判断信号**：当出现"发布 / 分发 / 别人 clone"的可能时，一切指向本机绝对路径的机制都要排查（tokens 只是其一）。
- **本次发现更根本的未解问题**：两插件依赖 5 处 `link:` 指向 deepseek-harness（cordis/webserver/llm/schemastery），tokens 副本解决样式自包含，依赖自包含仍是开源前必须处理的硬阻塞。
- 安全细节：sync 脚本写入 dest 前必须先 `unlink` symlink，否则写入会穿透符号链接**直接覆盖权威文件本体**。

## 影响的文件

- `deepseek-harness/assets/sync-tokens.mjs`（新增，权威侧发布工具）
- `dsh-plugin-palette-board/src/client/tokens-paper.css`（symlink → 实体副本）
- `dsh-diary/assets/tokens-paper.css`（新增）+ `src/paths.ts`（改读本地副本）
- 全局 `AGENTS.md` WebUI 风格段（新增 push 前须知）
