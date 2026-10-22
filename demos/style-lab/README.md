# Muse Bloom — Style Stories 2.0.1

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

`src/wearable-fit.mjs` registers each shoe separately to an ankle and sole, and splits rear walls from the vamp/straps around a skin layer. Shoes render below trouser/dress hems. Native SVG grip/shoulder anchors position held and crossbody bags; fingers render over handles. Bag, tote and fan all participate in the two-hand allocation.

Seven original PNGs, including three new wardrobe atlases, are preserved unchanged. Prompts live in `assets/provenance.json` and `assets/campaign-provenance.json`. Small details reuse the project's native SVG art. Items share fitted silhouettes with palette variants; these are not 122 unique painted sprites. Twelve bones provide subtle breathing/head/ponytail movement with planted feet. This is fixed-view **2D**, not 3D or a general cloth simulation.

## Test

```sh
npm test
npm run test:style
npm run test:style-release
# Only the shoe/bag regression (also included in the release gate):
npm run test:wearables
```

On Windows, run browser commands from CMD; tests launch sandboxed `C:\Tools\ugchromium\app\chrome.exe`. CI uses sandboxed Playwright Chromium. Evidence is in `artifacts/campaign/`, `artifacts/style-release/`, `artifacts/style-lab/` and `artifacts/wearable-fit/`. Full tests exercise every level, all items at four animation times, six game viewport sizes, five feedback sizes and isolated Pages → Worker → D1/R2 receipts/uploads.

The wearable gate measures rendered UV landmarks against independent anatomy fixtures and checks actual composite pixels. It covers 18 shoes × 41 bottoms/dresses, all 18 single accessories and 306 ordered pairs for hand/shoulder contacts, every handheld item in either hand with all 43 tops/dresses, crossbody contact with all those garments, four animation times, six viewports, remove/Undo/reload/reset and portrait export. Six deliberately injected alignment/occlusion faults must fail. This covers the current inventory and idle animation, not arbitrary future art or motion.

Set `MUSE_WEARABLE_URL` to the deployed origin and run `node dev/campaign-wearables.test.js` to repeat the same visual gate online without submitting feedback. Optional `MUSE_WEARABLE_ARTIFACTS` selects a separate report/screenshot folder. The report records the observed version and source commit.

For an authorized live check, set `MUSE_STYLE_URL` to the HTTPS preview origin and run `node dev/style-release.test.js`. It submits one explicitly automated record with two tiny synthetic attachments. Verify its receipt separately in remote D1/R2. These checks do not constitute human playtest or CrazyGames approval evidence.
