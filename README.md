# Fire Hawk UAS — Ops Platform

Operational web tools for the Fire Hawk UAS Program, Bexar County ESD No. 2 (BC2FD), covering Districts 2 & 6. Two single-file web apps — a crew operations app and a read-only command status board — backed by Firebase Firestore and a Cloudflare Worker for live weather and alerts. No build step; deployed straight to GitHub Pages.

**Live version:** v1.5 (June 2026). The footer and the in-app **What's New** panel show the *user-facing* version, incremented on every user-facing change; behind-the-scenes reliability and access work ships between releases without its own number, so the sequence stays continuous for crew.

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
- **Schedule** — monthly grid showing UAV121 / UAV124 with the assigned RPIC; tap a day for the full crew roster, including upstaffing. Upstaff is a standalone, day-level concept (additional/training crew) that can be added independently of a second aircraft. Days can be marked confirmed/finalized, and the manager can auto-propose a month from crew availability.
- **My Shifts** — signed-in crew get a personal list of only the days they're assigned across the current and next month, with unit, role, and confirmed/pending status, so they don't have to scan the calendar.
- **Availability** — crew set the days they're available each month. Months stay locked until the program opens them, and edits save atomically so several crew can enter the same month without overwriting one another.
- **Crew management** (owner) — add, archive, and remove members, and set each member's role-aware access tier and PIN.
- **Crew roster** — RPIC / VO assignments, colors, and Part 107 currency.
- **Preflight WX** — GPS-based weather with a three-tier convective read (observed thunderstorm via METAR / NWS warning → ground; model-only signal → caution; none).
- **Airspace** — ADS-B, LAANC, and FAA Part 71 airport class awareness.
- **Thermal config**, **SAR operations** reference, **Bulletins**, and **Links**.
- **Sign-in** — PIN-based, role-aware access (owner / admin / staff). PINs are verified server-side and never stored in the app or schedule database. Archived members are locked out of sign-in until they're restored. Sign-ins are recorded in an access log with full name and fire rank.
- **What's New** — collapsible changelog of user-facing improvements in the footer.

### Daily Status Board (`chief.html`)
- Read-only; no sign-in.
- Today's date (day of week, month, calendar day), shift (A / B / C), and a 7-day coverage outlook strip.
- Crew on duty grouped by aircraft (UAV121 / UAV124) using the same two-unit model as the scheduler, with large unit callsigns and per-unit temporary out-of-service windows.
- Live weather banners — Red Flag Warning, Flood Warning, and Burn Ban — styled to match the crew app.
- Auto-refreshes every 5 minutes.

## Architecture

- **Frontend** — single self-contained HTML file per tool. React via UMD CDN, `React.createElement` aliased as `h`, no JSX and no build step. Fonts: DM Mono and Bebas Neue.
- **Backend** — Firebase Firestore (project `firehawk-scheduler`). Schedule documents are keyed `schedule_YYYY_M` (month is 0-indexed) and store the day map as a JSON string. Crew, availability, bulletins, and the access log live in the same collection. The crew roster is stored as a keyed map (`membersById` + `memberOrder`) and written with field-scoped updates so concurrent crew and availability edits don't overwrite one another.
- **Auth** — a Cloudflare Worker (`firehawk-auth`) verifies sign-in PINs against salted SHA-256 hashes held in Worker KV and returns the member's id and access tier. PIN hashes live only in the Worker, never in this repository.
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

The footer and the in-app **What's New** panel show the **user-facing** version. Each user-facing release bumps the number; behind-the-scenes work (data-model hardening, concurrent-edit fixes, sign-in lockout for archived members, and similar) ships between releases without its own public number, so the visible sequence stays continuous for crew.

- **v1.0** — go-live (June 2026): production crew app and redesigned command status board, shield branding/favicon, fire-rank access log, and the in-app What's New panel.
- **v1.1** — clearer Class E airspace read (no authorization required for standard Part 107 ops to 400 ft AGL).
- **v1.2** — installable home-screen app with the Fire Hawk badge icon.
- **v1.3–v1.4** — staff Availability calendar: reliable concurrent saving, and months that stay locked until the program opens them.
- **v1.5** — personal **My Shifts** view: each signed-in member sees only the days they're assigned this month and next, and can add them straight to their phone's calendar (current release).

## Contact

Aaron Sanchez — UAS Program Manager, Fire Hawk UAS Program (BC2FD)
Email: Firehawk@bc2fd.org
