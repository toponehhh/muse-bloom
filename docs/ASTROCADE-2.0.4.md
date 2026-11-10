# Astrocade · Style Stories 2.0.4

**Published and approved on November 2, 2026.** The existing Astrocade game was updated in place using the local Style Stories 2.0.4 source: 36 challenges, six chapters and 122 wardrobe pieces.

- [Public game](https://www.astrocade.com/games/muse-bloom-little-style-stories/01M5D05NJ2670M5744RNMKDWVH)
- Game ID: `01M5D05NJ2670M5744RNMKDWVH`
- Published version: `01M6DPM2XQTJ6RDKC18XQF29H4`
- Previous published version: `01M5H1E4H5S06X8D81KMNM71X2`
- Local source baseline: `96d4770` plus the new Astrocade adapter in this working tree.
- Uploaded HTML: 932,211 bytes; SHA-256 `3afc61698ad186996503f77fa73d362b97704af07a325308693f95d7dbbf6bf2`.
- Publish options explicitly confirmed by the creator: retain player saves and the leaderboard. Both flags were sent as `true`.

The MCP publish response was `submitted/approved`, with the message that the game is live. A subsequent game listing showed `public`, `approved`, and `unpublished_edits:false`; version history marked the new version both current and published. Downloading the saved files again confirmed the exact HTML hash and all 26 asset URLs, including the seven new original PNGs.

## Platform adapter

`dev/package-astrocade.cjs` builds a self-contained HTML entry from the original campaign sources without rewriting the shared rules or renderer source files. The extra sources are under `dev/astrocade/`.

```sh
npm run package:astrocade
```

The default output follows `demos/style-lab/release.json`: `dist/astrocade-style-stories-v<version>/`. The header and manifest use that same version. An output directory and an existing `game_config.json` may be supplied as arguments. The latter preserves a declared leaderboard configuration. Existing entries in an output `asset_map.json` are retained when rebuilding; the seven current CDN assets are added from `dev/astrocade/assets.json`. Building current `main` prepares a local candidate; it does not reproduce the historical 2.0.4 upload or publish it to Astrocade.

The adapter provides the fixed 720 × 1280 portrait layout, 96px controls and host-owned `run(mode)` entry point. Images are retrieved from Astrocade CDN assets. Game progress uses `lib.getUserGameState` and `lib.saveUserGameState`, with visible recovery for load/save failures, timeouts, delayed responses and explicit cloud/local conflicts. Editor preview never writes player saves.

The original three-scene cloud payload remains intact at the root. New campaign progress is stored separately under `museStyleStories`, and completed legacy occasions and outfits are mapped into the first three campaign challenges. Original 100-point results remain in the retained legacy fields; the new campaign uses its existing 94-point rules.

Astrocade prohibits browser storage, canvas pixel reads/exports and external feedback services. Thumbnails, Reveal and Lookbook use canvas rendering without reading or exporting pixels; the original meshes and skeletal poses are retained. Image-download and external feedback controls are hidden in this distribution. Astrocade's own player controls remain available. The original game name and cover are retained.

## Verification

- 51 strict-iframe checks: all 36 stories through Reveal/Next, 122 items unlocked, 36 Lookbook previews, Wear again, reload, Canvas2D fallback, legacy migration, retained original fields, edit mode and blocked browser APIs.
- 17 failure checks: rejected/false/timed-out saves, latest-snapshot retry, late old-save repair, protected unresolved loading, late empty state, and explicit cloud/local selection.
- 12 checks against actual CDN images and physical phone-size clicks: all categories, 94-point Reveal, touch targets, passive asset requests and no prohibited calls.
- After the complete gameplay/failure runs, only header readability and room-background readiness were adjusted; the final uploaded file passed the CDN/phone checks.
- The real public Astrocade page loaded `STYLE STORIES · 2.0.4`, reached ready state with Reveal enabled, and opened/closed the 36-challenge map after its Play cover was dismissed. No page runtime errors were captured in that successful live check.

Local API failure tests used controlled responses. Publication retention flags and legacy preservation were verified; this does not claim that every existing player's personal save was inspected. Search reindexing is a separate platform concern and was not tested by this release.

Detailed evidence is in the task artifact directory `astrocade-publish-20261102`, including `release-record.json`, pre-update `source/`, verified `candidate/`, downloaded `published/`, and the test JSON/screenshots under `outputs/`. No Git push, Cloudflare deployment or other portal update was performed by this Astrocade release.

## Repository check-in — November 10, 2026

The previously uncommitted adapter is now retained in Git. The builder reads its output version, header and manifest metadata from the current release configuration. Packaging current `main` as a local 2.0.5 candidate and `npm test` both passed. This check-in does not publish a new Astrocade version; the live verification above belongs to the November 2 release.
