# Art pipeline

All illustration code is original to Muse Bloom. No downloaded or AI-generated raster artwork is used.

`js/art.js` defines a 720 × 1280 layered character. `avatarSvg()` composes one inline SVG with keyed groups, ordered by item `z`. Dressing updates those groups synchronously and keeps the avatar and base mounted; removing clothes never waits for image decoding. The canvas exporter rasterizes the same composition. Offline `file://` play does not taint the export canvas.

## Edit the source art

Edit the vector paths in `js/art.js` and run `npm run assets`. This exports full clothing layers to `assets/items`, thumbnails to `assets/thumbs`, and four skin-tone bases to `assets/base`.

## Replace an individual illustration

Edit its SVG in `assets/items` or `assets/base`, preserving the 720 × 1280 canvas and transparent background. Run `npm run embed-assets` **without** regenerating default art. The embedder includes only custom overrides in `js/asset-data.js`; untouched defaults use compact vector source. Thumbnail viewboxes are derived from each item's `bounds`, with separate bounds for accessories in `art.js`. Inspect both thumbnail and fitted layer after edits.

Do not run `npm run assets` after individual asset edits unless you intend to regenerate those files from the vector source. Commit custom edits and the embedded data together.

## Art coordinates

- Head: center (360, 230); neck: y 300–350.
- Shoulder line: y 350; waist: y 600; hip: y 700.
- Feet: y 1140–1200. Dress artwork has two slot units.
- Item anchor: (360, 640), the shared full-canvas center.
- Base layer 10; bottoms 20; dress 25; top 30; shoes 50; hair 60; accessories 70.

The base contains opaque studio basics: short hair, a rose camisole and sage shorts. Groups marked `data-basic="hair"`, `data-basic="top"`, and `data-basic="bottom"` are hidden only when that slot is covered by an equipped item (a dress covers both clothing slots). Keep these markers in custom base artwork. Basics are visual fallbacks, not collectible/scoring items. This prevents pale underlayers protruding around a fitted garment and makes removal an explicit complete appearance.

Long sleeves cover both edges of the base arms through the wrists. Bodices share underarm/waist landmarks; fitted skirts cover the full hip contour. Check `npm run test:ui` after art changes: coverage assertions and 48 reviewed screenshots protect these seams. See [UI test guide](UI-TESTS.md) before deliberately updating baselines.

Chinese-inspired pieces use lapels, frog buttons, pleated mamian panels, embroidery, jade, hairpins, silk fans and brocade; no brand names or logos are used.

The promotional illustrations use the same character, clothing and rendering code as gameplay. Cover art contains only the game title as text.

## Glow Studio materials and handheld rig

Colors are converted to deterministic SVG gradients. Soft skin lighting, hair highlights and fabric shading retain the existing fit coordinates. Each inline avatar has an independent namespace for its gradients and filters, including during keyed updates. This prevents cross-instance skin/material collisions.

Handheld props attach at (486, 776), with a second prop mirrored to (234, 776). Finger overlays paint after the props and are removed when unused. Crossbody straps start at the shoulder (299, 368). Keep `data-part="handle"` and `data-part="shoulder-strap"` when overriding these accessory assets; these identify paths checked by the attachment tests. The game and card exporter use the same hand allocation and compositing.

See [Visual direction](VISUAL-DESIGN.md) and `dev/accessory.test.js`.
