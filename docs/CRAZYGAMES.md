# CrazyGames 提交说明 — v1.8.0 试玩候选版

> 本页为经典版历史记录。重新提交 **Style Stories 2.0.3** 请使用 [当前提交说明](CRAZYGAMES-2.0.3.md) 和 `npm run package:style-crazygames`，不要上传本页的旧版交付物。

当前交付用于先进行私人试玩。用户已确认此前被拒绝的是 v1.6.2；拒绝文字只给出整体质量评价，没有指出具体缺陷。本次改动针对我们从实际界面发现的问题，不把推测写成平台确认的拒绝原因，也不承诺重新审核通过。

## 上传文件

运行 `npm run package:upload`，使用 `dist/crazygames-upload/index.html`。用户当前门户使用文件/文件夹上传；选择这个文件或它所在的文件夹。不要只上传源码根目录的 HTML，也不要把试玩说明页当成游戏入口。

该单文件约 1.5 MB，内嵌 CSS、JavaScript、角色、14 件精修服饰、其余矢量衣服和卧室；音效和音乐在本机合成。无需 CDN 或其他资源请求。`npm run test:upload` 对实际文件验证根路径、嵌套路径、sandbox iframe 和离线 file URL。故意只提供源码 HTML 时会重现之前的无样式启动页。

`dist/playtest-v1.8.0/` 是分享给试玩者的完整目录。它的 `index.html` 是任务和反馈说明，`Muse-Bloom.html` 才是游戏。私人分享 ZIP 可解压后使用；它不是本门户的上传格式。

## 当前功能与材料

- HTML5；单人；键鼠/触控响应式界面；英文游戏文本。
- 正常进度存于 LocalStorage `muse_bloom_save_v1`；没有游戏账号或云存档。
- 没有 CrazyGames SDK、云存档、广告或 SDK 静音支持。不要勾选已接入这些功能。
- 显式 `?playtest=1` 才启用匿名本地操作记录和独立存档。离线及 Pages 版本下载反馈；Cloudflare 版本可在同意后主动提交到 D1。正常游戏不记录试玩事件。
- 14 件首发精修服饰，三种不同开场任务；其余 108 件维持原有贴合矢量绘制。不要宣传成全部素材重制或真正 3D。
- 旧 `promo/` 封面与录像属于 v1.6 系列；重新提交前应根据最终玩法重新拍摄。

## 新版英文描述草稿

**Title:** Muse Bloom

**Description:** Muse Bloom is a cozy dress-up game about the little moments that deserve a look of their own. Choose Bella, Mika or Zoe and start with a curated 14-piece wardrobe. Dress for coffee with friends, a gallery opening and a weekend flower market, with clear occasion goals and room for your own taste. Reveal your outfit, compare before and after, and save a portrait to your style diary. Continue through 36 challenges and collect 122 pieces, including modern Chinese-inspired fashion. There is no timer, and you can restyle as often as you like.

**Controls:** Click or tap clothing to wear it; tap it again to remove it. Tap a goal for ideas and use Undo to try another combination. Select Reveal my look when ready. Select the character name to change your muse. Open Lookbook to revisit and save outfits. Settings includes optional background music, sound and the styling guide. Use Tab and Enter for buttons, and arrow keys in category tabs. A dress replaces separates; selecting a top or bottom switches back to separates.

## 官方要求与本地证据

2026-10-19 重新查看的 [Launch requirements](https://docs.crazygames.com/requirements/intro/) 说明 Basic Launch 的 SDK 可选且不能变现；Full Launch 需要完整接入。 [Technical requirements](https://docs.crazygames.com/requirements/technical/) 说明无 SDK 时总文件不超过 50 MB，进入移动首页的初始文件不超过 20 MB，文件数不超过 1,500，资源使用相对路径，并要求 Chrome/Edge 正常工作。

本地大小和自动化检查只是其中一部分证据。真人反馈、CrazyGames 线上 Preview / QA、真实手机和最终审核仍需要另行完成。没有执行本次版本的 CrazyGames 线上提交。源码已上传 GitHub；测试页面的构建和部署参见 [GitHub 说明](GITHUB.md)。

2026-10-20 对玩法和质量指南的核对、v1.8 改进及下一轮人工检查见 [QUALITY-1.8.md](QUALITY-1.8.md)。
