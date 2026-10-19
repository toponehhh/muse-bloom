# Cloudflare 部署与在线反馈

游戏仍是 v1.7.0，本次增加在线反馈服务。使用 **Cloudflare Workers Static Assets + D1**：游戏入口 `/`，试玩与反馈页 `/playtest/`，提交接口 `POST /api/feedback`。这是一个 Worker 项目，不能只把静态文件上传到 Pages 后就期待 D1 生效。

## 已实现的行为

- 游戏内 Feedback 和试玩说明页均可提交四项评分、继续意愿、文字意见；说明页还支持设备、是否独立完成及组织者观察。
- 匿名编号与试玩存档分开保存，不要求姓名、邮箱或账号。游戏操作仅在试玩模式记录在本机；提交时明确勾选同意才上传。说明页使用同一编号时会附上本机对应的试玩操作记录。
- 草稿自动保存在当前浏览器。接口超时、断线、503 时保留提交快照，刷新后重试沿用相同 UUID；D1 主键保证同一份反馈只写一条。只有收到 D1 写入后的回执才显示提交成功。修改答案再提交会产生新版本。
- 可随时下载 JSON 备份。GitHub Pages、CrazyGames 单文件、离线试玩包继续使用下载模式，不会尝试向不存在的接口提交。
- D1 保存匿名编号、游戏版本、来源、服务器接收时间、四项分数、继续意愿和经校验的反馈/操作 JSON。接口不保存 IP、User-Agent、Cookie 或未声明字段，不提供公开读取反馈的接口。文字反馈仍可能包含用户自行填写的信息，页面已提醒勿填写个人信息。

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
npx wrangler deploy --dry-run --outdir artifacts/cloudflare-worker
```

测试使用独立临时 D1：验证并发幂等、参数校验、请求来源、大小限制、限流、数据库失败，以及手机/电脑表单、网络失败、响应丢失、刷新恢复、回执、备份和正常游戏存档隔离。所有合成反馈标记为 `automated-check`。

## 第一次部署到自己的 Cloudflare 账号

在项目根目录执行：

```powershell
npx wrangler login
npx wrangler whoami
npx wrangler d1 create muse-bloom-feedback
```

从创建结果复制 `database_id`。若账号已存在同名数据库，使用其 ID，不要重复创建。将以下占位值替换为实际账号和数据库 ID：

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = '你的 Cloudflare Account ID'
$env:CLOUDFLARE_D1_DATABASE_ID = '创建 D1 后返回的 UUID'
npm run cf:deploy
```

命令先生成被 Git 忽略的 `wrangler.deploy.json`，应用远程迁移，再部署 Worker 和静态文件。`wrangler.jsonc` 中全零 ID 仅用于本地开发；部署脚本拒绝缺失或全零 ID。无需手动把账号信息写进源码。

成功后使用 Wrangler 输出的实际 `workers.dev` 地址；可在 Cloudflare 的 Worker 设置中绑定自定义域名。游戏和 API 必须位于同一域名。把该地址下的 `/playtest/` 发给测试者即可。

## GitHub Actions 自动部署

已有 `Test and deploy Muse Bloom` workflow 增加了本地 D1/API/浏览器测试和部署预检。Cloudflare 部署任务仅在 `main` 全部检查通过并显式开启后运行；现有 GitHub Pages 继续独立发布。

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中配置：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| Secret | `CLOUDFLARE_API_TOKEN` | 限定到目标账号、能编辑 Workers Scripts 和 D1 的 API Token |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账号 ID |
| Variable | `CLOUDFLARE_D1_DATABASE_ID` | 已创建的 D1 数据库 UUID |
| Variable | `CLOUDFLARE_DEPLOY_ENABLED` | `true` |

可用 Cloudflare 的 Edit Cloudflare Workers token 模板为起点，确认包含目标账号 D1 编辑权限；参考官方 [CI/CD 认证说明](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)。Token 只保存在 GitHub Secret 或本机环境变量中，不发到聊天、不放入配置文件。

最后手动运行 workflow 或推送到 `main`。部署任务下载同一轮测试生成的 `muse-bloom-cloudflare` artifact，执行 D1 迁移再发布，不重新构建另一个版本。尚未配置 Cloudflare 时该任务显示 skipped，测试和 Pages 发布照常进行。

## 查询和汇总反馈

在 Cloudflare **D1 → muse-bloom-feedback → Console** 中查询。不要将反馈导出文件提交到公开仓库。

最近的真人标记反馈（来源是客户端提供的标签，并不证明真人身份）：

```sql
SELECT submission_id, received_at, participant_id, game_version,
       clarity, readability, visuals, enjoyment, would_continue, record_json
FROM feedback_submissions
WHERE source != 'automated-check'
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
  FROM feedback_submissions WHERE source != 'automated-check'
)
SELECT game_version, COUNT(*) AS participants,
       AVG(clarity) AS clarity, AVG(readability) AS readability,
       AVG(visuals) AS visuals, AVG(enjoyment) AS enjoyment,
       SUM(would_continue = 'Yes') AS would_continue
FROM ranked WHERE position = 1 GROUP BY game_version;
```

需要现有离线汇总工具时，将选中行的 `record_json` 分别保存成 JSON 文件到 `playtest-responses/`，运行 `npm run playtest:summary -- playtest-responses`。该目录已被 Git 忽略。游戏内表单与观察表使用同一编号，以免统计为两个人。

## 接口契约与运维

请求 JSON：`{schemaVersion:1, submissionId:UUID, consent:true, record:{version, source, participant, startedAt?, exportedAt, feedback, events}}`。四项评分必须为 1–5，`continue` 为 Yes/Maybe/No，每段文字最多 2000 字符，最多 2000 条操作，整个请求最多 512 KiB；未声明字段不会存储。

成功返回 `201 {ok:true,receipt,receivedAt}`；原样重试返回 `200` 和原回执。同 ID 不同内容返回 409；非法数据 400、跨站来源 403、体积超限 413、类型错误 415、限流 429、数据库故障 503。错误响应不会泄露 SQL 或反馈内容。匿名提交采用每个 Cloudflare 节点每 IP 每分钟 60 次的基本限流；这不是账号认证或全局精确配额，共享网络用户共用计数。大规模公开推广前可按流量增加 Turnstile 等防刷措施。

生产首次验证应使用 `/playtest/?qa=1`，填写并提交后在 D1 找到相同回执。此时记录为 `automated-check`，不会混入上面的汇总。校验后可在管理员控制台按确定的回执删除该测试行。未执行真实 Cloudflare 发布、线上提交和 D1 查询前，不应把本地测试当成生产部署成功。

实现参考：[Workers 静态资源](https://developers.cloudflare.com/workers/static-assets/)、[D1 入门](https://developers.cloudflare.com/d1/get-started/)、[D1 参数绑定](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)。
