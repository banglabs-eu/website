# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Landing page website for Bang Labs (bang-labs.eu / bang-labs.com) — an open source software studio. Repository is at github.com/banglabs-eu/website.git.

## Tech Stack

- **No framework or build system** — plain HTML, CSS, and vanilla JavaScript
- Static site, no server-side rendering or bundling
- Hosted as static files (canonical URL: https://bang-labs.eu/)

## File Structure

- `index.html` — Landing page with gradient heading, tagline, and GitHub/LinkedIn links
- `error.html` — Custom 404 error page
- `style.css` — Shared base styles (reset, dark theme, background glows, canvas, container with reveal animation)
- `bang.js` — Particle explosion ("bang") effect on a full-screen canvas; fires on page load and on click
- `robots.txt` / `sitemap.xml` — SEO assets
- `CLAUDE.md` — This file

## Design

- Dark theme (`#0a0a0f` background)
- Indigo/cyan color palette (`#6366f1`, `#06b6d4`, `#c7d2fe`)
- System font stack (no custom fonts loaded)
- Page-specific styles are inlined in `<style>` blocks within each HTML file; shared styles live in `style.css`
- Background glow blobs and full-screen canvas overlay for the particle effect

## SEO

- Open Graph meta tags, structured data (JSON-LD Organization), robots.txt, and sitemap.xml are in place
- Canonical domain is `bang-labs.eu`
