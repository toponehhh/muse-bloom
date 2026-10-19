# CrazyGames Basic Launch 提交说明

本项目的首发目标是 **Basic Launch**。当前版本无广告、无内购、无登录、无遥测、无外部网络依赖；存档保存在当前浏览器的 `muse_bloom_save_v1`。这是一份本地交付说明，**不代表已经上传或通过平台审核**。

## 打包与上传

```sh
npm test
npm run package:upload
npm run test:upload
```

在 CrazyGames Developer Portal 的文件/文件夹上传入口中，上传 **`dist/crazygames-upload/index.html`**。如果需要选择文件夹，就选择 `dist/crazygames-upload`。确认上传列表的入口是 `index.html`。该文件已内嵌 CSS、JavaScript、图标、矢量素材和卧室背景，不需要其他文件。当前版本为 **v1.3.0 Bedroom Studio**，更新卡通角色、卧室场景、粉白界面、动画和原创音效；人物贴合、评分规则和存档键保持兼容。

此前直接上传 ZIP 的说明不适用于用户当前的入口。`npm run package` 仍生成多文件 ZIP，供备份和其他静态托管使用。若使用多文件形式，须先解压，再保留相同层级上传 `index.html`、`css/`、`js/` 和 `assets/`；源码中的 `index.html` 不能单独上传。

如果 Preview 只显示无样式的 “Muse Bloom / Your wardrobe is waking up…”：这表示入口 HTML 已打开，但样式和脚本未正常工作，常见原因是资源缺失、目录层级变化或请求被阻止。不能仅凭截图确认具体状态码。本地已通过故意缺少 CSS/JS 重现该画面；提供的线上预览地址因浏览器管理策略无法读取，因此尚未确认线上实际失败的请求。优先使用上面的单文件版创建新构建并重新 Preview；若仍失败，在浏览器开发者工具 Console / Network 中检查首个错误。

本次成品同时准备：

| 文件 | 用途 |
| --- | --- |
| `promo/cover-landscape.png` | 1920 × 1080 横版封面 |
| `promo/cover-portrait.png` | 800 × 1200 竖版封面 |
| `promo/cover-square.png` | 800 × 800 方形封面 |
| `promo/preview-landscape.mp4` | 1920 × 1080、约 18 秒、无声、真实操作录像 |
| `promo/preview-portrait.mp4` | 1080 × 1620、约 18 秒、无声、真实操作录像 |

封面只包含游戏名，视频以对应封面开场。截图与视频展示本游戏真实角色和服装，不使用第三方品牌资产。

## 可直接使用的英文元数据

**Title:** Muse Bloom

**Short description:** Style 36 fashion challenges, collect 122 pieces and create your personal lookbook.

**Description:**

Muse Bloom is a dress-up and fashion puzzle game set in a cozy bedroom studio. Style an original cartoon character with a playful pink wardrobe, little sparkles and soft sound effects. Match each brief, discover new pieces and build a lookbook that reflects your point of view. Explore 36 challenges across six collections, from everyday outfits and Y2K style to red carpet looks and modern Chinese fashion. Mix tops and bottoms, choose a dress, find the right shoes and finish with two accessories. Collect 122 pieces, including hanfu-inspired layers, mamian skirts and jade details. Earn S ranks to uncover secret items. Your best completed looks are saved with their outfits and skin tones, ready to revisit, restyle or download as portrait cards. There is no timer and no penalty for trying again. Every look. Entirely you.

**Controls:** Click or tap an item to wear it. Tap it again to remove it. Browse the categories, match the three mood tags and select Reveal your look. Open Lookbook to revisit a completed outfit, restyle it or save a portrait. Use Tab and Enter to select controls and the left and right arrow keys in category tabs. A dress replaces your top and bottom. You can wear two accessories.

**Suggested categories:** Dress Up, Fashion, Casual, Puzzle.

**Keywords:** dress up, fashion, aesthetic, outfit, challenge, hanfu, Chinese fashion, New Chinese style.

**Devices:** Desktop and mobile. Responsive portrait and landscape layouts. English interface.

## 核对过的官方要求

核对日期：2026-10-19；上传形式结合用户当前门户实际反馈修正。

- [Launch requirements](https://docs.crazygames.com/requirements/intro/)：Basic Launch 的 SDK 可选、广告变现不可用；Full Launch 需要 SDK 及相应完整接入。
- [Technical requirements](https://docs.crazygames.com/requirements/technical/)：无 SDK 时总文件上限 50 MB，移动首页初始下载上限 20 MB，文件上限 1,500，使用相对路径，支持 Chrome/Edge。
- [Game covers](https://docs.crazygames.com/requirements/game-covers/)：需要横、竖、方三张封面，以及横竖预览视频；视频 15–20 秒、无声、最大 50 MB。

## 发布前仍需在平台完成

1. 使用开发者账号上传，在 CrazyGames Preview 中进行平台实际验收。
2. 确认英文名称、封面与描述符合平台审核要求；商标检索未在本次开发中进行。
3. 在真实 iPhone/iPad/Safari 上验收音频恢复、触控、分享卡长按保存；桌面 Chromium 的手机尺寸模拟不等于真机测试。
4. 获准进入 Full Launch 后，再接入 SDK、游戏开始/停止事件、平台静音设置、云存档及广告。当前版本没有宣称完成这些接入。

## 验证入口

- `npm test`：纯函数规则与存档测试，以及逐关可解性、数量、标签分布校验。
- `dev/browser.test.js`：通过实际界面完成 36 关，验证互斥、解锁、存档、下载、手机尺寸和 iframe。需要 Playwright 及已安装浏览器，见 README。
- `dev/performance.js`：记录受限网络与 CPU 下的启动结果，性能数据只代表该测试配置。
- `dev/iframe.html`：本地 iframe 宿主页。
- `docs/QA.md`：本次实际测试结果与边界。

## 重新生成营销素材

启动本地服务后，执行 `node dev/make-promo.js`。设置 `MUSE_PLAYWRIGHT` 指向 Playwright 模块、`MUSE_FFMPEG` 指向 FFmpeg 可执行文件。工具使用独立浏览器上下文录制，录像保持真实操作时序；这些开发工具不进入游戏包。
