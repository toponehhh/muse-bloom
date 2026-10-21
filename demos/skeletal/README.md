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
