<!-- dsh 插件 README 模板 —— 固化自 dsh-usage-board / dsh-plugin-palette-board 两代实践。
     用法：整份复制到插件仓库根目录，替换 {{占位符}}，删除不适用的段落。
     规则一：徽章行必须出现在文件前 10 行内（GitHub 首屏即见）。
     规则二：中文为主文件 README.md，英文镜像 README.en.md，顶部互链。
     规则三：截图放 assets/*.png 相对路径引用，先起独立 dsh web 实例再截，别动用户在跑的实例。 -->

# {{package-name}}

> {{一句话定位：什么风格 / 什么形态的东西，给哪个宿主用。}}

[![dsh Version](https://img.shields.io/badge/dsh-%E2%89%A5{{版本}}-4D6BFE)](https://www.npmjs.com/package/@deepseek-ai/cordis)
[![Node Version](https://img.shields.io/badge/Node.js-%E2%89%A5{{Node版本}}-339933?logo=node.js)](https://nodejs.org/)
[![Zero Dependency](https://img.shields.io/badge/runtime_deps-{{依赖数}}-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-{{MIT}}-blue.svg)](LICENSE)

**简体中文** | [English](README.en.md)

---

## 📖 简介

{{两段以内：它给宿主带来什么能力；数据/状态的持久化形态与对外服务面（如果有 paletteHub 这类服务，在这里点一句"面向所有插件开放"。）}}

---

## 📸 界面预览

{{一句话说明挂载机制：经宿主 Slot 系统在哪几处挂载 UI，client bundle 是什么形态。}}

### {{主界面 —— 最有代表性的一张}}

![{{主界面}}](assets/{{main}}.png)

{{一两句解说这张图里值得注意的能力点。}}

### {{次界面 / 弹窗 / 另一主题}}

![{{次界面}}](assets/{{secondary}}.png)

{{一两句解说。每张截图配一个 ### 小标题，2–4 张为宜。}}

### 挂载点一览

| 挂载点 | 位置 | 展示内容 |
| :--- | :--- | :--- |
| `{{slot 名}}` | {{界面位置}} | {{一句话}} |
| `{{portal / 路由 / 常驻元素}}` | {{界面位置}} | {{一句话}} |

---

## ✨ 核心特性

- {{emoji}} **{{特性短名}}**：{{一句话说清行为与边界，不写实现细节。}}
- ⌨️ **全键盘交互**：{{快捷键一句串。}}
- ⚡ **克隆即用**：{{lib/ 随仓库提交 + 运行时零依赖声明（若成立）。}}

{{6–10 条，每条 emoji 开头；把最重要的用户可感知能力放前面，架构纯度类放后面。}}

---

## 🚀 快速上手

### 1. 环境准备

- **Node.js** >= `{{版本}}`
- **dsh web** >= `{{版本}}`（{{如仅适配新版宿主，链接到版本基线一节}}）

### 2. {{克隆并挂载}}

```bash
git clone https://github.com/{{user}}/{{repo}}.git
cd {{repo}}
# {{若 lib/ 随仓库提交：注明克隆即用、无需 install / build；
#   若不含产物：写明 npm install && npm run build}}
# {{挂载方式：profile dependencies link + dsh.profile.bundles + pnpm install + 重启 dsh web}}
```

{{挂载通道注意事项（bundle patch 自动合并 / 手动通道二选一）。只写本环境验证过的命令，不编造 CLI。}}

### 3. 首次使用

{{首屏是什么状态、第一步该做什么、数据在哪。}}

---

## ⚙️ {{数据与存储 / 配置说明}}

| 类别 | 存储位置 | 说明 |
| :--- | :--- | :--- |
| {{真相源}} | `~/.dsh/...` | {{只读 / 可重建 / 可手工编辑，损坏时行为}} |

> 💡 {{备份与重建建议；哪些东西永远不要删。}}

---

## 🔌 {{API / 第三方插件接入（如有对外服务面）}}

{{若发布 cordis 服务：先给最小可运行的软依赖接入代码块，再列要点。
  务必写明软依赖 vs 模块级 inject 的坑（硬契约会拖垮整个 web GUI）。}}

---

## ⌨️ 快捷键

| 按键 | 行为 |
| :--- | :--- |
| `{{键}}` | {{行为}} |

---

## 🛠️ 本地开发

```bash
{{pnpm install / build / typecheck / test / watch，每条一个动词短语注释}}
```

> ⚠️ {{若 lib/ 随仓库提交：提醒改动 src/ 后 build 并提交产物。}}

```text
{{精简目录树：只到二级，client/ 内挑 2–3 个代表文件 + "…完整清单见 CONTEXT.md"}}
```

---

## 🧩 架构备注

- **双半结构**：Node 侧 cordis 插件 + 浏览器侧 `__ModuleLoader__` client bundle，经 `dsh.client` 声明 + `exports["./client"]` + `dsh.bundle.patch` 挂载。
- **产物契约**：{{lib/ 各产物是什么、require 平台模块表词的限制。}}
- {{服务归属半区 / store 纪律 / portal 挂载等"下一个人改代码前必须知道"的约束，每条一行。}}
- **版本基线**：{{按哪个 dsh 版本的模块表实现；老版本宿主上的降级行为；不做兼容的边界。}}

---

## 📄 License

本项目基于 [MIT License](LICENSE) 开源。{{覆盖范围一句话：源码 / 构建产物 / 文档。}}

<!--
英文镜像 README.en.md 检查单：
  1. 徽章行同样在前 10 行，语言切换行改为 [简体中文](README.md) | **English**；
  2. 所有锚点链接、图片相对路径、代码块与中文版一一对应（截图共用同一份 assets/，不重复截图）；
  3. 段落顺序、表格列、emoji 保持一致——读者切换语言时不应"丢段落"。
-->
