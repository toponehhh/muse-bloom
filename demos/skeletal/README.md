# Muse Bloom · Motion Atelier

Experimental branch: `feat/pixi-skeletal-demo`. One character and a small wardrobe to evaluate animation and fit before migrating the full game. The original game and production deployment remain separate.

## Runtime and authoring

- PixiJS **8.22.0**, MIT: https://github.com/pixijs/pixijs
- `pixi-dragonbones-runtime` **8.0.3**, MIT, with the DragonBones MIT runtime: https://github.com/h1ve2/pixi-dragonbones-runtime
- DragonBones **5.5** skeleton data: bones, animation timelines and weighted meshes. Body and clothes share the same bind pose and skinning field. Moving a sleeve cannot silently use a different shoulder anchor.
- Free open-source visual editor option: [Animo](https://github.com/justmorenoise/Animo), AGPL-3.0-or-later. Its export exception is documented in [LICENSE-EXCEPTION.md](https://github.com/justmorenoise/Animo/blob/main/LICENSE-EXCEPTION.md). The editor is not bundled into the game. Animo currently does not author mesh deformation; this demo's mesh weights are reproducibly authored in source. Do not assume that it can round-trip weighted meshes.

This is 2D skeletal animation with painted volume, not a 3D model or a cloth physics simulation. The initial asset set is intentionally small. Existing static wardrobe assets are not automatically compatible with the new rig.

## Run

```sh
npm ci
npm run demo:skeletal
```

Open http://localhost:4175/demos/skeletal/index.html. `npm run build:skeletal` also creates `dist/skeletal-demo/`, which can be served under any URL subpath. The demo has no CDN dependency at runtime.

## Art

New original character and clothing images are generated with the built-in imagegen tool. Source prompts and provenance are kept beside the assets. The existing production characters are not used by this demo.

- [Source briefs and provenance](assets/provenance.json), [polo neckline edit](assets/neckline-edit.json).
- `assets/nora.png`: Nora, neutral studio basics, independent shoulder/elbow/wrist, hip/knee/ankle motion and ponytail follow-through.
- `assets/rose-denim.png`: knitted cardigan and denim skirt, fitted by the rose cage.
- `assets/blue-ivory-v2.png`: polo and wide-leg trousers, fitted by the blue cage. The first iteration is retained in `source/` and excluded from the build.
- `src/rig.mjs` owns the bind pose, garment cages, common weight field and animation timelines. `build:skeletal` deterministically exports `assets/nora_ske.json` and the three `*_tex.json` atlas descriptors. Texture UVs refer to original PNGs; there is no destructive slicing of source art.
- Separate skin coverage for sleeveless, short-sleeve and long-sleeve tops prevents a second body outline leaking past sleeves. Garment slots stay under UI control during animation crossfades. Clicking a selected garment keeps it equipped.

## Try it

1. Compare Studio, Coffee date and Gallery day, then mix their tops and bottoms.
2. Use **Say hi** to inspect the elbow/wrist fit, then **Strike a pose** for torso/hip movement.
3. Expand **Behind the movement** to show joints or slow animation to 0.5×.
4. **Save a portrait** downloads a 900 × 1200 PNG. Sound is opt-in. Reduced-motion users start with a still pose and can explicitly play an animation.

## Validation

`npm run test:skeletal` runs the packaged demo and source demo in a real browser. Windows uses installed Edge; CI uses Playwright Chromium. Evidence is written to `artifacts/skeletal/`.

Verified locally on 2026-10-21:

- 9 outfit combinations × 7 sampled poses = **63 cases**, with **1,071 rendered pixel contacts** at neck, shoulders, elbows, wrists, waist, knees and ankles.
- An empty armpit region detects the previous elbow-stretch spike. A negative control deliberately hides a top and proves the coverage check fails.
- Real animation advances the wrist and native mesh vertices; pause stops the clock; a completed wave blends back to breathing without changing clothes.
- 6 layouts: 1440×1000, 1024×768, 800×600, 390×844, 320×568, 667×375. The heading stays above the head and mobile wardrobe controls stay below the feet.
- Keyboard tabs, bone overlay, speed, sound toggle, PNG download, reduced motion, subpath packaging, missing-skeleton error and successful Retry. Thumbnail clipping excludes neighboring garments on shared source sheets.
- Original `npm test`: 24 rule/save/occasion tests and all 36 briefs still solvable.

This is sampled automated coverage plus visual inspection, not proof that every intermediate pose or future garment fits. Physical iOS/Android devices and real-player preference have not been tested. There is no 3D rotation, cloth collision solver, full level progression or new Cloudflare deployment in this demo.

## Packaging and CI

`npm run build:skeletal` replaces only `dist/skeletal-demo/`. Serve that directory through HTTP; double-clicking `index.html` as `file://` cannot fetch the skeleton JSON. CI uploads this folder as **muse-bloom-skeletal-demo**. It is kept separate from the production Pages/Cloudflare artifacts. The prototype includes full runtime licenses in `licenses/`.
