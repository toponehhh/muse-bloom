# GitHub 上传准备

根据当前要求，仅准备本地 Git 仓库，**没有创建远端仓库，也没有推送**。所有开发阶段均保留独立提交。

## 使用 GitHub CLI 新建私有仓库

在项目根目录运行：

```powershell
git status
git log --oneline
gh repo create muse-bloom --private --source . --remote origin --push
```

该命令会创建仓库并上传当前已有提交。请在决定上传时自行执行。需要已经登录 GitHub CLI。

## 使用已存在的空仓库

```powershell
git remote add origin https://github.com/YOUR_ACCOUNT/muse-bloom.git
git push -u origin main
```

将 `YOUR_ACCOUNT` 替换为实际账号。若已有 `origin`，先运行 `git remote -v` 核对地址，再决定是否修改，不要重复添加或覆盖未知远端。

## 自动校验

`.github/workflows/verify.yml` 会在 push、pull request 或手动触发时：

1. 执行规则和存档测试，验证 36 关都能拿到 S。
2. 安装锁定版本的 Playwright，执行 122 件衣服的穿脱、覆盖、缩略图边界、60 张视觉基准和移动端交互测试。
3. 运行单文件上传回归：空资源目录、嵌套 URL、手机尺寸、iframe、离线文件与缺失资源反例。
4. 保存 UI / 上传报告、截图及失败差异图，核对 SVG 与嵌入数据是否可重复生成。
5. 生成分文件备份 ZIP、单文件试玩版及 `crazygames-upload/index.html`，并保存为 Actions artifact；门户文件上传使用其中的单文件 index.html。

工作流仅有仓库读取权限，不部署 GitHub Pages，也不自动提交到 CrazyGames。另一个正常进度 36 关通关脚本 `npm run test:browser` 需要单独启动本地服务后执行；测试命令和边界见 `UI-TESTS.md`。目前仅完成本地验证，尚未执行远端 GitHub Actions。

本地提交使用项目作者名 `Muse Bloom Developer`。可以在新增个人提交前设置仓库级别的 `git config user.name` / `git config user.email`；未修改用户全局 Git 设置。
