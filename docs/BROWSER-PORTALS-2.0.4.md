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

Both authenticated developer portals are required to complete publication. Submission results and public URLs will be recorded after the portals confirm them; a prepared ZIP or saved draft is not publication.
