# GamePix iframe repair — Muse Bloom 2.0.5

## Report and cause

GamePix reported that the desktop game was not fully visible inside its iframe and requested verification at 800 × 450. The campaign inherited a 520px minimum main height, plus the header and footer, from the original layout. The old package measured 628px tall in a 907 × 510 viewport. Below 761px wide, landscape players also inherited a vertically stacked phone layout.

The earlier portal smoke test used Playwright's automatic scrolling and explicitly scrolled to result actions. It verified that buttons could be reached, but did not prove that the game fitted the player without page scrolling.

## Repair

- The desktop/landscape campaign allocates the actual iframe height between its header, game and footer. Clothing choices scroll inside the wardrobe.
- Compact layouts retain the whole character, Full look/Details, Undo/Reset and Reveal. Cards shrink to the available list height when longer story hints take more room.
- Result layouts keep the score, breakdown, Next challenge, image download and Keep styling visible in short players.
- Portrait phone layouts retain their existing scrolling behavior. No game rules, save keys, artwork or platform SDK settings were changed.

Source commit: `e3af925865f0ce4fe569cf7cff7f7cffd67fb86a`, committed directly on `main`.

## Validation

Run `npm run test:style-portals` to build and check the actual upload ZIP. The regression asserts element positions before clicks can auto-scroll, rejects desktop document overflow and checks that a complete clothing-card row fits.

Local Chromium 150.0.7871.255 checks passed on 2026-11-08:

- 14 desktop/phone viewport sizes, including 800 × 450, 640 × 480 and 960 × 640.
- A separate-origin sandboxed iframe resized independently of its 1440 × 1000 parent: 800 × 450 → 1216 × 684 → 640 × 480 → 620 × 349 → 800 × 450 → 1024 × 768.
- All 36 story briefs, their interactive hints and result actions at 800 × 450, including the extra QA banner. Normal progression is still the default upload behavior.
- Character rendering, Details, scoring, image download, next challenge, Lookbook restoration, nested asset paths and offline play after loading. No game page exceptions or external asset requests.
- `npm test`: 24 rule tests plus all 36 challenges' attainable S scores and the 122-piece inventory validation.
- `npm run package:style-pages` followed by `node dev/style-release.test.js`: the first three S-ranked challenges, save restoration and responsive feedback with isolated local D1/R2; no production feedback records were sent.

Local evidence is under ignored `artifacts/style-portals/`, `artifacts/style-release/` and `artifacts/gamepix-iframe-20261108/`. Screenshots were visually inspected at 800 × 450, 1216 × 684 and the smaller embedded size. These are automated checks, not human playtesting or platform approval.

## Upload

- ZIP: `dist/browser-portals-v2.0.5.zip`.
- ZIP SHA-256: `8f7b396cbc588e27d7db0c7e7eac10186cb29ea28f4978fd602a37e8ba664532`.
- Build provenance and file hashes: `dist/browser-portals-v2.0.5.manifest.json`.
- Existing record: [Muse Bloom on GamePix](https://my.gamepix.com/games/muse-bloom), game ID `2M8B38`.
- Retain desktop/landscape, HTML5-JS, SDK-free, existing artwork and disabled optional third-party distribution.
- Release note: “v2.0.5 fixes desktop iframe resizing. The full character, wardrobe controls and results now fit 800x450 without page scrolling. The wardrobe list scrolls internally. Tested dynamic iframe resizing, the 620x349 small player, all 36 story briefs, Details, scoring and saved looks.”

On 2026-11-08 the final upload ZIP passed the regression at 01:45 UTC against source `e3af925`. Resubmission is pending renewed GamePix login: the existing developer record redirects to the sign-in page. No new GamePix build has been uploaded or sent for review yet. GitHub authentication also returned HTTP 401, so the local `main` commits have not yet been pushed. Both login handoffs have been opened for the owner. Record the hosted preview and review receipt after authentication is restored. Cloudflare and itch.io deployments are outside this resubmission.
