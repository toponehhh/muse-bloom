# UI regression — fitted cast and unobstructed stage

Run `npm ci`, then the browser scripts in README. Windows uses installed Edge by default; set `MUSE_BROWSER_CHANNEL=chrome` for Chrome. CI uses Playwright Chromium. All suites except `test:browser` start their own temporary local server. The full journey needs `npm start` first.

## New character suite: `npm run test:ui`

- 3 × 122 actual item equip/remove pairs. Every selected garment must change rendered pixels; every removal retains the mounted character and paints a nonempty body.
- Three distinct raster hashes, body opacity and true transparent background / leg gap.
- 60 pixel coverage checks for trousers, shorts and closed shoes across all three bodies. A deliberately shifted garment must fail the coverage threshold.
- Empty-sprite negative control; retired body directory and old face/body/hand/hairstyle renderers must be absent.
- 24 reviewed 360 × 640 canvas baselines: each character in basics, separates, shorts, trousers, skirt, gown, Chinese-inspired clothing and two handhelds. Comparison tolerates at most 0.6% pixels with channel difference >20 for cross-browser antialiasing; current measured ratios are in reports.
- Switching characters retains equipped clothing; reload restores the chosen identity.
- Seven viewports from 320 × 568 to 1440 × 900: visible selector choices, accessible score action, no horizontal overflow, dialog keyboard selection and Escape close.

`npm run test:ui:update` explicitly records new baselines. Inspect them before committing. The older vector-body anatomy/accessory test files and their 60 old screenshots were removed, rather than retaining tests for artwork no longer shipped. The `test:anatomy` and `test:accessories` aliases run the new character suite.

## Full fitting suite: `npm run test:fitting`

- 3 characters × 82 garments = 246 pixel checks against the actual painted bodies. Includes all tops, long/short sleeves, all dresses, skirt hips, pants, shorts and shoes. The lavender basics are also detected by colour so exposed straps or shorts cannot hide behind a skin-only test.
- The arm/hip gap is measured separately, so skirts need not cover bare hands and sleeveless pieces need not cover arms. Open sandals intentionally expose parts of the feet. Covered regions allow at most 0.3% antialiasing misses and at most 3 consecutive pixels at the 360×640 test resolution.
- Independent waist/hip ease and calf-width limits reject excessively wide or pinched fits. Test probes are separate from the renderer's authored paths.
- All 23 × 21 × 3 = 1,449 top/bottom combinations check the waist seam by combining cached rendered alpha masks. This is a seam test, not a claim that every combination has a reviewed screenshot.
- Nine viewports (320×568, 375×667, 390×844, 667×375, 768×1024, 1024×540, 1024×768, 1440×600, 1440×900) × three characters check that the selector is structurally outside the stage, never intersects it or the projected shoe region, and leaves score/character actions reachable.
- Shifted trousers, a narrowed skirt, an oversized top and a selector deliberately placed over the stage must be detected as failures.
- All 27 viewport/character cases also project the complete head into screen space and reject collisions with the brief, wardrobe or character dock. The brief must be readable above the stage. A recreated floating brief at the old position must collide with the head and be detected.
- Reports and whole-screen captures are under `artifacts/fitting`. Actual pixel tests cover fitting regions, while screenshot review covers overall appearance.

## Neckline contact suite: `npm run test:neckline`

- 43 tops/dresses × 3 painted characters = 129 checks at native 720×1280 resolution. The first opaque neckline row is compared with the actual neck boundaries in the base sprite, independently of authored garment paths. Allowed total seam ease: −10 to +16 px; centering tolerance: 6 px.
- The upper neck remains visible. Crew/collared openings expose skin below the neck root; intentionally standing collars use their own opening allowance. The lavender basic straps must be covered with no more than two antialiasing pixels at the shoulder edge.
- Negative fixtures reproduce the old broad neckline and a garment extending onto the chin. Both must fail for every character.
- Three enlarged sheets capture every neckline in `artifacts/neckline`; these complement the existing 24 full-body baselines. Pixel assertions test geometry/coverage, while humans review the art itself.

## Retained suites

- `npm test`: 14 rule/save tests plus all 36 levels solvable at 94 points. Includes legacy skin-only saves mapped to a new character without losing progress, unlocked items or outfits, plus identity roundtrips and invalid IDs.
- `test:lookbook`: actual 1080 × 1920 download, exact restored outfit/identity, best look, legacy progress, keyboard focus and mobile gallery.
- `test:upload`: unstyled missing-script negative control; self-contained root, nested mobile, sandboxed iframe and file:// startup, outfit changes and saved selection; no asset requests.
- `test:glam`: decoded playable homepage artwork, seven responsive page layouts, 4.5:1 wardrobe text contrast with a low-contrast negative control.
- `test:experience`: nine distinct synthesized PCM effects, gesture unlock, mute/resume races, hidden-page suspension, idle breathing, reduced motion and rapid toggles.
- `test:browser`: full 36-level real-input journey, 122 earned pieces, seven hidden rewards, touch, offline card export and denied/corrupt storage.

Reports are under `artifacts/{characters,fitting,glam,lookbook,upload,experience}` plus `artifacts/browser-report-msedge.json`. Whole-page screenshots are manually inspected; they are not represented as automatic whole-page pixel tests. Browser emulation does not replace real iOS/Safari or CrazyGames platform QA.
