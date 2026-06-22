# Fire Hawk UAS — Ops Platform

Operational web tools for the Fire Hawk UAS Program, Bexar County ESD No. 2 (BC2FD), covering Districts 2 & 6. Two single-file web apps — a crew operations app and a read-only command status board — backed by Firebase Firestore and a Cloudflare Worker for live weather and alerts. No build step; deployed straight to GitHub Pages.

**Live version:** v1.0 (go-live, June 2026). Versions are incremented on every change from this point forward; the current version is shown in the app footer and in the in-app **What's New** panel.

## Live URLs

| Tool | URL | Audience |
|------|-----|----------|
| Fire Hawk Ops (crew) | https://afherkdriver.github.io/firehawk-ops/ | UAS crew (PIN sign-in) |
| Daily Status Board (command) | https://afherkdriver.github.io/firehawk-ops/chief.html | Battalion Chiefs / command (read-only) |

## Repository structure

```
index.html    # Fire Hawk Ops — crew app (production)
chief.html    # Daily Status Board — read-only command board
legacy.html   # Previous monolithic build, retained for reference
```

## Features

### Fire Hawk Ops (`index.html`)
- **Schedule** — monthly grid showing UAV121 / UAV124 with the assigned RPIC; tap a day for the full crew roster, including upstaffing. Upstaff is a standalone, day-level concept (additional/training crew) that can be added independently of a second aircraft.
- **Crew roster** — RPIC / VO assignments, colors, and Part 107 currency.
- **Preflight WX** — GPS-based weather with a three-tier convective read (observed thunderstorm via METAR / NWS warning → ground; model-only signal → caution; none).
- **Airspace** — ADS-B, LAANC, and FAA Part 71 airport class awareness.
- **Thermal config**, **SAR operations** reference, **Bulletins**, and **Links**.
- **Sign-in** — PIN-based, role-aware access (owner / admin / staff). Sign-ins are recorded in an access log with full name and fire rank.
- **What's New** — collapsible changelog of user-facing improvements in the footer.

### Daily Status Board (`chief.html`)
- Read-only; no sign-in.
- Today's date (day of week, month, calendar day), shift (A / B / C), and a 7-day coverage outlook strip.
- Crew on duty grouped by aircraft (UAV121 / UAV124), with per-unit temporary out-of-service windows.
- Live weather banners — Red Flag Warning, Flood Warning, and Burn Ban — styled to match the crew app.
- Auto-refreshes every 5 minutes.

## Architecture

- **Frontend** — single self-contained HTML file per tool. React via UMD CDN, `React.createElement` aliased as `h`, no JSX and no build step. Fonts: DM Mono and Bebas Neue.
- **Backend** — Firebase Firestore (project `firehawk-scheduler`). Schedule documents are keyed `schedule_YYYY_M` (month is 0-indexed) and store the day map as a JSON string. Crew, bulletins, and the access log live in the same collection.
- **Weather / alerts** — a Cloudflare Worker (`firehawk-wx`) proxies Open-Meteo, the NWS API (`api.weather.gov`), and METAR, and exposes Red Flag, Flood, and Burn Ban status used by both tools.
- **Hosting** — GitHub Pages, served from the repository root.

> The Firestore web API key in the page source is a public client key protected by Firestore security rules. **No secrets, sign-in PINs, or private credentials are committed to this repository.**

## Deployment

The apps are static files. To publish a change:

1. Edit `index.html` or `chief.html`.
2. Validate the script before shipping — extract the last `<script>` block and run `node --check` on it.
3. Bump `APP_VERSION` in `index.html` and add a line to the in-app **What's New** changelog.
4. Commit and push; GitHub Pages serves the updated files from root.

`legacy.html` is the prior monolithic build, kept for reference and rollback.

## Versioning

- **v1.0** — go-live release (June 2026): production crew app and redesigned command status board, shield branding/favicon, fire-rank access log, and the in-app What's New panel.
- Going forward, each change bumps the version shown in the footer and recorded in What's New.

## Contact

Aaron Sanchez — UAS Program Manager, Fire Hawk UAS Program (BC2FD)
Email: Firehawk@bc2fd.org
