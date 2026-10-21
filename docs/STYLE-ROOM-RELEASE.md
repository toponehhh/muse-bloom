# The First Edit · 1.9.0-preview.1

沿用已确认的人物、马尾发型、居家场景与奶油色/柔紫色界面，提供三个完整的小主题：Café morning、Pastel hour、Gallery day。当前是 1 个角色、6 件服装、9 种搭配的独立试玩版。

## 新版行为

- 搭配符合两个提示后，保存即可收集主题；结果页可以进入下一个未完成主题。
- 自由混搭也能保存，不会错误地完成主题。重复保存同一主题的同一搭配会更新卡片。
- 自动恢复上次搭配、主题、完成进度及声音/动作偏好；Lookbook 支持一键穿回。
- Feedback 入口可直接提交评分、文字、截图和录屏，使用现有的匿名同意流程、D1 回执和私有 R2。原来主分支的附件校验与预览修复已合入。

## 发布

分支：`feat/pixi-skeletal-demo`。Cloudflare Pages 项目仍为 `muse-bloom`，新分支别名为 `style-room`，访问 https://style-room.muse-bloom.pages.dev 。旧版主域名继续服务已有玩家。此版本号独立于仓库根目录经典版的 1.8.0。

GitHub Actions 的 **Style Room preview** 先运行 `test:style` 与 `test:style-release`，保存截图和报告，再将已校验 SHA-256 的 `dist/style-room-pages` 部署。配置文件是 `cloudflare/style-room/wrangler.jsonc`，复用现有 `FEEDBACK_API` 私有服务绑定；不创建新数据库、不改变已有反馈表、不公开 R2 文件。

发布后核对 `/build.json` 中的版本和提交号，并用本地 Chromium 从实际 HTTPS 地址换装、完成三个主题及提交一条标记为 `automated-check` 的合成反馈。D1 中按返回的回执查询 `game_version`、`test_type`，以及关联的两个 R2 附件记录。

## 验证边界

本版仍采用 2D 绘制素材与共享骨骼网格，动作范围限制为呼吸、轻微头发/头部移动与自然手臂摆动。不会据此声称支持任意站姿或全部旧服装。现有回归覆盖九种搭配、四个动作时刻、六种游戏窗口、五种反馈窗口、完整主题流程及 D1/R2 集成；未完成真人试玩，未再次提交 CrazyGames 审核。

## 回退

独立预览发布不会切换正式主域名。若预览需回退，使用 GitHub 中已通过该套件的旧提交重新构建，再以 `--branch style-room` 部署，保持 `build.json` 与源提交一致；不要手改 manifest 或混用旧静态文件。
