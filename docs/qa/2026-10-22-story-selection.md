# QA story selection — 2026-10-22

## Cause and behavior

The story map renders all 36 challenges. The original client disables every challenge beyond `G.nextLevel(save)`. With a fresh save that means only story 1 is enabled. `qa=1` previously classified feedback as automated but did not change story availability. There is no hosting-side story feed or database to reseed.

Prepared release **2.0.2** adds an explicit QA mode:

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

The release gate includes the targeted tests. Existing campaign/progression UI tests explicitly use `qa=1&progression=normal` so opening the QA picker does not hide real unlock regressions. No full remote QA run or Mo recheck was performed for this change.

## Publication

Publishing requires replacing the Style Room Pages assets. The regular main-site deployment, D1 data and R2 objects do not need changes. The prepared build also includes the previously locally verified Canvas2D character-rendering fix.

Deployment is pending. Once published, use `https://style-room.muse-bloom.pages.dev/?v=2.0.2&qa=1` for freely selectable stories, or add `&progression=normal` to verify the ordinary unlock sequence. A query string alone cannot update an older hosted bundle; check `build.json` for the actual deployed source commit.

Local reports and screenshots are under ignored `artifacts/campaign-stories/`; these paths are not tracker attachments. Mo's existing findings and triage are unchanged.
