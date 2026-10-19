# Muse Bloom

Every look. Entirely you. — v1.6.1, Tailored to Your Muse

An offline HTML5 fashion puzzle with 36 challenges and 122 collectible pieces. Choose Bella, Mika or Zoe, dress your character in a bedroom studio, match the style brief, and build a personal lookbook. This release replaces the actual playable vector dolls with three painted, transparent character sprites based on the supplied Stitch visual references. The same characters appear in gameplay, selection, lookbooks, portrait exports and covers.

## Play and develop

Open `index.html` or run `npm start` with Node.js 20+ and visit http://localhost:4173. Gameplay needs no installation, account, CDN or network connection.

```sh
npm test                 # 14 rule/save tests + all 36 challenges
npm ci                   # install pinned Playwright for development tests
npx playwright install chromium  # Linux/CI; Windows defaults to installed Edge
npm run test:ui          # real character input, body coverage and pixel baselines
npm run test:fitting     # 246 garment checks, 1449 waist seams, 9 viewports
npm run test:glam        # 7 viewport layouts, images and contrast
npm run test:lookbook    # saved identities/outfits and actual PNG downloads
npm run test:experience  # idle motion, Web Audio and visibility lifecycle
npm run assets          # regenerate garment SVGs and embed local artwork
npm run package:upload  # dist/crazygames-upload/index.html
npm run test:upload     # portal-style / nested / iframe / offline tests
npm run standalone     # dist/Muse-Bloom.html
npm run package        # multi-file ZIP backup
```

With `npm start` running, `npm run test:browser` plays all 36 levels through the UI. Set `MUSE_BROWSER_CHANNEL=chrome` for installed Chrome. `test:ui:update` explicitly replaces the 24 reviewed character-only baselines; review images before checking them in. Development tests are not loaded by the game.

## Characters and saved progress

- Bella: light complexion, honey-blonde bob, blue eyes; fresh-save default.
- Mika: light complexion, black bob, brown eyes.
- Zoe: brown complexion, textured puff buns, hazel eyes.
- Select from portraits in a dedicated row below and outside the stage, the Meet the muses dialog, or Settings. Your outfit remains equipped when you change characters.
- The old four SVG bodies and face/hand/hairstyle renderer have been deleted from the active project. There is no old-doll fallback.
- Hairstyles belong to characters. The 22 previous hairstyle item IDs now represent bows, clips, headbands and other Hair details. IDs, style tags, scores and earned unlocks are preserved.
- Clearing an outfit reveals the painted lavender studio basics. Basics award no points. New sessions start in these basics so the new character is immediately visible.
- `muse_bloom_save_v1` remains compatible. Current saves and recorded looks store `character`. Older light/warm skin-only saves migrate to Bella; tan/deep migrate to Zoe. Progress and recorded outfits remain intact.

## Clothing fit and the character dock

All 82 tops, bottoms, dresses and shoes now use native patterns aligned to the painted cast. Bent sleeves, fitted waists, hip ease, separate trouser legs and new shoe outlines replace the old global garment warp. Footwear renders behind garment hems, so tall boots do not cover long skirts. Hair details and accessory grips retain their separate placement rig.

The character dock occupies its own layout row and cannot cover the stage. Regular portrait phones use 44px character buttons; small-height phones and landscape layouts use compact controls. A new Stitch MCP board informs this layout; see [design provenance](docs/STITCH-DESIGN.md). The game does not call Stitch or require its credentials.

## Game scope

Six collections; 36 sequential briefs; 122 pieces including 20 Chinese-inspired items. A dress replaces separates; two accessory slots. Three required tags contribute 60 points, two bonus tags 10, six outfit units 24. Maximum 94; S starts at 85, pass at 35. Three different S results unlock a secret item. Nine synthesized sounds and reduced-motion-aware animations are included.

The rendering is fixed-view painted 2.5D art with fitted SVG clothing, not a rotatable 3D mesh. Canvas exports use the same composite as the stage. No old anatomical vector art is rendered.

## Release and source

For CrazyGames folder/file upload, use the single self-contained `dist/crazygames-upload/index.html`, not the source HTML alone. See [submission notes](docs/CRAZYGAMES.md). SDK, cloud saves, ads and platform mute integration are not implemented; this local build targets Basic Launch. Nothing has been uploaded to CrazyGames or GitHub in this work.

Changes are committed in steps locally. [GitHub instructions](docs/GITHUB.md) describe pushing later. CI configuration exists; local test results are recorded in [QA](docs/QA.md), not presented as hosted CI or platform approval.

See [art pipeline](docs/ART.md), [character generation provenance](docs/CHARACTER-PROMPTS.md), [asset hashes](docs/CHARACTER-ASSETS.json) and [UI test coverage](docs/UI-TESTS.md). The original Stitch ZIP is unchanged. Character assets were generated with the built-in image tool using the supplied illustrations as references. This project makes no claim about third-party ownership of supplied reference art. No open-source license is granted by default.
