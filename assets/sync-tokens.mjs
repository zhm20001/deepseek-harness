#!/usr/bin/env node
/**
 * sync-tokens —— 把「纸感信纸风」权威 tokens 物化为各插件的 vendor 副本。
 *
 * 用法：
 *   node sync-tokens.mjs            # 同步（写入生成头：来源 + 日期 + 权威 sha256）
 *   node sync-tokens.mjs --check    # 只校验：各副本是否与权威一致（push / 发布前必跑）
 *
 * 原则：真相只有一份（tokens-paper.css）。仓库内的副本是带校验和的衍生品，
 * 可再生、可检测过期，绝不手抄。插件开源后仓库内容即分发物，因此副本随仓库
 * 提交；开发期改风格 = 改权威 → 跑本脚本 → 重建插件。
 *
 * 消费方清单（新增 webUI 时在此登记）：
 *   - dsh-plugin-palette-board  src/client/tokens-paper.css   （入口副作用导入）
 *   - dsh-diary                 assets/tokens-paper.css       （运行时读取内联）
 *   - dsh-dsa-lite / dsh-zqtrade / dsh-simtrade
 *                               assets/tokens-paper.css       （page.ts 运行时读取内联）
 *   - deepseek-harness lessons 与权威同仓库，course.css 直接 @import，无需副本。
 */
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const AUTHORITY = join(HERE, 'tokens-paper.css')

const CONSUMERS = [
  { name: 'dsh-plugin-palette-board', dest: resolve(homedir(), 'dsh/dsh-plugin-palette-board/src/client/tokens-paper.css') },
  { name: 'dsh-diary', dest: resolve(homedir(), 'dsh/diary/assets/tokens-paper.css') },
  { name: 'zpet', dest: resolve(homedir(), 'Dev/ZPet/assets/tokens-paper.css') },
  { name: 'dsh-dsa-lite', dest: resolve(homedir(), 'Dev/dsa-lite/dsh/dsa-lite/assets/tokens-paper.css') },
  { name: 'dsh-zqtrade', dest: resolve(homedir(), 'Dev/ZQTrade/dsh/zqtrade/assets/tokens-paper.css') },
  { name: 'dsh-simtrade', dest: resolve(homedir(), 'Dev/simtrade/dsh/simtrade/assets/tokens-paper.css') },
]

const sha256 = (s) => createHash('sha256').update(s).digest('hex')

function vendorHeader(sha) {
  return `/* ── vendor 副本 · 勿手改 ────────────────────────────────────────
 * 唯一权威源: ~/deepseek-harness/assets/tokens-paper.css
 * 同步日期: ${new Date().toLocaleDateString('sv')}  ·  权威 sha256: ${sha}
 * 改风格请改权威文件，然后运行: node ~/deepseek-harness/assets/sync-tokens.mjs
 * 直接改本副本会在下次 --check 时报过期。外部贡献者：本副本即本仓库内的权威。
 * ────────────────────────────────────────────────────────────────── */\n\n`
}

const authority = readFileSync(AUTHORITY, 'utf8')
const sha = sha256(authority)
const check = process.argv.includes('--check')
let stale = 0

for (const { name, dest } of CONSUMERS) {
  if (!existsSync(dest)) {
    if (check) { console.error(`✗ ${name}: 副本缺失 ${dest}`); stale++; continue }
    mkdirSync(dirname(dest), { recursive: true })
  }
  if (check) {
    const recorded = readFileSync(dest, 'utf8').match(/权威 sha256: ([0-9a-f]{64})/)?.[1]
    if (recorded === sha) console.log(`✓ ${name}: 与权威一致 (${sha.slice(0, 12)}…)`)
    else { console.error(`✗ ${name}: 副本过期（副本 ${recorded?.slice(0, 12) ?? '无标记'} ≠ 权威 ${sha.slice(0, 12)}…）→ 运行 node ${AUTHORITY.replace('tokens-paper.css', 'sync-tokens.mjs')}`); stale++ }
    continue
  }
  // symlink 要先拆掉，否则写入会穿透符号链接直接覆盖权威文件本体
  if (lstatSync(dest, { throwIfNoEntry: false })?.isSymbolicLink()) {
    unlinkSync(dest)
    console.log(`  ${name}: 移除了 symlink，改为实体副本`)
  }
  writeFileSync(dest, vendorHeader(sha) + authority)
  console.log(`✓ ${name}: 已同步 → ${dest}`)
}

if (check && stale > 0) {
  console.error(`\n${stale} 个副本过期：push 前请先运行 sync-tokens.mjs 同步。`)
  process.exit(1)
}
