# Style Room character rendering investigation — 2026-10-22

Tracker: [GitHub issue #5](https://github.com/toponehhh/muse-bloom/issues/5), open. Only redacted text is published; there are no media attachments.

## Scope and preserved baseline

- Finding: **Style room never renders character or outfit; Details view stays empty**.
- Reported target: `https://style-room.muse-bloom.pages.dev/?v=2.0.1&qa=1`.
- Reviewed source: `12e51f8b34a818f50f0e489d6932a53d6b92327e` (v2.0.1). The Mo finding does **not** record its tested commit; this source revision must not be presented as a recorded Mo revision.
- Existing Mo status, transcript, report manifest and finding evidence were retrieved read-only after the user authorized account access. Export time: **2026-10-22 05:24:02 UTC**. The preserved baseline has four open bugs, no triage decisions, and two `issues_found` verdicts; these are reproduction findings, not fix verification.
- The user subsequently explicitly authorized **local targeted regression** of GPU-unavailable rendering, Details, scoring, saved looks and portrait failures. No Mo resume, remote QA, deployment or triage change was authorized or performed.
- Original exports and the prior local package remain under ignored investigation artifacts. The prior package records source `34537dce331491d8cd01c278b77e0f1c118543ba`; it is not mislabeled as the reviewed source. The negative control was separately rebuilt from Git source `12e51f8` with the installed locked dependencies.

## Reproduction and evidence

1. Open the target while signed out, at **Coffee with friends**, with starter **Cloud Tee**.
2. Select **Bottoms → Ivory Pleats**, then **Shoes → Petal Mary Janes**.
3. Item checkmarks, Undo and the hint update, but the left preview only shows the room.
4. Select **Details**. No character or clothing becomes visible.

Expected: the character wears the chosen pieces and Details shows a close-up.

The exact finding's reproduction-scoped evidence contains:

- Successful HTTP 200 completion for the document, script, styles and all seven game PNG assets. The captured entries do not support a missing-image diagnosis.
- At approximately +3.9 seconds, `CanvasRenderer: filter "mn" is not supported in Canvas2D and will be skipped.`
- Immediately afterward, repeated `Cannot read properties of undefined (reading 'validateRenderable')` errors through rendering, resize and the animation ticker. The Details click hits the same path.
- Related result/collection findings contain the same error through `CampaignRenderer.portrait` and `showResult`.
- Request headers report headless Chromium 148 with a Windows user agent. This does **not** establish the actual operating system, GPU or launch arguments; those remain unknown.

The exact finding has **no attached screenshot or MP4** in its export. Its rrweb artifact is a replay, not a video. Sampled frames from the three related findings' MP4 recordings were inspected locally; they show an empty room and a saved-look placeholder. This is not a review of every video frame.

Existing feedback screenshots also show an empty room after Details, reveal and Wear again. The recovered transcript ties those feedback submissions to the same Mo session; they are not counted as independent evidence from a second testing vendor.

Before Mo retrieval, local WebGL 2 and WebGL 1 probes displayed the character. Those older probes used `test=1` and forced rendering/extraction, so they did not reproduce the failing Canvas2D path and were not fix verification.

## Confirmed failure mechanism

1. The room is a CSS background; the character is drawn on a separate Pixi canvas. Background visibility says nothing about successful character drawing.
2. In pinned Pixi **8.22.0**, `preference: 'webgl'` still permits automatic fallback to Canvas2D when GPU contexts are unavailable.
3. The supplied mesh rendering pipe registers for WebGL/WebGPU, not Canvas. Characters and fitted clothes use `Mesh`; Canvas's render-pipe lookup therefore returns `undefined`, and `validateRenderable` throws. GPU-only color filters are also unsupported in Canvas.
4. Details invokes resize/render before updating the selected view. The exception interrupts both drawing and the button state.
5. Reveal saves progress before portrait capture and opening the dialog. A capture exception consequently leaves saved progress without visible results. The old capture also restored the character transform only on success.

Local negative control reproduced this chain on **2026-10-22 05:43 UTC**, with Windows, headless ungoogled Chromium **150.0.7871.255**, 1920 × 1080, WebGL context creation returning null and WebGPU unavailable. Using the separately rebuilt `12e51f8` source: the room remained empty, `validateRenderable` threw, Details stayed unpressed, and Reveal left **1 / 36 completed** with the result dialog closed. Native screenshots were inspected without forced rendering or model extraction.

## Focused fix

- Register a Canvas mesh pipe that draws the existing fitted/deformed triangles, preserving pose, layering, UVs, tint and transparency. WebGL keeps its original renderer.
- Apply garment color matrices on Canvas textures, with a bounded eight-entry bitmap cache. Cap the Canvas ticker at 24 FPS. This is a fallback, not a claim of equal GPU performance.
- Overlap triangle edges in screen pixels to remove visible antialiasing seams; cropped texture sampling includes that overlap.
- Restore the character transform in `finally` after portrait generation.
- When portrait generation fails, still show the saved score and next action, remove any stale image, disable image download and explain the missing picture. Successful later captures recover normally.
- Add `npm run test:rendering` to the existing Style Room release checks. Commits use `[skip ci]`; no remote workflow was requested during this investigation.

Implementation commits: `5357c78`, `d988ff9`, `d05a06b`.

## Local verification record

The first local run at `d988ff96b3d882401fb96b0e372e489e1e295dcc` passed all four functional scenarios. Screenshot review then exposed fine triangle seams; `d05a06b` corrected the overlap and strengthened restoration checks.

Final run: **2026-10-22 05:46:35–05:49:37 UTC** (13:46–13:49 Asia/Shanghai).
Revision: **`d05a06b3ffb82b762e5c7df08d683ba5671e0b4a`**.
Environment: Windows, headless ungoogled Chromium **150.0.7871.255**, Playwright **1.62.1**, Node **23.6.1**, sandbox enabled, isolated local HTTP server and browser contexts. No production feedback submissions.

| Scenario | Result |
| --- | --- |
| WebGL, desktop 1920 × 1080 | Pass: visible initial character and changed clothes, Details zoom, score/result image, saved-look restoration after Reset, next level and reload |
| GPU APIs unavailable → Canvas2D, desktop 1920 × 1080 | Same flow passed, no missing mesh/filter warnings |
| GPU APIs unavailable → Canvas2D, phone-sized viewport 390 × 844 | Same flow passed; viewport simulation, not physical-phone validation |
| Canvas2D, forced portrait extraction exception at 1280 × 900 | Pass: readable persisted score, prior image removed, disabled download, restored character transform, next action visible, successful subsequent capture |

The original selected outfit scored **40** in all three normal scenarios. All three produced a 600-pixel-wide result image; progress became 1 / 36 and the next challenge opened. The error-injection scenario kept its **67-point** score readable. No unexpected page errors or normal-flow console warnings were recorded.

The main flows use the public URL with `qa=1`, without `test=1`, forced renders or model extraction. Native screenshots compare the displayed character against the same stage with only its canvas hidden, and require head/body pixels. Details must visibly change the image. The separate extraction-failure injection uses the test hook.

Screenshots of the baseline, fixed full view, Details, phone results and portrait failure were inspected. The ignored `artifacts/campaign-rendering/report.json` records the final run; it is a local artifact, **not** a tracker attachment.

| Original finding | Current evidence |
| --- | --- |
| Style room never renders character or outfit; Details view stays empty | Same error reproduced on baseline; focused fix passes locally |
| 点击 Details 无法切换预览模式，仍停留在 Full look | Local Details button state and visible zoom pass |
| Wear again重新穿搭后房间仍为空，无法看到保存的搭配或角色 | Local Reset → saved-look restore → visible clothing pass |
| Reveal my look 完成挑战但没有可阅读的结果或后续按钮 | Local result/next-level flow and portrait-failure recovery pass |

These are local engineering results. **All Mo findings retain their original OPEN status; none has a new Mo fix-verification verdict.**

## Boundaries

This is focused local verification, not complete coverage of 36 levels, 122 pieces, all browsers, lost GPU contexts or mobile hardware. The original remote environment and tested commit remain unknown. No new Mo verification verdict exists, no CF deployment was performed, and no Mo triage or issue closure was changed.

Private session identifiers, participant identifiers, credentials, raw logs, recordings and feedback remain excluded from this note and the public issue. Local evidence paths are not attachment links.
