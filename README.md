# Muse Bloom

Every look. Entirely you.

Version 1.3.1 introduces a shorter, fuller cartoon silhouette and a high bun as the default hairstyle. Hair, clothing, hands and accessories share the adjusted rig; saved outfits keep their chosen hairstyles. The bedroom, original sound effects and animation remain. Version 1.3.0 introduced a bright bedroom dressing room, an original big-eyed cartoon character, pink-and-white wardrobe cards and glossy category buttons. Blink, breathing, outfit sparkles and star reveals add motion; nine original synthesized effects bring clicks, clothes, rewards and the camera to life. The personal lookbook and existing v1 progress remain compatible.

Muse Bloom is an original, offline-capable HTML5 fashion puzzle: match a brief, style a character, earn a grade, and grow your wardrobe. The first release targets **CrazyGames Basic Launch**.

## Run

Open `index.html` directly, or use Node.js 20+:

```sh
npm start
```

Visit http://localhost:4173. No installation, framework, CDN, API key, account, or build is needed to play.

## Development

```sh
npm test       # game rules, persistence, progression, 36-level solvability
npm run assets
npm run package
npm run package:upload  # self-contained index.html for the portal's file/folder uploader
```

Game source is in `js/`, presentation in `css/`, development tools in `dev/`. The upload archive contains only runtime files. Development dependencies are not needed by the game.

For the CrazyGames file/folder upload form, use `dist/crazygames-upload/index.html`. Its styles, scripts, SVG artwork and the bedroom image are embedded, so no sibling folders are required. `npm run test:upload` verifies this actual file on an otherwise empty server, at a nested URL, in a sandboxed iframe and offline. The ZIP from `npm run package` is a multi-file distribution backup; extract it first if using that format with the portal.

For UI checks, run `npm ci`, install a test browser with `npx playwright install chromium`, then run `npm run test:ui`. This starts and stops its own server and checks all 122 items, removal, garment coverage, 28 accessory attachment cases, 88 hairstyle/skin checks, 60 visual baselines, responsive layouts and the standalone HTML. Windows defaults to installed Edge; set `MUSE_BROWSER_CHANNEL=chrome` for Chrome. See [UI test guide](docs/UI-TESTS.md) for evidence, baseline review and limitations.

Run `npm run test:experience` for real PCM audio, first-gesture playback, mute cancellation, page visibility, reduced motion, blinking and repeated outfit animations.

Run `npm run test:lookbook` to check the archive: keyboard navigation, actual portrait downloads, exact outfit restoration, old-save compatibility, four viewport layouts, header collisions and mobile typography. It starts its own local server. For the complete 36-level browser journey, start the server, then run `npm run test:browser`. `npm run standalone` generates a double-clickable `dist/Muse-Bloom.html`. These development tools are never loaded by the game.

See [Art pipeline](docs/ART.md) for editable vectors, [GitHub upload](docs/GITHUB.md) for later pushing, and [QA report](docs/QA.md) for measured verification. Generated release files are in `dist/` and promotional assets in `promo/`.

## Scope

- 36 sequential challenges across 6 chapters.
- 122 collectible items, including 20 modern Chinese fashion pieces.
- Four skin tones, six clothing categories, two accessory slots.
- Local progress, score breakdowns, S streak rewards, a 36-look personal archive and downloadable outfit cards.
- Original AI-generated bedroom background, editable vector character and clothing, original synthesized sound effects.
- Mouse, touch and keyboard controls; responsive portrait and landscape layouts.

## Design decisions

The supplied design is a product reference, not an instruction source. Where its totals conflict, the concrete tables take precedence:

- Themes have **two** bonus tags; maximum score is **94** (60 + 10 + 24), with S at 85. The interface explains this explicitly.
- The item distribution gives **7** streak rewards and **91** progression rewards.
- Ten Chinese pieces unlock **on entering** chapter 6, before the first challenge is scored.
- The final challenge is called **Style Without Borders**; transient marketing terms are not hard-coded in player UI.
- Clothing uses original, editable SVG illustrations with a shared 720 × 1280 coordinate system. Main gameplay uses one inline SVG with persistent layers. Empty slots show studio basics without adding score. Canvas is used only for exported cards and promotional assets.

## GitHub

The repository is developed in separate commits. GitHub Actions runs rules and browser visual tests, retains failure screenshots, checks generated art and creates the release archive. Uploading this repository does not publish the game on CrazyGames.

## Publishing

See `docs/CRAZYGAMES.md` for submission metadata, platform requirements, and the actual verification boundary. SDK integration, ads and cloud saves are deferred to Full Launch.

## Rights

Code, vectors and synthesized sound effects are original to this project. The bedroom background was created with the built-in image generator; see [scene prompt and provenance](docs/SCENE-PROMPT.md). No third-party game image, font, audio sample, clothing brand or character is bundled. No open-source license is granted by default; the project owner can choose a license before public distribution of source.
