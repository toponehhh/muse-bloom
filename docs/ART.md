# Art pipeline — v1.6.1

## Playable cast

`assets/characters/bella.webp`, `mika.webp` and `zoe.webp` are the only playable base characters. Each is a 768 × 1152 transparent painted sprite, in the same pose and lavender studio basics. The three files total 298,232 bytes. `CHARACTER-ASSETS.json` records source generation names and SHA-256 hashes. The original generated PNGs are retained by the image tool; delivery files are encoded WebP with preserved alpha.

The four `assets/base/*.svg` files have been removed. `js/art.js` no longer draws a face, body, hands, hair cap or legacy hairstyle. The 22 hair items are new decorative details, keeping the same saved item IDs and scoring tags. The supplied editorial artwork remains source material in `assets/editorial`; the home screen now displays the actual new playable sprites.

## Composition

`avatarSvg(character, items, namespace)` creates one 720 × 1280 composite. The painted image retains its original aspect ratio using x=-66.667, width=853.333 and height=1280. The 82 clothing and shoe patterns are authored directly in this coordinate system. Neck, bust, waist, hip, knee and ankle anchors are approximately y=286, 385, 490, 625, 840 and 1140. Their envelope includes modest seam ease around the three measured sprites. Clothing is no longer passed through `contourPoint`; only accessories retain that placement rig, and head details use the separate head transform. Colours, seams, embroidery and volume highlights remain editable SVG. Sleeves follow the bent forearms, skirt hips cover the painted studio shorts, and trousers have separate continuous leg contours. Footwear is composited before bottoms/dresses so garment hems cover shoe uppers naturally. Nested texture clips have unique IDs.

The character layer remains mounted during ordinary equip/remove operations. Choosing a different character updates its image and identity attributes, while retaining the equipped items. Sprites are preloaded. Bags and fans use the same grip coordinates; a second handheld is mirrored. Small clipped copies of the actual painted fingertips overlay handles. No vector hand substitute is used.

Body proportions, shoulders, elbows, waist, hips and hands are painted into each base. They are not morphable meshes. This is fixed-view 2.5D illustration rather than real-time 3D.

## Build and export

`npm run assets` regenerates 122 garment SVGs and 122 thumbnails, then embeds all character sprites, room artwork and custom garment overrides in `js/asset-data.js`. The garment source is otherwise generated compactly at runtime. It never recreates retired bodies. `standalone.js` embeds the CSS and scripts into one HTML. `share.js` rasterizes the identical avatar composite into a 1080 × 1920 card; no external image request or tainted canvas is needed.

See `UI-TESTS.md` for all-garment body-coverage checks, all top/bottom waist-seam combinations and the 24 manually reviewed snapshots. Aesthetic judgement and arbitrary combinations still benefit from human review; tests do not prove every artistic detail correct.
