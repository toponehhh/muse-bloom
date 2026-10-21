# Muse Bloom — Style Room

**The First Edit · 1.9.0-preview.1** is a small playable edition on `feat/pixi-skeletal-demo`, keeping the accepted Mira illustration and warm home style. Its version is independent of the classic v1.8 game in the repository root.

Cloudflare preview channel: **https://style-room.muse-bloom.pages.dev**. Read its `build.json` to identify the actual deployed commit/version; the URL alone is not deployment evidence.

## Play locally

```sh
npm ci
npm run demo:style
```

Open http://127.0.0.1:4182/demos/style-lab/index.html. Pick a top and bottom, try a theme, and save a look. Sound is opt-in. Motion has a pause button and respects reduced motion. On phones the fitting room stays visible as the wardrobe scrolls.

`npm run build:style` creates `dist/style-lab/`. Serve that directory with any static HTTP server; the entry is `index.html`. Assets and runtime are local, with no CDN requirement. Feedback in this offline/static package downloads JSON.

`npm run package:style-pages` creates a separate allowlisted `dist/style-room-pages/`, with online feedback enabled and the existing Pages service bridge. **Style Room preview** runs fitting and release tests, then deploys that exact hashed artifact to the `style-room` Pages branch when this feature branch is pushed. It does not replace the classic `muse-bloom.pages.dev` production root or deploy a new Worker/database.

## Scope

- One new original character, Mira, with a ponytail and natural relaxed arms; one original room.
- Three tops × three bottoms = nine separate combinations; three lightweight styling briefs.
- PixiJS 8.22.0 and the existing open-source DragonBones 5.5 mesh format/runtime. Twelve bones, gentle breathing, head and ponytail motion. Feet remain planted; no large arm rotations.
- Selection sparkles, optional synthesized sound, undo/reset, explicit detail view, and a local six-look Lookbook with image download.
- Collect three moods by matching both notes and saving; continue to the next unfinished theme. Custom mixes remain savable without awarding the wrong mood. Repeated saves update the same combination instead of consuming another slot.
- Current outfit, theme, completed moods, motion and sound preferences survive reloads. Saved looks can be worn again. Storage failure does not prevent play; downloads remain available.
- Feedback is available from the wardrobe action bar. On Cloudflare it uses the existing D1 receipt/R2 upload flow: up to 3 files, 30 MB total; images up to 5 MB, video up to 20 MB each. Only explicit submission after consent uploads feedback. A maximum of 200 actions is held in memory for optional submission; there is no background analytics request. Keep original media when downloading a JSON backup.
- This is a painted **2D** character with mesh deformation, not a 3D body, cloth simulation, or a proof that every garment shape and pose is supported. Hair, shoes, character switching, long sleeves, bags, arbitrary poses, and the full production progression are outside this capsule's validation.

## Art and fitting

`assets/provenance.json` contains the full built-in ImageGen prompts. All four PNGs are original generated sources, preserved unchanged. No reference-game textures or code are bundled. `room.png` is the backdrop; `mira.png`, `rose-lilac.png`, and `blue-ivory.png` supply the illustration layers.

Source atlas pixels are clipped by runtime mesh boundaries, fitted by continuous landmark cages, then assigned to the **same anatomical weight field**. The garment and skin swap synchronously, including when motion is paused. Covered skirt/leg regions are excluded when trousers are selected. The cardigan includes an intentional ivory inner layer. The waist boundaries exclude neighboring garments from the source atlas.

`src/rig.mjs` is the editable rig/fit source; it reuses the continuous fit-cage math in `../skeletal/src/fitting.mjs`. Dependencies and redistributed licenses are inherited from the existing skeletal prototype. The previous prototype remains available for comparison.

## Verification

```sh
npm run test:style
npm run test:style-release
npm test
```

Windows browser tests launch `C:\Tools\ugchromium\app\chrome.exe` headlessly; `MUSE_BROWSER_EXECUTABLE` can point to another permitted browser. CI uses Playwright Chromium. Run the browser command from CMD on Windows.

The suite loads the **built package at a subpath**, checks 9 combinations × 4 motion times with 432 transparent-canvas contact samples, detects original denim leaking around trousers, checks same-item selection, pause, undo, theme goals, Lookbook persistence, picture export, downloads, reduced motion, missing-asset retry, and six responsive sizes. It also checks that clothes are selectable while the model remains visible on phones, and that short desktop windows do not clip card names.

Evidence is written to `artifacts/style-lab/`: `report.json`, all outfit images, layout screenshots, phone interaction screenshots, and the exported look. These are automated checks plus visual inspection, not human playtest evidence or a guarantee of platform acceptance.

`test:style-release` additionally checks progression and saved-look restore, feedback in five viewport sizes, attachment limits, consent, retry and one receipt with two stored attachments against isolated Pages → Worker → D1/R2. Release evidence is in `artifacts/style-release/`.

For an authorized live smoke test, set `MUSE_STYLE_URL` to the HTTPS preview origin and run `node dev/style-release.test.js`. This submits **one explicitly automated** feedback record with two tiny synthetic files. Evidence and the receipt are written to `artifacts/style-release-live/`; verify the receipt in remote D1 before claiming database verification. This is not a human review.

See [the reference study](REFERENCE-STUDY.zh-CN.md) for observations and their implementation.
