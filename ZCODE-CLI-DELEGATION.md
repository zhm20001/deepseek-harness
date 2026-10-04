# ZCode CLI 派任务简报（Agent 交接件）

读者：要在 dsh 中封装 ZCode CLI、用 bash 把任务派给 ZCode 的 Agent。
核实日期 2026-10-04，ZCode 0.16.9。条目标注（官方）/（实测）/（推断）/（社区）表示证据来源；带到期日的条目会失效，批量派任务前先复核。

## 这份简报替你踩过的坑

- ZCode CLI 存在但不在 PATH 上，入口是
  `node /Applications/ZCode.app/Contents/Resources/glm/zcode.cjs`（实测可跑，版本随 App 更新，路径失效时先 `ls` 该文件确认）。
  **dsh 插件直接写全路径**：非交互 shell 加载 alias，依赖 alias 会静默失败。
- CLI 与桌面 App 同引擎、共享 Z.AI OAuth 登录与套餐额度（官方）。计费在服务器按「会话所用的套餐提供方」结算，客户端本地零折算（实测）。
- headless 会话（`-p`）按「默认模型」选提供方，它未必是你想要的套餐（实测踩中：探针被记到 `new-provider/step-5-preview`）。所以有下一节。

## 一次性配置：钉模型（有完成判据，判据满足前禁止批量派任务）

1. 在 ZCode 客户端把**默认模型**设为 Start 计划的 GLM-5.3-Flash（模型选择器处的默认设置；默认模型在磁盘上的存储键未定位到，故一切以探针闭环为准）。
2. 发探针：`node /Applications/ZCode.app/Contents/Resources/glm/zcode.cjs -p "回复ok" --cwd /tmp`
3. 查计费去向：
   `sqlite3 -readonly ~/.zcode/cli/db/db.sqlite "select provider_id, model_id, computed_total_tokens from model_usage order by started_at desc limit 1;"`
4. **完成判据：`provider_id = account:bigmodel-start-plan`。** 不是 ⇒ 默认模型没钉住，回步骤 1 重跑探针。

探针和生产任务用同一个 `--cwd`，保证同参。

## 调用形态（按任务选）

- 一次性任务：`zcode -p "<任务>" --cwd <dir>`，加 `--json` 便于机器解析。
- 多轮会话：记下会话 ID（`--json` 输出或查 session 表：
  `select id from session order by time_created desc limit 1;`），后续 `--resume <sess_...>` 续任意会话，`-c` 续同目录最近会话。
- 附文件 `--attach <file>`（可重复）；设任务目标 `--target "<goal>"`。
- 进程退出即任务完成，无需守护进程；起多个进程 = 并行多个独立会话。
- 完整旗标看 `zcode --help`，本简报不复述。深度双向控制另有 `app-server` 子命令（stdio JSON 协议），当前链路用不上。

## 权限与安全

- `-p` 默认 `--mode yolo`（无人值守全自动）。派不可信任务时收权：`--disallowed-tools "Bash Edit"`，并用 `--cwd` 把写路径圈进专用沙盒目录。
- 并发会话共享同一账号 token 池；并发度 × 单任务预算要算进每日额度。

## 额度事实（2026-10-04 核实）

账号下两个套餐提供方：

- `account:bigmodel-start-plan` / GLM-5.3-Flash —— Start 计划，token 池制。每日约 1 亿、24h 滚动刷新（社区 + 本机推断：连续 10 天日耗 800 万–7022 万未触顶）。
- `account:bigmodel-individual-coding-plan` / GLM-5.3 —— Coding Plan，积分制，高峰 1 倍 / 非高峰 0.5 倍抵扣（官方）。**0.67 是 ZCode 内 Coding Plan 的全周期等效系数（客户端官方提示），仅 Coding Plan 享受；Start 计划按原始 token 计。**

时效窗口（官方文档，**2026-10-07 到期**）：

- 庆双节：全天按非高峰费率（对积分制套餐生效）。
- 夜间畅用：每日 23:00–09:00，GLM-5.3-Flash 在 ZCode/AutoClaw 端不限量，其他 Agent 额度翻倍。headless 是否算「ZCode 端」未实测：当晚批量跑一次、次日看 model_usage 日耗是否突破约 7000 万天花板即知。

排程结论：10-07 前重任务尽量排 23:00–09:00；之后避开工作日 14:00–18:00（UTC+8）高峰。

## 排障

- 请求日志：`~/.zcode/cli/log/YYYY-MM-DD.jsonl`；usage 字段在日志中打码，真值在数据库。
- 计费真值：cli db 的 `model_usage` 表（provider_id / model_id / 各 token 列 / status / error_*）；会话清单在 `session` 表（directory / title / time_created）。
- 客户端数据目录 `~/.zcode/v2/`：`credentials.json`、`config.json` 含明文 API key，权限保持 600。

## 边界

- 本简报只对「dsh → bash → `zcode -p`」这条已验证链路负责；app-server 协议、按工作区钉模型两项未验证，需要时再探。
- 模型规则、活动到期日以官方页面（docs.bigmodel.cn / docs.z.ai）与客户端内提示为最终权威。
