# Muse Bloom

Muse Bloom · Style Stories 是基于 PixiJS 和 DragonBones 的 H5 换装游戏，包含 36 个挑战、6 个章节和 122 件物品。当前源码版本由根目录 `release.json` 定义，包元数据同步为 **2.0.5**。

正式站点：[muse-bloom.pages.dev](https://muse-bloom.pages.dev/) · [QA 试玩](https://muse-bloom.pages.dev/?qa=1)。线上实际版本以站点 `build.json` 为准；本地构建不代表已发布。旧 `style-room` 地址仅保留跳转。

## 开发

需要 Node.js 22 或以上。浏览器平台 ZIP 打包还需要 Python 3。

```sh
npm ci
npm start                 # 构建当前正式游戏，访问 http://localhost:4173
npm run build             # 仅构建到 dist/web
npm test                  # 规则、存档兼容、36 关可解性和源码结构
npm run test:release      # 完整游戏、衣服贴合、GPU 降级、在线反馈和发布校验
npm run test:portals      # itch.io / GamePix ZIP、iframe 和窗口缩放
```

`npm start` 服务构建后的正式游戏，不再提供旧版或实验入口。修改源码后重启该命令即可重新构建。不要直接双击源码 `index.html`；页面依赖构建生成的 JS/CSS。

Windows 的浏览器测试默认使用 `C:\Tools\ugchromium\app\chrome.exe`，可用 `MUSE_BROWSER_EXECUTABLE` 指定其他可用 Chromium；Linux CI 使用 Playwright Chromium。测试保持浏览器沙箱开启。本地反馈测试使用隔离的 D1/R2，不会读取或写入生产反馈。

## 目录

| 路径 | 用途 |
| --- | --- |
| `index.html`、`release.json` | 唯一游戏入口、版本与关卡数量 |
| `src/core/` | 物品、挑战、评分、解锁、存档及历史存档迁移 |
| `src/rendering/` | Mira 骨骼、服装贴合、PixiJS / Canvas 渲染及配件绘图 |
| `src/ui/` | 当前游戏交互、布局和样式 |
| `src/feedback/` | 表单、附件、请求与服务端共用的校验规则 |
| `src/platforms/astrocade/` | Astrocade 云存档、样式及平台素材映射 |
| `assets/`、`licenses/` | 当前游戏实际使用的素材、来源记录和依赖许可 |
| `cloudflare/` | 私有反馈 API、D1 迁移、Pages 网关与旧域名跳转配置 |
| `scripts/` | 开发服务器、构建、平台打包、宣传图与反馈汇总工具 |
| `tests/` | 正式版自动回归、测试素材与接触点基准 |
| `docs/` | 当前部署说明、设计参考、QA 与平台送审记录 |
| `dist/`、`artifacts/` | 可重建的输出与测试证据，均不提交到 Git |

旧人物、经典版页面、实验 Demo 和旧版专用工具不再放在工作树中；历史源码可从 Git 提交恢复。保留的旧身份 ID、存档读取和 D1 迁移是正式版兼容逻辑，不能当作旧游戏删除。

## 打包与发布

```sh
npm run package:pages       # dist/pages：正式前端及 Pages API 网关
npm run package:feedback    # dist/feedback-service：API 源码/迁移的哈希清单
npm run package:crazygames  # dist/crazygames-style-stories-v<version>
npm run package:portals     # dist/browser-portals-v<version>.zip
npm run package:astrocade   # dist/astrocade-style-stories-v<version>
npm run cf:deploy          # 验证 main 的同提交产物，迁移 D1 并部署 Worker/Pages
```

所有打包入口均使用相同的正式源码。构建只写 `dist/`，不往源码目录生成 bundle。CrazyGames 与其他游戏门户包不包含 Cloudflare Worker、反馈数据或账号配置。Astrocade 继续使用平台云存档；它的打包器保留平台特定转换，不能直接将普通网站包上传到该沙箱。

CI 统一为 [ci.yml](.github/workflows/ci.yml)：测试 PR 和 `main`；仅 `main` 在部署配置开启时发布。提交包含 `[skip deploy]` 时只检查、不发布。部署下载本轮验证的 Pages 产物，并校验反馈源码哈希，避免前后端错配。

详见 [Cloudflare 部署与反馈](docs/CLOUDFLARE.md)、[目录维护说明](docs/STRUCTURE.md) 和 [平台历史记录](docs/releases/README.md)。没有默认授予项目的开源许可。
