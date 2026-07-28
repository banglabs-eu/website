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
