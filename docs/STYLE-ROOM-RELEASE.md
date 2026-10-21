# Style Stories · 2.0.0

沿用已确认的 Mira 人物、马尾发型、居家场景和奶油/柔紫界面，将原来的完整游戏规则接入新绘图层：**36 关、6 章、122 件物品**。

## 完整游戏

- 前三关沿用原有情境目标：完整穿搭 40 分，两个细节各 27 分。第四关起按必选标签、加分标签及装备槽位计分，最高 94 分；S/A/B/C/D 与经典版一致，35 分通过。
- 关卡地图、章节入场礼物、通关奖励、三次不同关卡 S 评价奖励、最佳分数和最佳搭配均复用 `js/data.js`、`js/game.js`、`js/edit.js`。没有用另一套简化评分代替原系统。
- 衣柜包含全部物品，未解锁款式显示条件。点击目标可筛选相关单品。衣服重复点击保持穿着，切换连衣裙/上下装自动补齐基础服装；发饰和配件可取消。
- Lookbook 按关卡保存最佳搭配，支持穿回和下载全身图片。进度、搭配、声音和动作偏好本机保存。新存档键为 `muse-style-room-campaign-v2`；同源存在经典版存档时导入原关卡成绩，不覆盖经典存档。不同域名之间的 localStorage 不会自动同步。
- Feedback 保留在线评分、文字、截图、录屏、同意确认与提交回执。最多 3 个附件、合计 30 MB；图片每个 5 MB、视频每个 20 MB。D1 保存反馈，附件进入现有私有 R2。测试者主动提交前不会上传。

## 美术和动作

七张原始 PNG 均为本项目通过内置 ImageGen 生成的原创素材；三张新增图集的完整描述见 `demos/style-lab/assets/campaign-provenance.json`。原始像素保留，裁切、配色、连续网格贴合在运行时完成。细小发饰、包和首饰使用原有项目的 SVG 形状，锚定新人物骨骼。

全部 122 件物品使用新人物适配层；衣服复用适配后的版型并以原有颜色区分，并非 122 张独立绘制的图片。Mira 使用 12 根骨骼、共享服装权重与轻微呼吸/头发动作，仍为 2D 网格动画。当前范围不包含自由视角 3D、任意大幅动作或多角色切换。

## 本地验证

```sh
npm test
npm run test:style
npm run test:style-release
```

`test:style-release` 包含：全部 36 关经真实 Reveal/Next 控件完成；122 件物品在四个动画时刻进行 4,880 个身体/衣物接点采样；六种桌面/手机/横屏尺寸；最高分、奖励、重试、存档和 Lookbook；五种反馈窗口；隔离的 Pages → Worker → D1/R2 附件上传、大小限制、同意、失败重试及幂等性。规则测试还校验经典存档导入与不可用存储。

报告和各版型截图位于 `artifacts/campaign/`，反馈报告位于 `artifacts/style-release/`，小衣柜回归报告位于 `artifacts/style-lab/`。像素采样验证覆盖与有限坐标，不代替人工审美或任意两件配件组合的验证。没有真人试玩结果，也没有再次提交 CrazyGames 审核。

## 发布与回退

分支：`feat/pixi-skeletal-demo`。Cloudflare Pages 项目 `muse-bloom`，分支别名 `style-room`，访问 **https://style-room.muse-bloom.pages.dev**。版本独立于经典版根目录 `package.json` 的 1.8.0；原主域名仍服务经典版。

GitHub Actions **Style Room preview** 运行规则、穿搭和反馈测试，上传证据，再部署经过 SHA-256 校验的 `dist/style-room-pages`。入口为完整 campaign，配置 `cloudflare/style-room/wrangler.jsonc`；复用现有私有 `FEEDBACK_API` 服务，不新增数据库或公开 R2。

发布后核对 `/build.json` 的版本、36/122 内容计数与源提交号。设置 `MUSE_STYLE_URL` 后运行 `node dev/style-release.test.js`，从实际 HTTPS 地址完成前三关并提交一条明确标记 `automated` 的合成反馈；远端 D1 按回执查版本与两个附件记录，R2 核对文件长度/哈希后才能报告实际入库成功。

回退时从已通过测试的旧提交重新构建并以 `--branch style-room` 发布，保留 manifest 与源提交的一致性；不要混合旧静态文件或手改哈希。
