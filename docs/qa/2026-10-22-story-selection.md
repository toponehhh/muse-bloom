# QA story selection — 2026-10-22

## Cause and behavior

The story map renders all 36 challenges. The original client disables every challenge beyond `G.nextLevel(save)`. With a fresh save that means only story 1 is enabled. `qa=1` previously classified feedback as automated but did not change story availability. There is no hosting-side story feed or database to reseed.

Published release **2.0.2** adds an explicit QA mode:

| URL parameters | Available stories | Save behavior |
| --- | --- | --- |
| No QA parameter | Normal sequential unlocks | Existing player save and Lookbook |
| `?qa=1` | All 36 selectable, even if no story has been completed | Separate QA story save and Lookbook |
| `?qa=1&progression=normal` | Normal sequential unlocks, for progression testing | Another separate QA save and Lookbook |

The picker and challenge entry/scoring use the same availability rule. Selecting a story does not create scores, wins or streaks. Actual out-of-order QA results and outfits survive reload. The current story is identified with `aria-current`, and a failed selection no longer closes the picker. The QA banner explains the mode.

QA never imports or overwrites a regular campaign, classic save or regular Lookbook. Old QA runs that used the regular save are ignored by the new QA namespace; those existing values are preserved. Missing, corrupt and inaccessible storage still permit QA story selection. Mode flags come from the URL, not from stored JSON. Normal play still requires real sequential progress.

## Verification

Implementation: `c52d294`. Targeted tests: `fb0d672`.

- `node dev/game.test.js`: 14 existing scoring, unlock and save-protection tests passed.
- `node dev/campaign-rules.test.mjs`: 2 campaign tests passed, including all 36 levels' scoring/solvability and existing save rules.
- `npm run test:stories`: 5 new state tests and 5 UI checks passed at `fb0d672ad970e16ce1e3058b48ee18de44fb3c86`.
- UI run: **2026-10-22 14:04–14:05 Asia/Shanghai**, Windows, headless ungoogled Chromium 150.0.7871.255, browser sandbox enabled, isolated local HTTP server and browser contexts.
- Desktop 1440 × 1000 and phone-sized 390 × 844: 36 enabled QA tiles; switches 1 → 2 → 36 → 1 → 2; correct brief/current tile; selection and actual results survive reload; player saves/Lookbook remain byte-for-byte unchanged; normal QA progression still enables only story 1 on a fresh save.
- Both viewport cases recover from corrupt QA JSON. A separate browser context with blocked localStorage can still select another story. No unexpected page errors. Picker screenshots inspected visually.
- Public UI flows do not use `test=1` or an internal app hook. No feedback is submitted to production D1/R2.

The final release artifact was rebuilt at **`8e9e40497ced0eb558af31ca55d2de20d73b5eb7`**. `npm run test:stories` passed all 5 state tests and 5 UI checks again on **2026-10-22 14:07–14:08 Asia/Shanghai** in the same environment. `node dev/package-style-lab.js --verify` confirmed the packaged files before deployment.

The release gate includes the targeted tests. Existing campaign/progression UI tests explicitly use `qa=1&progression=normal` so opening the QA picker does not hide real unlock regressions. No full remote QA run or Mo recheck was performed for this change.

## Publication

After the user's explicit approval, release **2.0.2** from **`8e9e40497ced0eb558af31ca55d2de20d73b5eb7`** was deployed to Cloudflare Pages project `muse-bloom`, branch alias `style-room`. The build includes the previously locally verified Canvas2D character-rendering fix. The regular main-site deployment, D1 data and R2 objects were not changed.

- [QA story exploration](https://style-room.muse-bloom.pages.dev/?v=2.0.2&qa=1): all 36 stories selectable.
- [QA normal progression](https://style-room.muse-bloom.pages.dev/?v=2.0.2&qa=1&progression=normal): ordinary sequential unlocks in a separate test save.
- Immutable deployment: [3ea96cc8.muse-bloom.pages.dev](https://3ea96cc8.muse-bloom.pages.dev).

Authorized hosted verification ran **2026-10-22 14:12–14:13 Asia/Shanghai**, using Windows and sandboxed headless ungoogled Chromium **150.0.7871.255**, with isolated browser contexts:

- Served `build.json` reports 2.0.2 and the exact release commit. HTML, JavaScript and CSS SHA-256 hashes match the tested artifact.
- Desktop 1440 × 1000: a fresh QA save enables all 36 stories; switching 1 → 2 → 36 → 2 updates the brief, and reload retains story 2.
- Phone-sized 390 × 844: the picker switches away from the active story and back correctly.
- Fresh regular play and QA normal-progression mode each enable only story 1. Returning to QA exploration restores its independent story 2 selection.
- No unexpected page errors, feedback submissions or other state-changing network requests occurred.

This hosted check covered story switching and persistence only. It did not repeat the earlier GPU-unavailable rendering regression or resume Mo. No new Mo fix-verification verdict exists. A query string alone does not select an older bundle; use `build.json` to identify what an alias currently serves.

Local reports and screenshots are under ignored `artifacts/campaign-stories/`; these paths are not tracker attachments. Mo's existing findings and triage are unchanged.
