# 正式代码目录维护

本次整理只保留 Style Stories 正式实现。游戏版本仍为 2.0.5；关卡、物品 ID、评分规则、浏览器存档键、D1/R2 绑定和上传限制不随目录变化。

- `src/core` 不依赖 DOM；`src/rendering` 管理人物与服装；`src/ui` 组合两者。反馈共用模块可供浏览器和 Worker 导入。
- `scripts/build.js` 从根入口构建到 `dist/web`；Pages、游戏门户和 Astrocade 是同一游戏的平台适配包，不是独立旧版本。
- 所有当前插画在 `assets`，第三方声明在 `licenses`。修改素材应同步来源记录；禁止从被删除的 Demo 目录取资源。
- 测试、基准和合成录屏在 `tests`。测试报告和截图写入 `artifacts`，不应提交真实玩家反馈、浏览器资料或 Token。
- Cloudflare Worker 是只提供 `/api/*` 的私有服务。Pages 提供当前游戏，再通过服务绑定调用它；不再把经典版网页打包进 Worker。
- SQL 迁移和存档迁移属于正式兼容性代码，保留已有玩家和反馈数据。
- 发布与送审历史在 `docs/releases`，历史操作和产物哈希仅作审计，不代表当前线上状态。旧包可按相应 Git 提交重新生成。

日常使用 `npm start`、`npm test`、`npm run test:release`。不在源码目录保存构建文件，也不再创建 `demos`、`legacy` 或版本号命名的源码副本。新功能分支必须先向项目负责人确认。
