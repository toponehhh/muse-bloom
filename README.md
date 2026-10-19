# Muse Bloom

**v1.7.0 — The Studio Edit**

An offline HTML5 dress-up game with three painted characters, 36 challenges and 122 collectible pieces. This iteration polishes the first three occasions with 14 painted wardrobe pieces, a warm ivory/rose studio, a short adaptive guide, an animated reveal and before/after comparison.

The first occasions are Coffee with friends, The gallery opening and Weekend flower market. Their visible goals reward a complete outfit (40 points) and two occasion details (27 each). An incomplete outfit cannot be revealed. Maximum 94; a complete base can pass, while meeting the details earns the best rank. Later challenges retain the original mood-tag rules. Stored IDs, unlocks and historical look scores are preserved.

## Play and develop

Open the source `index.html`, or run `npm start` and visit `http://localhost:4173`. The delivered standalone file needs no server, account, CDN or installation.

```sh
npm ci                    # pinned Playwright tools; game itself needs no install
npm test                  # 20 rules/save/occasion tests + all 36 solvable briefs
npm run test:ui           # actual 36-level journey, 366 equip/remove pairs, 27 layouts
npm run test:fitting      # 246 body coverage + 1449 waist combinations
npm run test:neckline     # 129 neck/shoulder contacts and failure controls
npm run test:lookbook     # saves, keyboard, export and gallery layouts
npm run test:glam         # seven viewports across the current screens
npm run test:experience   # nine audio signals, reveal, mute and reduced motion
npm run package:upload    # dist/crazygames-upload/index.html
npm run test:upload       # actual root/nested/iframe/offline upload file
npm run standalone       # dist/Muse-Bloom.html
npm run test:playtest     # build and verify the private playtest kit
```

Tests start their own servers. Windows defaults to installed Edge; set `MUSE_BROWSER_CHANNEL=chrome` for Chrome. Linux uses Playwright Chromium (`npx playwright install chromium`). Current UI coverage is in `dev/salon.test.js`; old v1.6 browser/character scripts and baselines are historical references, not current test commands.

## Private playtest

Run `npm run package:playtest`, then open `dist/playtest-v1.7.0/index.html`. The folder contains the game, three neutral tasks, organizer instructions and an offline backup feedback form. Share the complete folder, or ZIP it for participants to extract. The ZIP is a human-sharing format, not a CrazyGames upload instruction.

`?playtest=1` enables a local anonymous session and a separate save; `fresh=1` starts a new participant. Normal play does not collect events. Feedback downloads only after a participant submits the form. No answers are sent automatically. Ask the person to share their JSON voluntarily. Observer forms should use the same participant ID as the game export.

```sh
npm run playtest:summary -- path/to/response-folder
```

The summary deduplicates IDs, retains session events when adding an observer form, excludes `automated-check` records and treats missing ratings as missing. **No real participants have been recruited or measured in this delivery.** Automated export checks are not player enjoyment, retention or approval evidence.

## Art and compatibility

Bella is the fresh-save default; Mika and Zoe remain selectable. Change character in the dialog without covering the head or shoes. The homepage uses the actual dressed character and reflects an existing selection. Clearing clothes restores painted studio basics; choosing a top/bottom replaces a dress naturally.

The polished starter capsule has 14 painted pieces. The remaining 108 collectible items retain the fitted SVG artwork; the entire wardrobe has not been repainted. All pieces still work on all three characters. The reveal moves the whole illustration so clothes remain aligned. This is fixed-view painted art, not a rotatable 3D character or a skeletal walking animation.

`dev/prepare-capsule.py` reads atlas alpha to find each sprite; `dev/build-capsule.js` bakes continuous texture scanlines into the native fitting mask. This prevents neighboring atlas sprites from bleeding into clothes. `npm run assets:capsule` rebuilds fitted WebP textures and embeds them; Python/Pillow is needed only when recalculating source bounds. `npm run assets` regenerates the native SVG fallback/thumbnail files and embeds local artwork. See [art pipeline](docs/ART.md), [generation briefs](docs/CAPSULE-PROMPTS.txt), [hashes](docs/CAPSULE-ASSETS.json) and [Stitch direction](docs/STITCH-DESIGN.md).

## Delivery boundaries

Use `dist/crazygames-upload/index.html` for the portal's file/folder upload, not the source HTML alone or the playtest guide. SDK, cloud saves, ads and platform mute integration remain unimplemented. This version is a local playtest candidate; it has not been resubmitted or accepted by CrazyGames. Existing v1.6 promotional media is historical, not a v1.7 capture.

Changes are checked in locally in steps. No GitHub repository was created or pushed. See [QA evidence](docs/QA.md), [test contracts](docs/UI-TESTS.md), [submission notes](docs/CRAZYGAMES.md) and [later GitHub upload](docs/GITHUB.md). CI is configured but has not run remotely. No open-source license is granted by default.
