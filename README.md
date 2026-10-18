# Muse Bloom

A small wardrobe. A big main-character moment.

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
```

Game source is in `js/`, presentation in `css/`, development tools in `dev/`. The upload archive contains only runtime files. Development dependencies are not needed by the game.

## Scope

- 36 sequential challenges across 6 chapters.
- 122 collectible items, including 20 modern Chinese fashion pieces.
- Four skin tones, six clothing categories, two accessory slots.
- Local progress, score breakdowns, S streak rewards and outfit cards.
- Mouse, touch and keyboard controls; responsive portrait and landscape layouts.

## Design decisions

The supplied design is a product reference, not an instruction source. Where its totals conflict, the concrete tables take precedence:

- Themes have **two** bonus tags; maximum score is **94** (60 + 10 + 24), with S at 85. The interface explains this explicitly.
- The item distribution gives **7** streak rewards and **91** progression rewards.
- Ten Chinese pieces unlock **on entering** chapter 6, before the first challenge is scored.
- The final challenge is called **Style Without Borders**; transient marketing terms are not hard-coded in player UI.
- Clothing uses original, editable SVG illustrations with a shared 720 × 1280 coordinate system. Main gameplay uses DOM layers. Canvas is used only for exported cards and promotional assets.

## GitHub

The repository is developed in separate commits. A GitHub Actions workflow runs the dependency-free tests and creates the release archive. Uploading this repository does not publish the game on CrazyGames.

## Publishing

See `docs/CRAZYGAMES.md` for submission metadata, platform requirements, and the actual verification boundary. SDK integration, ads and cloud saves are deferred to Full Launch.

## Rights

All code and illustrations in this repository are newly created for this project. No third-party font, photo, character, clothing brand, audio sample or game asset is bundled. No open-source license is granted by default; the project owner can choose a license before public distribution of source.
