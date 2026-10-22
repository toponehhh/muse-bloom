# CrazyGames resubmission candidate — Muse Bloom 2.0.3

Prepared 2026-10-22 (Asia/Shanghai). This is the current **Style Stories** edition with Mira, 36 challenges, six chapters and 122 collectible items. It is a **Basic Launch** candidate. It has not been resubmitted or accepted by CrazyGames.

## Upload the current game

```sh
npm run package:style-crazygames
npm run test:style-crazygames
```

Upload the contents of **`dist/crazygames-style-stories-v2.0.3/`** through the portal's file/folder picker. Confirm `index.html` is at the upload root beside the CSS, JavaScript and `assets/` folder. Upload all 17 files; do not upload the source HTML alone. The unpacked bundle is approximately **13.50 MB**, below our conservative 20,000,000-byte gate. The adjacent `.manifest.json` records the source commit and SHA-256 of every file; it is for release verification, not game upload.

The entry uses relative asset paths with content hashes. It contains the same campaign and character renderer as the tested Style Room build, with the playtest feedback button hidden. It has no feedback endpoint, Cloudflare Worker, D1/R2 dependency, external asset CDN, advertising, login or CrazyGames SDK. Progress uses LocalStorage `muse-style-room-campaign-v2`; the Lookbook uses `muse-style-room-campaign-pictures-v2`. The portal build has normal sequential progression; do not append `qa=1` when submitting or reviewing normal player progression.

`npm run package:upload` and the `muse-bloom-classic-crazygames` CI artifact remain **legacy 1.8** outputs. Use the **`muse-bloom-style-stories-crazygames`** CI artifact for this release. A downloaded Actions ZIP is only a transport format: extract it and upload the game folder's contents.

## Portal fields

| Field | Value |
|---|---|
| Game name | Muse Bloom |
| Engine | HTML5 (PixiJS rendering) |
| Launch | Basic |
| Category | Beauty, if available |
| Tags | Dress Up, Fashion, Casual, Singleplayer; choose only existing applicable tags |
| Save progress | Yes, using LocalStorage |
| Online multiplayer | No |
| CrazyGames SDK audio muting | No |
| Mobile | Responsive mouse/touch controls are implemented; complete portal mobile preview and real-device checks before selecting supported orientations |
| Store links/download counts | Leave blank; there are no published store versions |

**Description**

Muse Bloom is a cozy dress-up game about finding the right look for life's little occasions. Style Mira in her sunlit room, from coffee with friends to a gallery opening and a weekend flower market. Follow each story's styling notes, mix clothing and accessories, and reveal your outfit to see how it scores. Explore 36 challenges across six chapters, collect 122 wardrobe pieces, and save your best looks in a personal Lookbook. Try another combination whenever you like: there is no timer.

**Controls**

Click or tap a category, then choose a piece to wear. Tap a styling note for suggestions. Use Undo to restore your previous choice and Reset look to return to the starter outfit. Details zooms in; Full look shows the whole outfit. Select Reveal my look for your score, then Next challenge to continue. Open Lookbook to wear a saved look again or download its image. Use the sound and motion buttons to change those preferences. A dress replaces separates; choosing a top or bottom restores separates. Hair accessories and extras can be toggled off; selecting the same garment keeps it on.

**Resubmission change summary**

The game has been rebuilt around an original illustrated character and dressing room, fitted animated clothing, and the complete 36-challenge scoring and collection system. The update fixes footwear/handbag alignment, rendering when GPU contexts are unavailable, close-up viewing, score/result recovery, and saved-outfit restoration. The standalone upload is checked at the documented CrazyGames iframe sizes and uses only local assets.

## Current covers and preview videos

```sh
npm run promo:style
```

Requires the current upload package, Playwright and FFmpeg (`ffmpeg` on PATH, or `MUSE_FFMPEG`). Windows uses the configured sandboxed ungoogled Chromium executable. Generated files go to **`dist/crazygames-submission-v2.0.3/`**, separate from the game upload:

- `cover-landscape.png`: 1920 × 1080.
- `cover-portrait.png`: 800 × 1200.
- `cover-square.png`: 800 × 800.
- `preview-landscape.mp4`: 1920 × 1080, 18 seconds, no audio.
- `preview-portrait.mp4`: 1080 × 1620, 18 seconds, no audio.

Covers render Mira and the real Lavender Day Dress with the game's own renderer, with only the title as text. Videos start with their matching cover, then show real wardrobe selection, Details and scoring at real-time speed. They contain no cursor, advertisements or promotional overlays. `media-manifest.json` records dimensions, sizes and source revision. The old root `promo/` images and videos show historical characters and must not be reused for this submission.

## Evidence and remaining review

The 2026-10-22 automated feedback included an explicit retest reporting no reproduction of the four earlier character/Details/result/Wear again issues. The latest standalone 2.0.3 feedback reported no substantiated new defect. These are automated reports, not human playtest or approval evidence; private feedback text and media are not included in this public repository.

`test:style-crazygames` checks the actual upload directory: fresh normal progression, no feedback/API requirement, visible character pixels, Details, score and subsequent actions, image export, refresh/Wear again, nested paths, a separate-origin sandboxed iframe and offline play after resources load. It checks the ten official DPR-1 viewport sizes plus 390 × 844 and 320 × 568. The existing `test:style-release` suite separately covers all 36 challenges, all 122 items, detailed shoe/bag combinations, WebGL/Canvas2D, score/reward/save rules and isolated feedback services. Local evidence is kept under ignored `artifacts/`; those paths are not public attachments.

Before pressing Submit in the portal, use its Preview / QA tool on the uploaded build: first playable entry, clothing changes, Details, Reveal / Next challenge, reload / Lookbook, audio after tab switching, fullscreen and mobile orientation. Check the displayed version is 2.0.3 and that screenshots show Mira. Real phones, Safari/Chromebook performance, subjective enjoyment and CrazyGames review remain separate validation steps. No Mo session or issue triage is changed by packaging or merging this candidate.

Release-preparation commits may include **`[skip deploy]`** to run CI and produce artifacts without publishing to GitHub Pages or Cloudflare. This marker does not skip verification. Merging this candidate does not itself submit a build to CrazyGames.

## Official requirements checked on 2026-10-22

- [Launch requirements](https://docs.crazygames.com/requirements/intro/): Basic Launch permits an optional SDK and has no monetization; Full Launch requires platform integration.
- [Technical requirements](https://docs.crazygames.com/requirements/technical/): relative resource paths, at most 1,500 files, and total size used as initial size when there is no SDK; mobile homepage eligibility uses a 20 MB limit.
- [Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/): readable controls at the listed iframe sizes, English, smooth original gameplay, and no prohibited cross-promotion.
- [Cover requirements](https://docs.crazygames.com/requirements/game-covers/): three image shapes plus landscape/portrait preview videos, 15–20 seconds and at most 50 MB, without sound; cover text is limited to the title.

These checks prepare a submission candidate and do not predict approval or establish the cause of the earlier quality rejection.
