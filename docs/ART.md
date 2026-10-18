# Art pipeline

All illustration code is original to Muse Bloom. No downloaded or AI-generated raster artwork is used.

`js/art.js` defines a 720 × 1280 paper doll. Layers are drawn with DOM `<img>` elements containing SVG data URIs, ordered by item `z`. The same layers feed the canvas exporter, so offline `file://` play does not taint the export canvas.

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

The base character always wears an opaque camisole and shorts. Chinese-inspired pieces use lapels, frog buttons, pleated mamian panels, embroidery, jade, hairpins, silk fans and brocade; no brand names or logos are used.

The promotional illustrations use the same character, clothing and rendering code as gameplay. Cover art contains only the game title as text.
