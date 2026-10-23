# Cloudflare 部署与在线反馈

当前正式发布系列为 **Style Stories 2.0.4**，从 `main` 部署到 **https://muse-bloom.pages.dev**：游戏入口 `/`，QA 入口 `/?qa=1`，游戏内 Feedback 提交到 `POST /api/feedback`。`/playtest/` 跳转到当前 QA 游戏；旧 `style-room` 别名跳转主站。实际线上版本以网站的 `build.json` 和部署记录为准。

## 部署结构

- Pages 项目 `muse-bloom` 提供 `https://muse-bloom.pages.dev`。静态文件来自 `dist/style-room-pages`（保留的内部构建目录名），`_routes.json` 只将 `/api/*` 交给 Pages Function。
- Pages Function 通过 `FEEDBACK_API` 服务绑定调用私有 Worker `muse-bloom`。原始 URL、Origin、方法和请求体原样传递，浏览器不跨域。
- 私有 Worker 使用 `DB` 绑定连接 D1 `muse-bloom-feedback`，保留原生 `FEEDBACK_RATE_LIMIT`。Workers 的 `workers_dev` 和 `preview_urls` 都关闭，公开入口只有 Pages。
- 私有 Worker 使用 `FEEDBACK_FILES` 绑定访问 R2 `muse-bloom-feedback-files`。截图和录屏没有公开下载 URL；Pages 不直接暴露存储桶。
- Pages 当前不支持原生限流绑定，因此采用官方支持的 [Pages Service bindings](https://developers.cloudflare.com/pages/functions/bindings/#service-bindings)，不把限流降级为单个进程的内存计数。
- `cloudflare/pages/wrangler.jsonc` 管理 Pages，根目录 `wrangler.jsonc` 管理私有 Worker。账号 ID、真实 D1 ID 和凭据不提交到源码。

## 已实现的行为

- 当前游戏内 Feedback 可提交四项评分、继续意愿、文字意见。经典版独立说明页保留在历史离线构建中，线上链接进入同一新版游戏。
- 表单可选填截图或录屏，支持预览、移除、逐文件上传进度及取消。文件全部确认后才写入最终反馈并显示回执、关闭弹窗，具体限制和恢复方式见下方“截图与录屏附件”。
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

命令构建当前 `dist/style-room-pages` 和反馈服务 `dist/cloudflare` 两份产物，校对提交号及文件哈希，再生成被 Git 忽略的 `wrangler.deploy.json`，应用远程迁移，部署私有 Worker，最后发布 Pages。可先运行 `node dev/cloudflare-command.js verify-deploy` 只校验不部署。`wrangler.jsonc` 中全零 ID 仅用于本地开发；部署脚本拒绝缺失或全零 ID。无需手动把账号信息写进源码。

Pages 发布使用 `--cwd cloudflare/pages`，从专用配置读取服务绑定，`--branch main` 更新正式域名。Wrangler 会返回本次部署独立地址；正式入口为 Pages 项目的 `muse-bloom.pages.dev`。游戏和 API 位于同一域名，把 `/playtest/` 发给测试者即可。确认主域名的 `build.json` 与本次提交一致后，再执行一次标记为自动化的实际提交并到 D1 核对回执。

```powershell
$env:MUSE_STYLE_URL = 'https://muse-bloom.pages.dev'
node dev/style-release.test.js
```

线上检查必须显式设置 HTTPS 地址并获得实际测试提交授权。当前脚本完成前三关、存档恢复和反馈附件提交，创建明确标记 `automated` 的合成记录；报告及回执位于 `artifacts/style-release-live/`。该脚本不读取其他参与者的反馈；管理员应按报告中的准确回执在远程 D1 核对数据库行，不能只以网页提示为成功证据。只检查 UI 时拦截 API 写请求，不运行这一实际提交流程。

## GitHub Actions 自动部署

`Test and deploy Muse Bloom`（`style-lab.yml`）在 `main` 的当前游戏、D1/API 和浏览器检查通过后发布正式站，再将旧试玩别名设为跳转。经典 `verify.yml` 只回归和保存历史产物，已停止 Cloudflare 和 GitHub Pages 自动部署，避免旧页面覆盖新版。`[skip deploy]` 提交仅检查，不发布。

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

## 截图与录屏附件

### 限制与使用方式

在线试玩页 `/playtest/` 和游戏内 Feedback 使用同一套上传表单。最多 3 个附件，合计不超过 30 MB；图片每张不超过 5 MB，视频每段不超过 20 MB。这里 1 MB = 1024 × 1024 字节。图片支持 PNG/JPEG/WebP，录屏支持 MP4/WebM/MOV；其他格式应先转换。视频是否能在浏览器预览还取决于其编码，上传校验不进行视频转码。

用户必须勾选同意后再提交，选择文件本身不会上传。界面提醒检查截图和录屏中的个人信息。可先预览、移除附件，提交时显示逐文件进度并允许取消。文件保存在私有 R2，只供项目团队读取。

草稿只保存附件元数据，不把文件内容放进 localStorage。刷新后已确认上传的文件可复用，未上传文件需重新选择，页面会提示；选择同一个文件会通过 SHA-256 匹配恢复，不增加重复附件。修改答案或附件会产生新提交，已提交附件如需再次使用也应重新选择。JSON 备份只含附件信息，不包含原始文件或上传凭据；测试者应自行保留原文件。离线、GitHub Pages 和 CrazyGames 构建继续只导出 JSON，不展示不可用的上传控件。

### 首次配置 R2

先用 `npx wrangler r2 bucket list` 检查，再创建专用桶：

```powershell
npx wrangler r2 bucket create muse-bloom-feedback-files
```

保持存储桶的 Public Development URL 和自定义域名关闭，无需开放 CORS。`wrangler.jsonc` 已包含 `FEEDBACK_FILES` 绑定和每小时运行的清理 Cron。生产发布仍运行 `npm run cf:deploy`，它会先应用 `0003_feedback_attachments.sql`，再发布 Worker 与 Pages。存储桶必须先创建；部署脚本不静默创建或公开存储资源。

GitHub Actions 复用已创建的桶，原有账号、D1 ID 和 token 配置保持不变。若使用的 token 无权访问目标 R2 资源，需在该账号权限中增加 **Workers R2 Storage: Edit**；仅操作对象的 R2 S3 凭据不能替代部署 Worker 的 Cloudflare API Token。不要把 token 写入代码或反馈表单。

### 数据和接口

原来的纯 JSON `POST /api/feedback` 仍兼容。附件流程使用同源接口：

1. `POST /api/feedback/uploads`：提交原有反馈 JSON，并增加 `uploadToken`（随机 UUID）和 `attachments` 数组。每项为 `{id:UUID,name,type,size,sha256}`。服务端验证答案、同意状态和大小，保存上传批次，返回 `uploaded` ID 数组及 `expiresAt`。上传 token 在 D1 只保存哈希。
2. `PUT /api/feedback/uploads/{submissionId}/{attachmentId}`：请求体为原始文件，`Authorization: Bearer <uploadToken>`，`Content-Type` 为清单中的类型。服务端限制实际读取字节数，检查格式签名、精确大小和 SHA-256，再写入 R2 和附件元数据。R2 对象使用 `feedback/{submissionId}/{attachmentId}.{ext}`，用户文件名不会组成对象路径。
3. `POST /api/feedback`：发送同一份 JSON。仅全部附件确认后才写入最终评分和 `record_json.attachments`，并原子标记上传批次已提交。成功回执和原样重试语义与原接口相同。未完成附件返回 409，不显示提交成功。

单文件上传可等待最多 5 分钟。失败或取消后，可使用同一批次重试；已确认的文件不会重复上传。响应丢失时继续使用同一回执。会话有效期 24 小时，过期返回 410，客户端保留答案并在再次提交时开启新批次。

`feedback_upload_batches` 保存批次/过期时间，`feedback_attachments` 保存 R2 键、原文件名、类型、字节数、校验和和上传时间。最终反馈中的附件元数据与回执关联。没有公开读取反馈或文件的接口。

### 查看附件与清理

在 D1 控制台查询最终提交的附件：

```sql
SELECT s.submission_id, s.received_at, s.participant_id, s.test_type,
       a.original_name, a.content_type, a.size_bytes, a.object_key, a.sha256
FROM feedback_submissions s
JOIN feedback_attachments a ON a.submission_id = s.submission_id
JOIN feedback_upload_batches b ON b.submission_id = s.submission_id
WHERE b.committed_at IS NOT NULL
ORDER BY s.received_at DESC
LIMIT 100;
```

用 `object_key` 在 Cloudflare R2 控制台的 `muse-bloom-feedback-files` 桶中查找并下载；也可用已授权的 Wrangler：

```powershell
npx wrangler r2 object get "muse-bloom-feedback-files/feedback/回执UUID/附件UUID.png" --remote --file "artifacts/feedback-shot.png"
```

每小时清理最多 100 个未提交且已过期超过一天的批次，连同 R2 对象和附件元数据一起删除。因此中断的附件通常在创建 48–49 小时后清除；大量积压时需要后续轮次。已完成的反馈文件不自动过期。管理员如需删除已完成反馈，应按确切回执先删除 R2 对象，再删除对应附件/批次及反馈行；单独删除 D1 评分不会自动删除 R2 文件。

上传会话另有每 IP、每 Cloudflare 节点每分钟 6 次的限制，所有反馈请求仍共用每分钟 60 次限制。这是匿名接口的基础防刷，不是全局存储配额；面向大规模公开流量前应按实际用量配置告警或引入 Turnstile。

### 验证

```powershell
npm run test:feedback-api
npm run test:feedback-attachments
npm run test:feedback-upload-ui
npm run test:cloudflare-pages
```

附件服务测试使用独立的临时 D1/R2，覆盖大小边界、实际流式超限、类型伪造、校验和错误、跨站请求、错误 token、部分上传、R2 成功而 D1 失败、并发重试、过期清理与已提交对象保留。Pages 套件还通过真实服务绑定重跑附件 API。UI 测试生成可播放的短 WebM，验证手机选择/预览/移除、缺失文件补选、响应丢失恢复及窄屏操作按钮，报告写入 `artifacts/feedback-uploads/`。这些本地/CI 测试不能代替生产 R2 和 D1 核对。

线上验证使用 `/playtest/?qa=1`，仅提交明确标记为自动化测试的截图或录屏；按回执核对 D1 及 R2 大小和校验和。实现参考：[R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)。
