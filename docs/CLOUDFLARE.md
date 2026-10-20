# Cloudflare 部署与在线反馈

当前源码为 v1.8.0，按用户选择使用 **Cloudflare Pages 的 pages.dev 域名**：游戏入口 `/`，试玩与反馈页 `/playtest/`，提交接口 `POST /api/feedback`。实际线上版本以该网站的 `build.json` 和部署记录为准。

## 部署结构

- Pages 项目 `muse-bloom` 提供 `https://muse-bloom.pages.dev`。静态文件来自 `dist/cloudflare-pages`，`_routes.json` 只将 `/api/*` 交给 Pages Function。
- Pages Function 通过 `FEEDBACK_API` 服务绑定调用私有 Worker `muse-bloom`。原始 URL、Origin、方法和请求体原样传递，浏览器不跨域。
- 私有 Worker 使用 `DB` 绑定连接 D1 `muse-bloom-feedback`，保留原生 `FEEDBACK_RATE_LIMIT`。Workers 的 `workers_dev` 和 `preview_urls` 都关闭，公开入口只有 Pages。
- Pages 当前不支持原生限流绑定，因此采用官方支持的 [Pages Service bindings](https://developers.cloudflare.com/pages/functions/bindings/#service-bindings)，不把限流降级为单个进程的内存计数。
- `cloudflare/pages/wrangler.jsonc` 管理 Pages，根目录 `wrangler.jsonc` 管理私有 Worker。账号 ID、真实 D1 ID 和凭据不提交到源码。

## 已实现的行为

- 游戏内 Feedback 和试玩说明页均可提交四项评分、继续意愿、文字意见；说明页还支持设备、是否独立完成及组织者观察。
- 匿名编号与试玩存档分开保存，不要求姓名、邮箱或账号。游戏操作仅在试玩模式记录在本机；提交时明确勾选同意才上传。说明页使用同一编号时会附上本机对应的试玩操作记录。
- 草稿自动保存在当前浏览器。接口超时、断线、503 时保留提交快照，刷新后重试沿用相同 UUID；D1 主键保证同一份反馈只写一条。只有收到 D1 写入后的回执才显示提交成功。修改答案再提交会产生新版本。
- 可随时下载 JSON 备份。GitHub Pages、CrazyGames 单文件、离线试玩包继续使用下载模式，不会尝试向不存在的接口提交。
- D1 保存匿名编号、游戏版本、来源、服务器接收时间、四项分数、继续意愿和经校验的反馈/操作 JSON。接口不保存 IP、User-Agent、Cookie 或未声明字段，不提供公开读取反馈的接口。文字反馈仍可能包含用户自行填写的信息，页面已提醒勿填写个人信息。
- v1.8 的 `goal-met` 事件保存关卡和本次完成的目标序号，最多三个，逐项验证且不接受重复值；旧版本操作日志仍可提交。发布新版静态页面时需要一并发布 Worker，避免旧 API 拒绝新事件。

## 本地运行

需要 Node.js 22 或以上，依赖版本固定在 lockfile。

```powershell
npm ci
npm run cf:dev
```

命令构建 `dist/cloudflare/`，应用本地 D1 迁移，然后启动 Wrangler；通常地址为 `http://127.0.0.1:8787/playtest/`，以终端输出为准。本地数据保存在被 Git 忽略的 `.wrangler/`，与云端 D1 完全分开。

```powershell
npm run test:feedback-api
npm run test:cloudflare
npm run test:cloudflare-pages
npx wrangler deploy --dry-run --outdir artifacts/cloudflare-worker
```

测试使用独立临时 D1：验证并发幂等、参数校验、请求来源、大小限制、限流、数据库失败，以及手机/电脑表单、网络失败、响应丢失、刷新恢复、回执、备份和正常游戏存档隔离。`test:cloudflare-pages` 使用两个本地 Worker 和真实服务绑定，重新执行 API 与浏览器提交检查；缺失绑定返回 503，不能误报成功。所有合成反馈标记为 `automated-check`。`cf:dev` 是单服务本地开发入口；Pages 绑定由独立套件验证。

## 第一次部署到自己的 Cloudflare 账号

在项目根目录执行：

```powershell
npx wrangler login
npx wrangler whoami
npx wrangler d1 create muse-bloom-feedback
npx wrangler pages project create muse-bloom --production-branch main --force
```

先检查 `wrangler d1 list` 和 `wrangler pages project list`，已有同名资源时复用，不重复创建。Wrangler 4.151.2 在代理会话中会将新 Pages 项目的创建自动转为 Workers 部署；首次创建时 `--force` 在此命令中表示直接创建 Pages，以满足 `pages.dev` 域名要求。已有 Pages 项目的后续部署不需要该选项。

从创建结果复制 `database_id`。将以下占位值替换为实际账号和数据库 ID：

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = '你的 Cloudflare Account ID'
$env:CLOUDFLARE_D1_DATABASE_ID = '创建 D1 后返回的 UUID'
npm run cf:deploy
```

命令构建两份产物，校对提交号及文件哈希，再生成被 Git 忽略的 `wrangler.deploy.json`，应用远程迁移，部署私有 Worker，最后发布 Pages。`wrangler.jsonc` 中全零 ID 仅用于本地开发；部署脚本拒绝缺失或全零 ID。无需手动把账号信息写进源码。

Pages 发布使用 `--cwd cloudflare/pages`，从专用配置读取服务绑定，`--branch main` 更新正式域名。Wrangler 会返回本次部署独立地址；正式入口为 Pages 项目的 `muse-bloom.pages.dev`。游戏和 API 位于同一域名，把 `/playtest/` 发给测试者即可。确认主域名的 `build.json` 与本次提交一致后，再执行一次标记为自动化的实际提交并到 D1 核对回执。

```powershell
$env:MUSE_CF_URL = 'https://muse-bloom.pages.dev'
npm run test:cloudflare-live
```

线上检查必须显式设置 HTTPS 地址。它对比已测试产物的提交号及三个页面的哈希，实际完成桌面/手机首套造型，并创建一条 `automated-check` / `automated` 反馈，再原样重试确认回执一致。报告及回执位于 `artifacts/cloudflare-live/report.json`。该脚本不读取其他参与者的反馈；管理员应按报告中的准确回执在远程 D1 核对数据库行，不能只以网页提示为成功证据。

## GitHub Actions 自动部署

已有 `Test and deploy Muse Bloom` workflow 增加了本地 D1/API/浏览器测试和部署预检。Cloudflare 部署任务仅在 `main` 全部检查通过并显式开启后运行；现有 GitHub Pages 继续独立发布。

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中配置：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | 限定到目标账号、能编辑 Cloudflare Pages、Workers Scripts 和 D1 的 API Token |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账号 ID |
| Variable | `CLOUDFLARE_D1_DATABASE_ID` | 已创建的 D1 数据库 UUID |
| Variable | `CLOUDFLARE_DEPLOY_ENABLED` | `true` |

可用 Cloudflare 的 Edit Cloudflare Workers token 模板为起点，确认包含目标账号 Pages 和 D1 编辑权限；参考官方 [CI/CD 认证说明](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)。本机交互式 OAuth 登录可完成手动部署；GitHub 自动部署需要另行创建 API Token。Token 只保存在 GitHub Secret 或本机环境变量中，不发到聊天、不放入配置文件。

最后手动运行 workflow 或推送到 `main`。部署任务下载同一轮测试生成的 `muse-bloom-cloudflare` 和 `muse-bloom-cloudflare-pages` 两个 artifact，执行 D1 迁移再依次发布私有 Worker 与 Pages，不重新构建另一个版本。尚未配置 Cloudflare 时该任务显示 skipped，测试和 GitHub Pages 发布照常进行。

## 查询和汇总反馈

在 Cloudflare **D1 → muse-bloom-feedback → Console** 中查询。不要将反馈导出文件提交到公开仓库。

最近的真人标记反馈（明确选择真人且没有模拟测试声明；这是自报类型，不是身份认证）。迁移 `0002_feedback_kind.sql` 增加 `test_type`：human / automated / unverified。旧记录默认待核实，旧自动化记录标为 automated；同一编号、版本有类型冲突时不进入真人视图。迁移不会删除反馈或改变已有回执：

```sql
SELECT submission_id, received_at, participant_id, game_version,
       clarity, readability, visuals, enjoyment, would_continue, record_json
FROM human_feedback_submissions
ORDER BY received_at DESC
LIMIT 50;
```

按匿名编号和版本去重，仅取最新评分：

```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY participant_id, game_version
    ORDER BY received_at DESC, submission_id DESC
  ) AS position
  FROM human_feedback_submissions
)
SELECT game_version, COUNT(*) AS participants,
       AVG(clarity) AS clarity, AVG(readability) AS readability,
       AVG(visuals) AS visuals, AVG(enjoyment) AS enjoyment,
       SUM(would_continue = 'Yes') AS would_continue
FROM ranked WHERE position = 1 GROUP BY game_version;
```

需要现有离线汇总工具时，将选中行的 `record_json` 分别保存成 JSON 文件到 `playtest-responses/`，运行 `npm run playtest:summary -- playtest-responses`。该目录已被 Git 忽略。游戏内表单与观察表使用同一编号，以免统计为两个人。工具只统计 `testType: human` 且没有模拟测试声明的记录；`exclusionReasons` 列出自动化、待核实和编号冲突。原始文件保持不变。不要仅凭普通 source 或评分将旧数据改为真人；应由组织者核实来源，并在留存原件后更正记录。

## 接口契约与运维

请求 JSON：`{schemaVersion:1, submissionId:UUID, consent:true, record:{version, source, testType?, participant, startedAt?, exportedAt, feedback, events}}`。`testType` 可取 human / automated / unverified；缺省只用于兼容旧客户端，不会自动视为真人。四项评分必须为 1–5，`continue` 为 Yes/Maybe/No，每段文字最多 2000 字符，最多 2000 条操作，整个请求最多 512 KiB；未声明字段不会存储。

成功返回 `201 {ok:true,receipt,receivedAt}`；原样重试返回 `200` 和原回执。同 ID 不同内容返回 409；非法数据 400、跨站来源 403、体积超限 413、类型错误 415、限流 429、数据库故障 503。错误响应不会泄露 SQL 或反馈内容。匿名提交采用每个 Cloudflare 节点每 IP 每分钟 60 次的基本限流；这不是账号认证或全局精确配额，共享网络用户共用计数。大规模公开推广前可按流量增加 Turnstile 等防刷措施。

生产首次验证应使用 `/playtest/?qa=1`，填写并提交后在 D1 找到相同回执。此时记录为 `automated-check`，不会混入上面的汇总。校验后可在管理员控制台按确定的回执删除该测试行。未执行真实 Cloudflare 发布、线上提交和 D1 查询前，不应把本地测试当成生产部署成功。

实现参考：[Pages Advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/)、[Pages Service bindings](https://developers.cloudflare.com/pages/functions/bindings/#service-bindings)、[D1 入门](https://developers.cloudflare.com/d1/get-started/)、[D1 参数绑定](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)。
