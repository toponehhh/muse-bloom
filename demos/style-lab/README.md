# Muse Bloom — Style Room

An independent visual/playability demo on `feat/pixi-skeletal-demo`.

## Play locally

```sh
npm ci
npm run demo:style
```

Open http://127.0.0.1:4182/demos/style-lab/index.html. Pick a top and bottom, try a theme, and save a look. Sound is opt-in. Motion has a pause button and respects reduced motion. On phones the fitting room stays visible as the wardrobe scrolls.

`npm run build:style` creates `dist/style-lab/`. Serve that directory with any static HTTP server; the entry is `index.html`. Assets and runtime are local, with no CDN or service/API requirement. GitHub Actions **Style Room demo** provides `muse-bloom-style-room` and `style-room-ui-evidence` artifacts. This workflow does not deploy production.

## Scope

- One new original character, Mira, with a ponytail and natural relaxed arms; one original room.
- Three tops × three bottoms = nine separate combinations; three lightweight styling briefs.
- PixiJS 8.22.0 and the existing open-source DragonBones 5.5 mesh format/runtime. Twelve bones, gentle breathing, head and ponytail motion. Feet remain planted; no large arm rotations.
- Selection sparkles, optional synthesized sound, undo/reset, explicit detail view, and a local six-look Lookbook with image download.
- This is a painted **2D** character with mesh deformation, not a 3D body, cloth simulation, or a proof that every garment shape and pose is supported. Hair, shoes, character switching, long sleeves, bags, arbitrary poses, and the full production progression are outside this capsule's validation.

## Art and fitting

`assets/provenance.json` contains the full built-in ImageGen prompts. All four PNGs are original generated sources, preserved unchanged. No reference-game textures or code are bundled. `room.png` is the backdrop; `mira.png`, `rose-lilac.png`, and `blue-ivory.png` supply the illustration layers.

Source atlas pixels are clipped by runtime mesh boundaries, fitted by continuous landmark cages, then assigned to the **same anatomical weight field**. The garment and skin swap synchronously, including when motion is paused. Covered skirt/leg regions are excluded when trousers are selected. The cardigan includes an intentional ivory inner layer. The waist boundaries exclude neighboring garments from the source atlas.

`src/rig.mjs` is the editable rig/fit source; it reuses the continuous fit-cage math in `../skeletal/src/fitting.mjs`. Dependencies and redistributed licenses are inherited from the existing skeletal prototype. The previous prototype remains available for comparison.

## Verification

```sh
npm run test:style
npm test
```

Windows browser tests launch `C:\Tools\ugchromium\app\chrome.exe` headlessly; `MUSE_BROWSER_EXECUTABLE` can point to another permitted browser. CI uses Playwright Chromium. Run the browser command from CMD on Windows.

The suite loads the **built package at a subpath**, checks 9 combinations × 4 motion times with 432 transparent-canvas contact samples, detects original denim leaking around trousers, checks same-item selection, pause, undo, theme goals, Lookbook persistence, picture export, downloads, reduced motion, missing-asset retry, and six responsive sizes. It also checks that clothes are selectable while the model remains visible on phones, and that short desktop windows do not clip card names.

Evidence is written to `artifacts/style-lab/`: `report.json`, all outfit images, layout screenshots, phone interaction screenshots, and the exported look. These are automated checks plus visual inspection, not human playtest evidence or a guarantee of platform acceptance.

See [the reference study](REFERENCE-STUDY.zh-CN.md) for observations and their implementation.
