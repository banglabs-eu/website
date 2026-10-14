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

## 2026-10-14 — Product pages for Snippets and Tasks live in this repo, at `/snippets/` and `/tasks/`
Task snippet 1320 asked for the marketing/information sites for both products to
be redone around the two slogans ("snippet everything you know", "tasks
everything you do"), and noted Tasks had no site at all. Tasks is not a separate
product with a domain — it is a view inside the Snippets app
(`snippets.eu/app/tasks`) — so giving it a `*.bang-labs.eu` subdomain would have
meant a tunnel hostname and a deploy target for two static pages. Put both under
bang-labs.eu instead: `snippets/index.html` and `tasks/index.html`, served by the
same GitHub Pages deploy as the apex, no new DNS and no new pipeline.

## 2026-10-14 — The project modal gained a second action, rather than becoming the page
The owner's framing was "link from bang-labs.eu just like I have links to Snippet
with the informational module that comes up first". The informational module is
`projects.js`'s modal, and it had exactly one action (`Visit <name> →`). A project
with a longer explanation now also carries `about:`, rendered as a second button
(`What <name> is →`) — so the modal stays the short read and the new pages are the
long one. Snippets' modal therefore offers both "Open Snippets" (the app) and
"What Snippets is" (this repo's page); Tasks' offers "Open Tasks"
(`snippets.eu/app/tasks`) and "What Tasks is".

Two non-obvious bits of that change:
- **Tasks has no screenshot**, so the modal's single shared `<img>` had to become
  optional. Setting `modalShot.hidden = true` alone does nothing: `.project-modal__shot`
  declares `display: block`, and an author declaration beats the UA stylesheet's
  `[hidden] { display: none }`. It needs an explicit `.project-modal__shot[hidden]`
  rule, which is now in `style.css`. The `src` is also removed when hiding — the
  `<img>` is reused across projects, so a stale `src` would surface the *previous*
  project's picture the next time a project with a screenshot is opened.
- `screenshots/tasks.webp` is still missing. The Tasks tab needs a signed-in
  account with real tasks in it to capture, which a cloud session has no way to
  produce, so the pill ships without one by design rather than with a placeholder.

## 2026-10-14 — The product pages carry no `bang.js` and no `i18n.js`
Both are deliberate omissions, not oversights:
- **`bang.js`**: its click handler fires a full particle explosion on any click
  that isn't on `a, button, .lang-switcher, .project-modal`. On a page that is
  mostly body text, every click to select a word would set one off — and the
  2026-07-27 and 2026-07-29 entries above are both about the cost of that effect
  on iOS. The pages keep the background glows and drop the canvas.
- **`i18n.js`**: it appends a 24-language switcher to any page that loads it, and
  `T` holds translations for the index tagline and the error page only. A picker
  that changes nothing is worse than no picker, so the pages are English-only and
  the switcher stays off them. Translating them means ~40 new keys × 24 languages.

## 2026-10-14 — Corrected a stale Snippets description
`projects.js` told visitors to "sign in with Google or a passwordless magic link".
Both paths were deleted from Snippets on 2026-09-14 (`backend.snippets` dropped
`/auth/google` and `/auth/magic-link`; schema v32 dropped the columns behind them)
— sign-in is a password or a passkey against `accounts`, with magic links only on
accounts' own domain. The description also still called snippets "notes", which is
the backend's old vocabulary rather than the product's. Both fixed.

## 2026-10-14 — `product.css`, not more of `style.css`
`style.css` sets `overflow: hidden` on `body`, because the apex and the 404 are
single-viewport pages that must not scroll. The product pages do scroll, so the
shared long-form styles (and that override) went into a second stylesheet the two
of them load on top of `style.css`, rather than growing the hero's sheet with
rules it never uses.
