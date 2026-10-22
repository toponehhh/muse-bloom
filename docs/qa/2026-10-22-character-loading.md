# Style Room character rendering investigation — 2026-10-22

Tracker: [GitHub issue #5](https://github.com/toponehhh/muse-bloom/issues/5), open. The issue contains a redacted text summary, with no media attachments.

## Scope and baseline

- Finding: **Style room never renders character or outfit; Details view stays empty**.
- Reported target: `https://style-room.muse-bloom.pages.dev/?v=2.0.1&qa=1`.
- Source reviewed: `12e51f8b34a818f50f0e489d6932a53d6b92327e` (v2.0.1).
- The captured Mo finding does **not** record its tested commit, browser, OS, GPU, or renderer. The reviewed source commit must not be represented as the finding's recorded revision.
- This investigation preserves the served build, user data, and Mo triage. No new QA session, recheck, deployment, or synthetic feedback submission is authorized by this investigation.

## Reported behavior

1. Open the target while signed out, at **Coffee with friends**.
2. Select **Bottoms → Ivory Pleats**, then **Shoes → Petal Mary Janes**; **Cloud Tee** is the starter top.
3. The item checkmarks, Undo state, and hint text update, but the left panel only shows the room.
4. Select **Details**. No character or clothing detail becomes visible.

Expected: a visible character wearing the selected items, with a visible close-up in Details.

The supplied Mo finding names an independent reproduction agent and a review timestamp, but that is a report of reproduction, not a fix verification. Its recording reference is not an attached screenshot, playable video, or an inspected console log.

Separately, the existing feedback database has a report with three screenshots showing the empty room after Details, after reveal, and after restoring a saved look. The reveal screenshot shows completed progress and a Lookbook entry without the result dialog. These images were inspected locally. Their provenance cannot establish an additional independent vendor reproduction: the feedback records do not identify the browser or testing provider.

## Existing local observation — not a new recheck

Before the read-only Mo investigation, local headless ungoogled Chromium probes were saved on 2026-10-22 at approximately 11:48 Asia/Shanghai:

| Configuration | Existing result |
| --- | --- |
| Windows, Intel Iris Xe / ANGLE D3D11, WebGL 2, 1920 × 1080 | Character visible; equip, Details and reveal worked |
| Same renderer, 1280 × 720 | Character visible; equip, Details and reveal worked |
| Same machine with WebGL 2 creation disabled, WebGL 1, 1920 × 1080 | Character visible; equip, Details and reveal worked; WebGL warnings were recorded |

These probes used `test=1`, explicitly rendered and extracted model pixels before taking screenshots. They are **not** an exact reproduction of the reported environment, and the extra render may hide a timing/compositing problem. They neither disprove the report nor verify a fix. There is no new post-change recheck result.

## Source findings

All references below describe the baseline commit above.

- `demos/style-lab/style.css:5` paints the room as a CSS background. The character and floor shadow are drawn on a separate Pixi canvas. A visible room therefore does not establish that the character renderer is working.
- `demos/style-lab/src/campaign-renderer.js:14` requests WebGL. `campaign.js:84` marks startup ready after initialization and setup; it does not establish that character pixels reached the screen.
- `demos/style-lab/src/campaign.js:76` calls `renderer.resize()` before updating the Full look / Details pressed state. If a rendering call throws, the visual selection update is skipped. This is a possible failure path, not evidence that it happened in Mo.
- `demos/style-lab/src/campaign.js:56` saves the challenge result before calling `renderer.portrait()`, while opening the result dialog happens afterward. A portrait exception would leave updated progress without the result dialog.
- `demos/style-lab/src/campaign-renderer.js:88` temporarily changes the model transform for portrait extraction but restores it only on success; there is no `finally`. This is an exception-safety gap, not an established cause of an empty room on first load.
- `demos/style-lab/src/feedback.js:14` records viewport and reduced-motion preference, but not browser, renderer, context loss, or runtime errors. Current feedback alone cannot identify the failing rendering environment.
- Pixi has its own WebGL context-lost/restored listeners. The application has no user-facing recovery state for a blank or failed render after startup. Do not describe this as a complete absence of library context handling.

No source defect has yet been tied to the initial empty character with a stack trace, failed request, or matching reproduction. Do not replace the renderer or claim a fix based solely on these failure paths.

## Evidence and verification boundaries

Private session identifiers, participant identifiers, raw feedback, screenshots, replay data and credentials are excluded from this public-ready note. No media attachments have been uploaded; local files are not tracker attachments.

The official `mo-qa` skill is installed in `.agents/skills/mo-qa/` and pinned by `skills-lock.json`. The native Windows npm package named `qa` resolved to an unrelated VollQ CLI; it was removed without receiving session information or credentials. The official Momentic CLI 0.27.0 was installed through its published installer into an ignored task-local directory under WSL. Command help was checked. The first read-only `status` request returned `MO_AUTH_REQUIRED`; account authorization is pending.

Still needed before choosing a rendering fix:

- The finding's existing console and network entries, plus actual browser/renderer and tested revision if available.
- A native screenshot or video showing the browser output, if available; a replay reference alone cannot rule out a canvas capture problem.
- After explicit authorization, a focused reproduction without forced render/extract calls, followed by a separately recorded fix recheck on a known revision and environment.

Disposition at this point: **reported rendering defect; root cause unconfirmed; not fixed or rechecked**. No Mo triage disposition has been changed.
