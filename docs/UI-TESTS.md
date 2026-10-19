# Current UI regression contracts — v1.7.0

All tests operate on real browser rendering or actual pixels, not just asset names. Reports live in `artifacts/`; they are automated evidence, saved locally or as Actions artifacts. See `QA.md` for which browser ran each suite. Mobile dimensions are emulated desktop viewports, not physical-phone testing.

| Command | Contract |
|---|---|
| `npm test` | 14 save/scoring tests, six starter-occasion/guide/legacy-save tests and 36 achievable 94-point solutions |
| `npm run test:ui` | `salon.test.js`: complete all 36 via clicks, three different starter tasks, 366 equip/remove pairs (122 × three bodies), stable mounted base, before/after, 1080×1920 portrait, isolated feedback export |
| `npm run test:fitting` | 246 actual garment/body masks; 1449 top/bottom waist pairs; offset trousers, narrow skirt and oversized top negative fixtures |
| `npm run test:neckline` | 43 tops/dresses × three painted bodies; neck-root contact, visible necks and covered basic straps; old wide collar and chin-covering negative fixtures |
| `npm run test:glam` | Seven viewports across home, studio, result, collection, lookbook, challenges and settings; missing-image and low-contrast failures detected |
| `npm run test:lookbook` | Saved identity/outfit, actual PNG download, keyboard Enter/Escape and focus restoration, old progression without invented outfits, 12-look gallery across four sizes |
| `npm run test:experience` | Real Web Audio analyser plus nine offline PCM effects; no pre-gesture audio, mute/resume race, background suspension, reduced motion, animated reveal and no-Web-Audio fallback |
| `npm run test:upload` | Built single HTML at root, nested path, sandbox iframe and file URL; no external asset request; source-only upload intentionally fails |
| `npm run test:playtest` | Delivered offline guide launches game; new/continue preserves session; backup form downloads; synthetic records exercise deduplication/missing values/automation exclusion and are deleted |
| `npm run test:pages` | Published file allowlist/hashes, source commit, actual first outfit at 1440px and 390px under `/muse-bloom/`, embedded resources, feedback guide/popups/download/reload/continue and regular-save isolation; `MUSE_PAGES_URL` runs the same smoke checks against a deployed site |

## Layout acceptance

`salon.test.js` tests 320×568, 375×667, 390×844, 667×375, 768×1024, 1024×540, 1024×768, 1440×600 and 1440×1000 with each character. It measures transformed SVG head/foot rectangles against stage and control bounds. Deliberately covering the head or feet must fail, and removing the obstruction must recover.

Small phones scroll vertically so the whole avatar can stay at least 260px tall. The reveal button must be reachable and unclipped; the test does not falsely require every control to fit on the initial viewport. The character picker is a dialog, not the removed permanent dock. The full collection wraps; only the fitting wardrobe uses a horizontal mobile carousel.

## Pixel acceptance and visual review

The body/waist/neckline scripts rasterize the actual native 720×1280 geometry with independent sampled regions. Neck contact allows total seam ease −10 to +16px and a 6px centering tolerance. Basic straps allow at most two antialiasing pixels. Garment coverage permits the script's small antialiasing tolerance and intentionally exposed skin; it does not require sandals to hide the whole foot.

All 14 painted pieces are compared against native fallback pixels; more than 20% of opaque pixels must materially differ. This proves that new textures are actually displayed, not only named in metadata. It does not prove artistic quality. Inspect the real 15-look capsule contact sheet (five combinations × three characters), enlarged neckline sheets, mobile layouts and saved portrait.

The first review caught atlas bleed into the tee and satin dress despite passing coverage checks. Source alpha components now isolate individual sprites. Keep both image review and geometric checks.

The old `dev/browser.test.js`, `dev/characters.test.js` and 24 v1.6 baselines remain historical source; they are no longer wired to the current npm/CI commands. Current commands do not claim those old snapshots passed.

## Limits

No human playtest results, real iOS/Safari, physical Android, low-memory Chromebook or CrazyGames portal QA are included. Hosted CI status and downloadable evidence are available in the repository Actions runs. Playtest records with `source: automated-check` must never count as human feedback. A passing local test cannot establish retention, artistic preference or platform approval.
