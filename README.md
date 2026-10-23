# Muse Bloom

**Current release: Style Stories 2.0.4.** One production site, built from `main`: [Play Muse Bloom](https://muse-bloom.pages.dev/) · [QA playtest](https://muse-bloom.pages.dev/?qa=1) · [CI and deployment](https://github.com/toponehhh/muse-bloom/actions/workflows/style-lab.yml). Use the in-game Feedback button to submit ratings, screenshots or recordings to the existing private D1/R2 service. The former `style-room` alias redirects to this site.

The current game uses Mira and the illustrated room, with **36 challenges, six chapters and 122 items**. Version 2.0.4 keeps waistbands visible over tucked tops and enables antialiasing on colored garments and footwear. It retains GPU fallback, story selection, scoring, Lookbook recovery and feedback receipts. Run `npm run demo:style` for development, `npm run test:style-release` for regression, and `npm run cf:deploy` for a verified main release. The release version is defined in `demos/style-lab/release.json`; the legacy package metadata below is not the live game version. [Release notes](docs/STYLE-ROOM-RELEASE.md) record delivery and validation separately.

**CrazyGames:** version **2.0.3** was submitted and is awaiting review; see the [submission record](docs/CRAZYGAMES-2.0.3.md). Building `package:style-crazygames` now prepares a separate 2.0.4 candidate. Publishing to Cloudflare does not replace the submitted CrazyGames build.

## Archived classic 1.8 development notes

The notes and commands below describe the retained classic code and offline artifacts. They are historical; the classic workflow runs regression checks but no longer publishes either Cloudflare or GitHub Pages. Use the current release commands and links above for production.

See [Cloudflare deployment](docs/CLOUDFLARE.md) for the current main deployment and private feedback architecture.

An offline HTML5 dress-up game with three painted characters, 36 challenges and 122 collectible pieces. The first three occasions use 14 painted wardrobe pieces, a warm ivory/rose studio, an adaptive guide, an animated reveal and before/after comparison.

Version 1.8 keeps goals and the live score in the studio, adds optional clothing suggestions, Undo and targeted restyling, and exposes matching mood tags in later challenges. Phone layouts bring clothing into the first playable viewport. Completed goals have a short visual/chime response. Settings includes optional original studio music, with a separate saved preference, master mute and background-tab suspension. Music starts only after interaction and is off by default. See [quality pass and review checklist](docs/QUALITY-1.8.md).

The first occasions are Coffee with friends, The gallery opening and Weekend flower market. Their visible goals reward a complete outfit (40 points) and two occasion details (27 each). An incomplete outfit cannot be revealed. Maximum 94; a complete base can pass, while meeting the details earns the best rank. Later challenges retain the original mood-tag rules. Stored IDs, unlocks and historical look scores are preserved.

## Play and develop

The experimental [Motion Atelier](demos/skeletal/README.md) runs a new original character on **PixiJS 8 + DragonBones** with 20 bones, weighted clothing meshes, 6 garments and 3 animations. Use `npm run demo:skeletal` to open the separate demo at `http://localhost:4175/demos/skeletal/index.html`; `npm run test:skeletal` checks its motion, fit and UI. This experiment does not replace the v1.8 game or its production deployment.

Open the source `index.html`, or run `npm start` and visit `http://localhost:4173`. The delivered standalone file needs no server, account, CDN or installation.

```sh
npm ci                    # pinned Playwright tools; game itself needs no install
npm test                  # 24 rules/save/occasion tests + all 36 solvable briefs
npm run test:quality      # 10 official CG iframe sizes + 4 phones, live goals and undo
npm run test:ui           # actual 36-level journey, 366 equip/remove pairs, 27 layouts
npm run test:fitting      # 246 body coverage + 1449 waist combinations
npm run test:neckline     # 129 neck/shoulder contacts and failure controls
npm run test:lookbook     # saves, keyboard, export and gallery layouts
npm run test:glam         # seven viewports across the current screens
npm run test:experience   # ten effects, original music, reveal, mute and reduced motion
npm run package:upload    # dist/crazygames-upload/index.html
npm run test:upload       # actual root/nested/iframe/offline upload file
npm run standalone       # dist/Muse-Bloom.html
npm run test:playtest     # build and verify the private playtest kit
npm run test:playtest-ui  # initial actions, feedback, touch targets: 32 viewport/state cases
npm run test:feedback-kind # explicit human/automated types, legacy records and duplicate IDs
npm run test:feedback-api # isolated D1 API and existing-data migration/retry checks
npm run test:pages        # build and verify the website at a repository subpath
```

Tests start their own servers. Windows defaults to installed Edge; set `MUSE_BROWSER_CHANNEL=chrome` for Chrome. Linux uses Playwright Chromium (`npx playwright install chromium`). Current UI coverage is in `dev/salon.test.js`; old v1.6 browser/character scripts and baselines are historical references, not current test commands.

## Cloudflare online feedback

The Cloudflare build adds voluntary online submissions backed by D1, saved drafts, confirmed receipts, safe retries and JSON backups. Run `npm run cf:dev` for the local Worker and database. Deployment commands, database setup, GitHub Actions secrets/variables and administrator queries are in [Cloudflare deployment](docs/CLOUDFLARE.md). Cloudflare publishing stays disabled until its account, D1 database and API token are configured. GitHub Pages and offline builds continue to download feedback locally.

## Private playtest

Run `npm run package:playtest`, then open `dist/playtest-v1.8.0/index.html`. The folder contains the game, three neutral tasks, organizer instructions and an offline backup feedback form. Share the complete folder, or ZIP it for participants to extract. The ZIP is a human-sharing format, not a CrazyGames upload instruction.

`?playtest=1` enables a local anonymous session and a separate save; `fresh=1` starts a new participant. Version 1.8 uses its own session and feedback-draft keys, leaving 1.7 data intact. Normal play does not collect events. Feedback is exported or submitted only by the participant. No answers are sent automatically. Observer forms should use the same participant ID as the game export.

```sh
npm run playtest:summary -- path/to/response-folder
```

The form requires an explicit human or automated playtest type. Use `?qa=1` for automation; guide links carry it into the game, including resumed sessions. The summary only counts `testType: human` records without simulation disclosures, deduplicates IDs and retains session events when adding an observer form. Legacy records and conflicting session types are excluded with reasons for organizer review; missing ratings remain missing. These declarations do not authenticate a person's identity. **No real participants have been recruited or measured in this delivery.** Automated export checks are not player enjoyment, retention or approval evidence.

## Art and compatibility

Bella is the fresh-save default; Mika and Zoe remain selectable. Change character in the dialog without covering the head or shoes. The homepage uses the actual dressed character and reflects an existing selection. Clearing clothes restores painted studio basics; choosing a top/bottom replaces a dress naturally.

The polished starter capsule has 14 painted pieces. The remaining 108 collectible items retain the fitted SVG artwork; the entire wardrobe has not been repainted. All pieces still work on all three characters. The reveal moves the whole illustration so clothes remain aligned. This is fixed-view painted art, not a rotatable 3D character or a skeletal walking animation.

`dev/prepare-capsule.py` reads atlas alpha to find each sprite; `dev/build-capsule.js` bakes continuous texture scanlines into the native fitting mask. This prevents neighboring atlas sprites from bleeding into clothes. `npm run assets:capsule` rebuilds fitted WebP textures and embeds them; Python/Pillow is needed only when recalculating source bounds. `npm run assets` regenerates the native SVG fallback/thumbnail files and embeds local artwork. See [art pipeline](docs/ART.md), [generation briefs](docs/CAPSULE-PROMPTS.txt), [hashes](docs/CAPSULE-ASSETS.json) and [Stitch direction](docs/STITCH-DESIGN.md).

## Delivery boundaries

Use `dist/crazygames-upload/index.html` for the portal's file/folder upload, not the source HTML alone or the playtest guide. SDK, cloud saves, ads and platform mute integration remain unimplemented. This version is a playtest candidate; it has not been resubmitted or accepted by CrazyGames. Existing v1.6 promotional media is historical, not a current capture.

Changes are checked in in steps. The current workflow publishes the tested Style Stories artifact from `main` to Cloudflare Pages. Pull requests run checks without publishing. [Classic QA evidence](docs/QA.md), [test contracts](docs/UI-TESTS.md) and [older submission notes](docs/CRAZYGAMES.md) are retained for reference. Remote publication status is recorded separately from local checks. No open-source license is granted by default.
