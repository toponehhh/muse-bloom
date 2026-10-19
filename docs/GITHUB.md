# GitHub Actions 与在线试玩

仓库：[toponehhh/muse-bloom](https://github.com/toponehhh/muse-bloom)，按用户最终选择设为公开。已有 50 次分步提交历史已完整上传，后续修改继续按步骤提交。

- 游戏：[https://toponehhh.github.io/muse-bloom/](https://toponehhh.github.io/muse-bloom/)
- 试玩任务与反馈：[playtest/](https://toponehhh.github.io/muse-bloom/playtest/)
- 构建与部署：[Actions](https://github.com/toponehhh/muse-bloom/actions/workflows/verify.yml)

已将 Pages 的 Source 设置为 GitHub Actions（`build_type: workflow`），HTTPS 已启用。首次访问需等待首次部署成功。具体运行结果以 Actions 和网站的 `build.json` 为准。

## 工作流

`.github/workflows/verify.yml` 在 push、pull request 或手动运行时：

1. 执行规则、存档、前三关玩法和 36 关可解性测试。
2. 使用锁定的 Playwright / Chromium 执行人物、服装、领口、换装、照片导出、响应式、动画和音效回归。
3. 验证 CrazyGames 单文件包、离线试玩包，以及网站部署到 `/muse-bloom/` 子路径后的实际交互。
4. 保存测试报告及截图，检查美术资产可重复生成，生成 CrazyGames 上传文件和网站构建产物。
5. 仅在 `main` 分支所有检查通过后，使用官方 Pages Actions 发布网站。PR 和其他分支没有部署权限。

测试失败会阻止部署，已经上线的旧版本保持可用。发布操作按分支排队，避免中途取消部署。构建任务只有源码读取权限；部署任务使用 `pages: write` 与 `id-token: write`，通过 `github-pages` environment 发布。无需配置个人令牌作为 Actions secret。

## 网站结构

`npm run package:pages` 只在 `dist/github-pages/` 生成以下文件；发现额外文件时会拒绝打包，避免混入历史报告、源码或玩家反馈：

| 路径 | 用途 |
| --- | --- |
| `index.html` | 完整游戏，CSS、脚本和图片内嵌，不依赖根域名资源路径 |
| `playtest/index.html` | 试玩任务、试玩入口、备用反馈表 |
| `playtest/Muse-Bloom.html` | 支持独立试玩存档的完整游戏 |
| `build.json` | 游戏版本、源码提交 SHA、文件大小和 SHA-256 |

网站首页是正常游戏；`playtest/` 提供新试玩和继续试玩入口。试玩记录保存在浏览器中，反馈需玩家主动下载 JSON 后交给组织者，**不会自动发到 GitHub 或服务器**。网站访问权限与反馈存储是两回事；公开的测试链接不是带密码的私人空间。

## 仓库首次配置

使用拥有 `toponehhh` 权限的 GitHub CLI 账号。账号登录信息由 CLI 的系统凭据管理保存，不写入项目。

1. 创建 `muse-bloom` 仓库，按用户选择设置公开或私有。GitHub Free 的 Pages 需要公开仓库；私有仓库需支持 Pages 的付费套餐。
2. 将已有仓库的 `origin` 设为 `https://github.com/toponehhh/muse-bloom.git`，推送 `main`。已有远端需先核对，不覆盖未知地址。
3. 在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。也可以调用 Pages API，将 `build_type` 设置为 `workflow`。
4. 在 **Actions → Test and deploy Muse Bloom** 查看结果。首次启用 Pages 时如果构建已结束，可手动 Run workflow。

Pages API 已返回 `https://toponehhh.github.io/muse-bloom/`。只有对应 Actions 的 `deploy` job 成功才代表这一提交已经发布。

## 后续更新

```powershell
git add <这一步修改的文件>
git commit -m "描述这一阶段的修改"
git push origin main
```

推送后 Actions 自动校验并更新同一个测试地址。无需手工上传 HTML，也无需创建 `gh-pages` 分支。Actions 的 `muse-bloom-website` artifact 是网站文件，`muse-bloom-crazygames` 是门户上传产物，`ui-regression-evidence` 是测试证据。

## 本地与线上验证

```powershell
npm run test:pages
# 网站发布后，先确保本机构建对应发布的同一提交：
npm run package:pages
$env:MUSE_PAGES_URL = 'https://toponehhh.github.io/muse-bloom/'
node dev/pages.test.js
Remove-Item Env:MUSE_PAGES_URL
```

脚本验证实际页面、首套 94 分穿搭、电脑/手机布局、无缺失资源、试玩新建/继续、反馈下载和普通存档隔离。线上检查还会校对 `build.json` 的源码 SHA，避免把旧缓存版本当成新发布。报告位于 `artifacts/pages/`；自动测试不是用户满意度证据。

参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Pages REST API](https://docs.github.com/en/rest/pages/pages)。
