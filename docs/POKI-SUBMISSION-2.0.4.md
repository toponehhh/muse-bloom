# Poki submission — Muse Bloom 2.0.4

Submitted on **2026-10-24 at 21:43 (Asia/Shanghai)** through the [official game submission form](https://developers.poki.com/guide/share).

**Status: submission received; not approved or published.** After one actual submission request, the endpoint returned HTTP 201 and the page displayed **“We received your game submission!”**. No application ID or decision date was displayed. The browser session was closed after saving the confirmation.

## Submitted game

- Title: **Muse Bloom**.
- Playable browser build: **https://muse-bloom.pages.dev/**, using normal progression without QA parameters.
- Verified release: **2.0.4**, source `52b52c2ff323798da63208b7da03a7c97655c997`.
- Content: 36 challenges, six chapters, 122 collectible wardrobe pieces, scoring and a persistent Lookbook.
- Engine form option: **AI/Claude/ChatGPT**. The description explicitly identifies JavaScript/PixiJS and AI-assisted development and artwork.
- Developer: an individual developer, no registered company, based in China, team size one, first game. Contact details were supplied by the owner and are intentionally excluded from the repository.
- Existing availability: self-hosted browser playtest only; not published on third-party game portals or app stores.
- Poki SDK: not integrated in this intake build; explicitly disclosed in the application. This was an initial game pitch, not a claim that platform integration or publication requirements are complete.

## Application text

### Game description

Muse Bloom is a cozy dress-up game set in Mira's sunlit room. Players style outfits for 36 everyday story challenges, follow three styling notes, reveal their score, unlock wardrobe pieces and save favorite looks in a Lookbook. It combines relaxed self-expression with clear outfit goals, free retries and no timer. Built with JavaScript/PixiJS using AI-assisted development and artwork.

### Fit for Poki

Mouse/touch selection gets players straight into styling without an account or download. Short scenario challenges, immediate visual changes and readable score feedback encourage trying another look, while 122 collectible pieces and a persistent Lookbook support longer play. The cozy room setting and everyday themes aim to appeal to players who enjoy creative, relaxed browser games. This is our first game; we welcome playtesting feedback and are ready to iterate. Poki SDK integration is not yet included in this submission.

## Screenshots and verification

The form required three static PNG/JPEG/WebP screenshots of actual gameplay, each no larger than 5 MiB. These three unedited PNG captures were uploaded:

| File | Scene | Bytes |
| --- | --- | ---: |
| `01-wardrobe.png` | First challenge, cardigan and trousers | 931914 |
| `02-evening-look.png` | Second challenge, Lavender Day Dress | 942489 |
| `03-score-and-rewards.png` | Second challenge result, score and rewards | 597142 |

Captured from the published main site with sandboxed local ungoogled Chromium at 1440 × 1040. Progression and clothing changes used the real UI, without injected unlocks or test hooks. All three images were visually inspected; the successful capture run reported no page errors. One preceding cold-load capture attempt timed out; the later capture completed normally. This submission does not resolve or establish the cause of that intermittent timeout.

The [Poki Content & Brand Guidelines](https://developers.poki.com/guide/content-player-safety), including originality and AI usage guidance, were read before checking the form's acknowledgement. This is distinct from Poki assessing whether the game meets its standards.

The first two preparation attempts stopped before sending any submission: one followed a form initialization reset, and one encountered a screenshot-input assertion although the page had already accepted the files. The successful attempt verified the rendered attachment list and completed field values before submitting. Only one submission POST was sent.

Local evidence is under ignored `artifacts/poki-submission-20261024/`. The contact data and filled-form screenshot are private local records, not published attachments. The confirmation screenshot and `submission-status.json` record the successful response. No game code, hosting configuration, SDK integration, or deployment changed for this application.

## Next step

Wait for Poki to contact the submitted email address. Developer-platform access, SDK integration, player testing, publishing terms and final release remain separate steps. No release agreement or exclusivity commitment was made through this intake form.
