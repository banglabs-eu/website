# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Landing page website for Bang Labs (bang-labs.eu / bang-labs.com) — an open source software company. Repository is at github.com/banglabs-eu/website.git.

## Tech Stack

- **No framework or build system** — plain HTML, CSS, and vanilla JavaScript.
  The one exception is `/planners/`, a Vite + React + TypeScript app (see below)
- Static site, no server-side rendering or bundling
- Hosted as static files (canonical URL: https://bang-labs.eu/)

## File Structure

- `index.html` — Landing page with gradient heading, tagline, project pills and the project modal
- `error.html` — Custom 404 error page
- `snippets/index.html` — What Snippets is: the product page for `snippets.eu`
- `tasks/index.html` — What Tasks is. Tasks has no domain of its own — it is a
  view inside the Snippets app (`snippets.eu/app/tasks`), so its only marketing
  surface is this page
- `style.css` — Shared base styles (reset, dark theme, background glows, canvas,
  container with reveal animation) **and** the project-modal styles. Sets
  `overflow: hidden` on `body`, which the product pages override
- `product.css` — Shared styles for the two long-form product pages only.
  Loaded on top of `style.css`; not loaded by the apex or the 404
- `bang.js` — Particle explosion ("bang") effect on a full-screen canvas; fires on
  page load and on click. **Not loaded by the product pages** — see `decisions.md`
- `i18n.js` — Inline translations (24 EU languages) + the language switcher it
  appends to any page that loads it. Covers the index tagline and the 404 only, so
  the product pages deliberately don't load it
- `projects.js` — The project catalog and its informational modal. An entry's
  `shot` and `about` are both optional; `about` adds a second modal action
- `planners-app/` — **source** of bang-labs.eu/planners/: printable GlyphClock
  day planners (HTML sheets, printed via the browser) and a calendar PDF
  generator (pdf-lib). `cd planners-app && npm install && npm run build` writes
  `planners/`; edit the app, then commit both. `npm run dev` serves it locally
  (the site's `style.css`/`product.css` are imported from the repo root)
- `planners/` — **build output** of `planners-app/`, committed because GitHub
  Pages serves this repo's files as-is. Never edit it by hand
- `robots.txt` / `sitemap.xml` — SEO assets
- `CLAUDE.md` — This file

## Design

- Dark theme (`#0a0a0f` background)
- Indigo/cyan color palette (`#6366f1`, `#06b6d4`, `#c7d2fe`)
- System font stack (no custom fonts loaded)
- Page-specific styles are inlined in `<style>` blocks within each HTML file;
  shared styles live in `style.css` (every page) and `product.css` (the two
  product pages)
- The two slogans are the product copy and should stay exact: **"Snippet
  everything you know."** and **"Tasks everything you do."**
- Background glow blobs and full-screen canvas overlay for the particle effect

## SEO

- Open Graph meta tags, structured data (JSON-LD Organization), robots.txt, and sitemap.xml are in place
- Canonical domain is `bang-labs.eu`
