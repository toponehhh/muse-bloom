# CrazyGames Basic Launch 提交说明

本项目的首发目标是 **Basic Launch**。当前版本无广告、无内购、无登录、无遥测、无外部网络依赖；存档保存在当前浏览器的 `muse_bloom_save_v1`。这是一份本地交付说明，**不代表已经上传或通过平台审核**。

## 打包与上传

```sh
npm test
npm run package
```

在 CrazyGames Developer Portal 新建游戏，上传 `dist/muse-bloom-crazygames-v1.0.1.zip`。压缩包根目录是 `index.html`，所有运行时路径均为相对路径。开发脚本、测试、Git 数据、营销视频不在游戏包内。

本次成品同时准备：

| 文件 | 用途 |
| --- | --- |
| `promo/cover-landscape.png` | 1920 × 1080 横版封面 |
| `promo/cover-portrait.png` | 800 × 1200 竖版封面 |
| `promo/cover-square.png` | 800 × 800 方形封面 |
| `promo/preview-landscape.mp4` | 1920 × 1080、16.63 秒、无声、真实操作录像 |
| `promo/preview-portrait.mp4` | 1080 × 1620、16.67 秒、无声、真实操作录像 |

封面只包含游戏名，视频以对应封面开场。截图与视频展示本游戏真实角色和服装，不使用第三方品牌资产。

## 可直接使用的英文元数据

**Title:** Muse Bloom

**Short description:** Find your fashion mood. Style 36 challenges and collect 122 lovely pieces.

**Description:**

Muse Bloom is a cozy dress-up and fashion puzzle game where every outfit tells a little story. Start with a small wardrobe, match the mood of each challenge, and discover new pieces as your style grows. From a casual coffee run and campus days to Y2K looks, a red carpet moment, and modern Chinese fashion, there is always a fresh outfit to explore. Mix tops and bottoms, try a flowing dress, add your favorite shoes, and finish with two accessories. Discover hanfu-inspired layers, mamian skirts, jade details, and New Chinese style in the Silk & Jade collection. Earn S ranks to unlock secret pieces, choose from four skin tones, and save your favorite looks as beautiful outfit cards. There is no timer and no penalty for trying again. A little style. A lot of you.

**Controls:** Click or tap an item to wear it. Tap it again to remove it. Choose categories to browse your wardrobe, match the three mood tags, and select Score it! Use Tab and Enter to select controls; use the left and right arrow keys in category tabs. A dress replaces your top and bottom. You can wear two accessories.

**Suggested categories:** Dress Up, Fashion, Casual, Puzzle.

**Keywords:** dress up, fashion, aesthetic, outfit, challenge, hanfu, Chinese fashion, New Chinese style.

**Devices:** Desktop and mobile. Responsive portrait and landscape layouts. English interface.

## 核对过的官方要求

核对日期：2026-10-18。

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
