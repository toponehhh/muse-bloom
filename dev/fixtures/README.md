# Feedback preview fixtures

- `feedback-valid.webm`: a 3,704-byte synthetic canvas recording made for the project's upload tests. It contains no tester data. Use it to check real video decoding and the upload/retry path without depending on MediaRecorder timing during each test run.
- `feedback-header-only.webm`: a 110-byte, incomplete WebM produced by a failed synthetic recording in the local Chromium test. Its container signature passes format checks, but the browser cannot decode it. This reproduces the black 0:00 player and verifies the preview warning.

Preview decoding and upload validation are separate: an unsupported browser codec must not prevent a signature-valid attachment from being submitted for the team to inspect.
