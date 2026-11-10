# itch.io and GamePix — Muse Bloom 2.0.4

## Build and inspect

```sh
npm run test:style-portals
npm run promo:portals
```

Packaging needs Python 3.9+ on PATH (`python` on Windows, `python3` elsewhere), or `MUSE_PYTHON` pointing to the desired executable. It uses the standard-library ZIP writer; no new game dependency is added.

- Upload: `dist/browser-portals-v2.0.4.zip`.
- Unpacked files: `dist/browser-portals-v2.0.4/`.
- Source revision, individual file hashes and sizes: adjacent `.manifest.json`; do not upload it as a game file.
- Covers and real gameplay screenshots: `dist/portal-submission-v2.0.4/`.
- itch.io cover: `cover-itch.png`, 630 × 500, rendered from the current character and clothing.
- GamePix icon: `cover-gamepix-icon.png`, 256 × 256, below 1 MB.
- GamePix cover: `cover-gamepix.jpg`, 1360 × 850, high-quality JPEG below 1.5 MB. The generator checks both upload size limits.

The package reuses the verified standalone asset allowlist, with platform-neutral entry metadata. It contains 17 files with `index.html` at the ZIP root, all game resources and license notices. No Cloudflare Worker, feedback endpoint, private feedback data, third-party ad SDK or analytics service is included. The feedback UI is hidden. Gameplay, normal progression and browser-local saves are the same as the 2.0.4 release.

The package test exercises the actual distributable, including Details, scoring, next challenge, saved-look restoration, image download, nested paths, a separate-origin sandboxed iframe and no external network dependency. It includes GamePix's 640 × 480 viewport and itch.io's intended 960 × 640 embed in addition to the existing desktop/phone sizes. ZIP entry names and every extracted file's hash are checked.

## Submission copy

**Title:** Muse Bloom

**Short description:** Style everyday stories, discover your signature look, and build a wardrobe of favorites.

**Description:**

Make every day a new style story. Join Mira in her sunlit room and create outfits for coffee with friends, gallery openings, weekend outings and more. Read the styling notes, mix your favorite pieces and reveal your look to see how it scores.

- 36 challenges across six chapters.
- 122 collectible clothing pieces, shoes, hair accessories and extras.
- Clear outfit goals, free retries and no timer.
- A personal Lookbook to revisit saved outfits or download an image.
- Mouse or touch controls, with sound and motion settings.
- Progress saved locally in your browser.

**Controls:** Click or tap a category and select a piece. Use Details for a close-up, Undo to reverse a change, and Reset look to start again. Reveal my look shows your score and rewards. Choose Next challenge to continue, or open Lookbook to wear a saved outfit again.

**Creation disclosure:** Built with JavaScript and PixiJS. Development, artwork, text and synthesized audio used AI assistance and were iterated and tested. Game code and bundled library license notices accompany the HTML5 build.

## Platform notes checked on 2026-10-24

- [itch.io HTML5 upload](https://itch.io/docs/creators/html5): ZIP with a root entry, relative paths, browser-playable upload, responsive embed/fullscreen settings. Choose free access without donations; no payment account is needed for this release.
- [itch.io quality guidance](https://itch.io/docs/creators/quality-guidelines): use accurate screenshots and disclose generative AI usage in the project's metadata.
- [GamePix submission guidelines](https://partners.gamepix.com/guidelines/submission): relative assets, no external game links/analytics, loading feedback, iframe support at 640 × 480, complete game and representative artwork. The current guidelines explicitly allow an SDK-free game; no SDK integration or monetization approval is claimed here.
- GamePix's optional third-party distribution setting should remain off for the initial submission unless the owner selects broader distribution.

## Submission results

### itch.io

- Published on 2026-10-24: [Muse Bloom](https://huangdl.itch.io/muse-bloom), project ID `5222182`.
- Free HTML5 game with no payments or donations; 960 × 640 embed and a fullscreen button. Desktop first; mobile-friendly flag is not advertised.
- Upload `19997887`: `browser-portals-v2.0.4.zip`, marked as playable in the browser. Cover, three real gameplay screenshots, controls, seven relevant tags and generative-AI classifications are saved.
- The hosted iframe rendered the character and selected outfit, switched to Details and displayed the score/result image with no page exceptions during the check.
- A fresh anonymous Chromium 150 session received HTTP 200, started the game and confirmed `STYLE STORIES · 2.0.4` at 2026-10-24 14:45 UTC. Public availability is confirmed; appearance in itch.io search/indexes is not claimed.

### GamePix

- Submitted on 2026-10-24 at 14:55 UTC (22:55 Asia/Shanghai): [Muse Bloom developer record](https://my.gamepix.com/games/muse-bloom), game ID `2M8B38`.
- Dress-Up category, desktop/landscape, HTML5-JS, SDK-free; optional third-party distribution disabled.
- Uploaded the verified ZIP and exact-size icon/cover; operation instructions are saved. Build code `3L94qsNNYuFf12TLqNPuF2X91SI`.
- The official preview rendered the character and selected outfit, switched to Details, displayed the score/result image and advanced to the next challenge, with no page exceptions during the check. The tested embedded viewport was 845 × 475 in Chromium 150. The preview initially needed additional loading time; this is not a claimed game-code fix.
- The submit request returned HTTP 200 and the portal changed from `New release EDIT` to `New release REVIEW`, with `Cancel review` available. Reloading the record at 14:55:59 UTC confirmed that `REVIEW` persisted. This confirms receipt for review, not approval or a public GamePix listing.
- Temporary developer preview links expire after 24 hours and are not player-facing links; share the public itch.io page for playtests instead.

The uploaded ZIP was packaged from `3d48b053c4f14b5dd935743bda38cb20dc836b29`. [CI run 40102093211](https://github.com/toponehhh/muse-bloom/actions/runs/40102093211) passed, including standalone portal and iframe tests; the Cloudflare deployment job was intentionally skipped. No Cloudflare production game changes were needed for these submissions. Authenticated browser state, temporary preview tokens and raw submission evidence remain in ignored local artifacts rather than the repository.
