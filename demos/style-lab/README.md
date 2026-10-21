# Muse Bloom — Style Stories 2.0

The accepted Mira illustration, ponytail and warm room now support the complete **36-challenge, six-chapter, 122-item campaign**. Scoring and progression reuse the classic game's rules. See [release notes](../../docs/STYLE-ROOM-RELEASE.md) for save compatibility, art provenance, validation and deployment.

## Run

```sh
npm ci
npm run demo:style
```

Open **http://127.0.0.1:4182/demos/style-lab/campaign.html**. Gameplay begins immediately; follow the brief, style a look and reveal its score. The map unlocks sequentially; Lookbook stores each challenge's best outfit. Sound is opt-in; motion respects reduced-motion preferences and can be paused.

The old three-mood capsule remains at `index.html` as a fitting regression reference. It is not the Cloudflare entry. `npm run build:style` builds both entries into `dist/style-lab/`; use `campaign.html` for the complete game. All graphics/runtime assets load locally without a CDN.

`npm run package:style-pages` produces the allowlisted **`dist/style-room-pages/`**, whose `index.html` is the complete campaign with online feedback. GitHub Actions deploys this exact tested artifact to **https://style-room.muse-bloom.pages.dev** after a feature-branch push. Check `build.json` for the deployed version and source commit.

## Rendering

`src/campaign-state.mjs` adapts original rules/saves. `src/campaign-art.mjs` maps all 122 item records to fitted templates and bone-anchored details. `src/campaign-renderer.js` combines PixiJS 8.22.0 and the DragonBones skeleton from `src/rig.mjs`; all layers share anatomical weights. `src/campaign.js` owns the UI.

Seven original PNGs, including three new wardrobe atlases, are preserved unchanged. Prompts live in `assets/provenance.json` and `assets/campaign-provenance.json`. Small details reuse the project's native SVG art. Items share fitted silhouettes with palette variants; these are not 122 unique painted sprites. Twelve bones provide subtle breathing/head/ponytail movement with planted feet. This is fixed-view **2D**, not 3D or a general cloth simulation.

## Test

```sh
npm test
npm run test:style
npm run test:style-release
```

On Windows, run browser commands from CMD; tests launch sandboxed `C:\Tools\ugchromium\app\chrome.exe`. CI uses sandboxed Playwright Chromium. Evidence is in `artifacts/campaign/`, `artifacts/style-release/` and `artifacts/style-lab/`. Full tests exercise every level, all items at four animation times, six game viewport sizes, five feedback sizes and isolated Pages → Worker → D1/R2 receipts/uploads.

For an authorized live check, set `MUSE_STYLE_URL` to the HTTPS preview origin and run `node dev/style-release.test.js`. It submits one explicitly automated record with two tiny synthetic attachments. Verify its receipt separately in remote D1/R2. These checks do not constitute human playtest or CrazyGames approval evidence.
