# UI regression — painted character release

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

## Retained suites

- `npm test`: 14 rule/save tests plus all 36 levels solvable at 94 points. Includes legacy skin-only saves mapped to a new character without losing progress, unlocked items or outfits, plus identity roundtrips and invalid IDs.
- `test:lookbook`: actual 1080 × 1920 download, exact restored outfit/identity, best look, legacy progress, keyboard focus and mobile gallery.
- `test:upload`: unstyled missing-script negative control; self-contained root, nested mobile, sandboxed iframe and file:// startup, outfit changes and saved selection; no asset requests.
- `test:glam`: decoded playable homepage artwork, seven responsive page layouts, 4.5:1 wardrobe text contrast with a low-contrast negative control.
- `test:experience`: nine distinct synthesized PCM effects, gesture unlock, mute/resume races, hidden-page suspension, idle breathing, reduced motion and rapid toggles.
- `test:browser`: full 36-level real-input journey, 122 earned pieces, seven hidden rewards, touch, offline card export and denied/corrupt storage.

Reports are under `artifacts/{characters,glam,lookbook,upload,experience}` plus `artifacts/browser-report-msedge.json`. Whole-page screenshots are manually inspected; they are not represented as automatic whole-page pixel tests. Browser emulation does not replace real iOS/Safari or CrazyGames platform QA.
