# Feedback dismissal and frontend caching — 2026-10-22

## Cause

The shared feedback client persisted and displayed a validated receipt but had no success notification for the host UI. Style Room therefore never called `HTMLDialogElement.close()`. Its CSS displays `#feedback[open]`; the open native dialog, rather than a stray z-index rule, kept the backdrop and modal visible.

The regression test reproduced this using the preserved **2.0.2** artifact, source **`8e9e40497ced0eb558af31ca55d2de20d73b5eb7`**, through an isolated local Pages/Worker/D1 fixture. A successful response displayed the receipt but the assertion that the dialog closed timed out. The screenshot confirmed the visible dialog/backdrop. The original hosted build already returned `Cache-Control: no-cache`; stale asset caching was not required to explain the defect.

## Fix and release

Source **`7e0ed73dcfb82c5600c6895ad1c7b6021b3cbcfb`**, release **2.0.3**, on existing branch `feat/pixi-skeletal-demo`:

- Add an optional `onSuccess` callback to the shared client. Call it after validating the receipt and restoring the disabled controls, or when resubmitting an already confirmed unchanged record. Reading/restoring the form does not invoke it.
- Style Room closes the native dialog, restores focus to Feedback and displays the receipt in a separate accessible status element in the game. Failures, invalid receipts and pending requests stay open. Offline JSON downloads retain their existing behavior.
- Version all four frontend JS/CSS references with the corresponding file's SHA-256 prefix. Packaging verifies that each HTML reference matches its manifest entry.
- Revalidate static assets with `Cache-Control: no-cache, max-age=0, must-revalidate`. No service worker was added; player storage is unchanged.

The user explicitly authorized frontend redeployment. Cloudflare Pages project `muse-bloom`, alias `style-room`, now serves [2.0.3 QA](https://style-room.muse-bloom.pages.dev/?v=2.0.3&qa=1). Immutable deployment: [37e8a08c.muse-bloom.pages.dev](https://37e8a08c.muse-bloom.pages.dev). Existing feedback Worker, D1 and R2 configuration were not changed.

## Local verification

`npm run test:style-feedback` passed on the exact published source: **2026-10-22 15:07–15:08 Asia/Shanghai**, Windows, sandboxed headless ungoogled Chromium **150.0.7871.255**.

- 1440 × 1000 and 390 × 844: pending requests, consent errors, 503 responses and invalid 200 receipts preserve the open form and answers; valid receipts close it, clear the modal top layer and restore focus.
- Receipt remains visible outside the dialog, and real wardrobe controls remain clickable. Reopening, reload, confirmed duplicate submissions and revised answers work. The two viewport flows create exactly four automated records in isolated D1.
- Offline JSON export keeps the form open and produces no D1 record.
- The existing release test passes the first three challenges through real controls, then checks five feedback viewport sizes, upload limits, consent, screenshot/recording attachments, retry and idempotency through isolated Pages → Worker → D1/R2. The game remains usable after automatic dismissal.
- No unexpected page errors. Baseline and fixed mobile screenshots were inspected. Package verification confirms the manifest and asset references.

## Hosted frontend and cache verification

At **2026-10-22 15:11 Asia/Shanghai**, local Chromium visited the deployed HTTPS frontend at desktop and phone-sized viewports. All feedback API writes were intercepted in the browser, supplying 201/200 success, 503 failure and invalid receipt cases. All four hosted UI test groups passed; this confirms frontend behavior, not a new live D1/R2 submission. The original Mo session was not resumed or triaged.

Cache checks used ordinary requests and the old deployment's ETags:

- `/`, `/?v=2.0.2&qa=1` and `/?v=2.0.3&qa=1` all served HTML matching the 2.0.3 manifest. Every referenced JS/CSS URL returned the expected SHA-256 bytes and revalidation headers.
- Requests for the unversioned application JS and bundled CSS with their old ETags returned **200 with new bytes and new ETags**, not a stale 304.
- The checked browser contexts had zero registered service workers, no service-worker controller and no Cache Storage keys. Source contains no service-worker registration, so there was no application service-worker cache to clear.
- Pages handles its deployment cache when assets are redeployed; no zone-wide manual purge was performed or needed after these checks. See Cloudflare's [Pages caching behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/#caching-and-performance). Existing open tabs need a reload to execute the new bundle.

Ignored local evidence directories: `artifacts/campaign-feedback-baseline/`, `artifacts/campaign-feedback/`, `artifacts/campaign-feedback-live/`, `artifacts/campaign-feedback-cache/`, and `artifacts/style-release/`. These are local evidence paths, not tracker attachments. No live feedback or private media was uploaded during verification.
