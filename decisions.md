# Decisions

## 2026-07-27 — Polyglot card links to `polyglot.bang-labs.eu`, not deployed yet
Added a `polyglot` entry to `projects.js` pointing at `https://polyglot.bang-labs.eu`,
matching the existing `*.bang-labs.eu` subdomain convention used by the other
project cards. Per `Bang-Labs/CLAUDE.md`, only the API ingress
(`polyglot-api.bang-labs.eu`) is currently live — the frontend subdomain isn't
deployed yet, so this link will 404 until that's set up. User chose this over
linking to the GitHub repo instead.

## 2026-07-27 — polyglot.webp generated via local Playwright screenshot
No `screenshots/polyglot.webp` existed. Ran the Polyglot app locally
(`polyglot/backend` Flask + `polyglot/frontend` Vite) and captured a screenshot
with a throwaway Playwright/Chromium install (pip-installed into a scratch venv,
not added to either repo) rather than waiting for a manually-provided image.
`psycopg2-binary==2.9.9` (pinned in `polyglot/backend/requirements.txt`) fails
to build on this host's Python 3.13/aarch64 — installed unpinned `psycopg2-binary`
(resolved to 2.9.12) locally only, for this one-off screenshot session; did not
touch the repo's `requirements.txt`. Resized/converted the capture to 960x600
webp to match the other five project screenshots' dimensions and format exactly.

## 2026-07-27 — Fixed iOS freeze: bang.js's global click handler didn't exclude the project modal
User reported the live site (bang-labs.eu) freezing/becoming unresponsive on iOS
Safari after the Projects section shipped. `bang.js` fires a full particle-explosion
+ Web Audio thunder synthesis on every `document` click that isn't on `a, button,
.lang-switcher` — the `.project-modal` (added in the same round of work as the
Projects section) was never added to that exclusion list, so every tap inside the
modal (backdrop, description text, header — anything but the close button or
"Visit →" link) silently triggered a full burst underneath it. Verified with a
Playwright WebKit harness (iPhone UA/viewport) spying on `CanvasRenderingContext2D
.arc()` calls: 4 taps inside the modal produced 356,895 extra draw calls on the
unfixed code vs. 0 with `.project-modal` added to the skip selector. Installed
Playwright's WebKit browser + `install-deps` (passwordless sudo works on this host)
specifically to get a real WebKit engine for this repro, since Chromium wouldn't
reproduce a WebKit-specific interaction bug. Fix: `bang.js`'s click listener now
also skips `.project-modal`.

## 2026-07-29 — Slow initial load on iOS: skip audio synthesis on the automatic page-load bang
User reported bang-labs.eu "quite slow to load" on iOS after the above fixes shipped
(distinct from the earlier freeze — that stayed fixed). `bang.js` fires an automatic
`bang()` from the center of the screen on every page load, and `bang()` unconditionally
calls `soundThunder()`, which creates a `Web Audio` `AudioContext` and synthesizes three
noise buffers (~40ms of synchronous work measured in WebKit on this host, generating
buffers directly with `Math.random()` in a loop) — all before any user gesture. Browsers
require a user gesture before audio can play, so this initial synthesis is entirely
wasted work with zero audible effect, sitting on the critical page-load path. iOS
Safari's `AudioContext`/`AVAudioSession` initialization is documented to be
substantially heavier than desktop/Android and isn't reproducible in this sandboxed
Linux WebKit build (no real audio backend), so the real-device cost is likely much
higher than the ~40ms measured here. Fix: `bang(x, y, silent)` now takes a `silent`
flag; the automatic load-time bang passes `true` and skips `soundThunder()` entirely.
Click-triggered bangs are unaffected (verified: 0 `AudioContext`s created on load, 1
created after the first click). Also re-encoded `screenshots/polyglot.webp`
(quality 90 → 70, `method=6`): 55KB → 34KB, in line with the other five screenshots
(4–24KB) that get eagerly preloaded on every page load via `projects.js`; visually
identical at normal viewing size.
