# Firehawk Ops

Operational web tools for the Fire Hawk UAS Program, Bexar County ESD No. 2 (BC2FD), covering Districts 2 & 6. Three single-file web apps — a crew operations app, a read-only command status board, and a pilot training tracker — backed by Firebase Firestore and a Cloudflare Worker for live weather and alerts. No build step; deployed straight to GitHub Pages.

**Live version:** v2.6 (July 2026). The footer and the in-app **What's New** panel show the *user-facing* version, incremented on every user-facing change; behind-the-scenes reliability and access work ships between releases without its own number, so the sequence stays continuous for crew.

## Live URLs

| Tool | URL | Audience |
|------|-----|----------|
| Fire Hawk Ops (crew) | https://afherkdriver.github.io/firehawk-ops/ | UAS crew (PIN sign-in) |
| Daily Status Board (command) | https://afherkdriver.github.io/firehawk-ops/chief.html | Battalion Chiefs / command (read-only) |
| Pilot Training (record) | https://afherkdriver.github.io/firehawk-ops/training.html | Trainees & instructors (PIN sign-in) |

## Repository structure

```
index.html       # Fire Hawk Ops — crew app (production)
chief.html       # Daily Status Board — read-only command board
training.html    # Pilot Training — Initial Operational Readiness record (SOP Appendix E)
airspace_reference.html   # Airspace verdict gallery — crew training / SOP appendix
AIRSPACE_COMPLIANCE.md    # Airspace decision logic of record
render_smoke.js  # Headless render harness (jsdom) — runtime crash check
.nojekyll        # Disables Jekyll on GitHub Pages (required)
apple-touch-icon.png, og-image.png            # Crew-app icons / link preview
training-touch-icon.png, training-og.png      # Training-page icons / link preview
```

## Features

### Fire Hawk Ops (`index.html`)
- **Schedule** — monthly grid showing UAV121 / UAV124 with the assigned RPIC; tap a day for the full crew roster, including upstaffing. Upstaff is a standalone, day-level concept (additional/training crew) that can be added independently of a second aircraft. Each day is **Finalized** (green) or **Draft** (amber); editing crew or an out-of-service window on a finalized day re-opens it as Draft. A footer dot reads green when every crewed day is finalized, amber while any is Draft. The manager can finalize a single day, finalize/unfinalize the whole month, and auto-propose a month from crew availability.
- **My Shifts** — signed-in crew get a personal list of only the days they're assigned across the current and next month, with unit, role, and finalized/draft status, so they don't have to scan the calendar.
- **YTD Stats** — a button under the calendar opens a year-to-date view of days worked per crew member (one tally per person per day, both units collapsed, upstaff included), counting finalized days only, with a per-person total, a bar relative to the busiest crew, and a month-by-month breakdown. Visible to all signed-in crew.
- **Availability** — crew set the days they're available each month. Months stay locked until the program opens them, and edits save atomically so several crew can enter the same month without overwriting one another.
- **Crew management** (owner) — add, archive, and remove members, and set each member's role-aware access tier and PIN.
- **Crew roster** — RPIC / VO assignments, colors, and Part 107 currency.
- **Preflight WX** — weather for the operator's exact GPS position, powered primarily by the **National Weather Service gridpoint forecast** (the official source of record), with a secondary model and airfield-observed METAR as automatic fallbacks; three-tier convective read (observed thunderstorm via METAR / NWS warning → ground; model-only signal → caution; none). A one-tap GPS banner on the Dashboard primes location access before it's needed in the field.
- **Airspace** — live ADS-B traffic within 3NM read in **AGL above the launch site** (ground elevation multi-sourced — cached per launch area, Open-Meteo, then USGS — so it survives any single provider outage; MSL shown secondary), smoothly interpolated between polls with tail number and type code per contact, and AGL-based conflict / inbound alerting. Airspace status follows a **most-restrictive-first decision ladder** over verified FAA sources, and fails loud — if a source can't be reached it says **CHECK INCOMPLETE** rather than showing a false all-clear.
  - **TFRs** — live FAA awareness via the agency's own GeoServer, with a status line that names the nearest TFR even beyond scan range (self-proving), true boundary shapes and circles drawn on the scope, and a **color/access doctrine tuned for public-safety fire**: firefighting/hazard TFRs (14 CFR 91.137) show **orange** ("coordinate with air boss" — airspace the fire team operates in), National Defense TFRs (99.7) show **red** with the correct agency-approval path, and all other TFRs show **red / prohibited**. The card parses each NOTAM for the **coordinating authority to contact**. Standing inside any TFR tints the scope red.
  - **LAANC** — controlling (minimum) ceiling at the operator's position, with an optional scope overlay painting the FAA facility-map grid cells and their ceilings; overlapping facility maps are de-duplicated to the controlling ceiling.
  - **Quick-Zoom** — a momentary 0.5 NM close-in view of the immediate area that counts down and auto-returns to 3 NM.
  - FAA Part 71 airport class awareness and an owner-only **Source Diagnostics** console that live-tests every external data dependency.
- **Thermal config**, **SAR operations** reference, **Bulletins**, and **Links**.
- **Sign-in** — PIN-based, role-aware access (owner / admin / staff). PINs are verified server-side and never stored in the app or schedule database. Archived members are locked out of sign-in until they're restored. Sign-ins are recorded in an access log with full name and fire rank.
- **What's New** — collapsible changelog of user-facing improvements in the footer.

### Daily Status Board (`chief.html`)
- Read-only; no sign-in.
- Today's date (day of week, month, calendar day), shift (A / B / C), and a 7-day coverage outlook strip.
- Crew on duty grouped by aircraft (UAV121 / UAV124) using the same two-unit model as the scheduler, with large unit callsigns and per-unit temporary out-of-service windows.
- Live weather banners — Red Flag Warning, Flood Warning, and Burn Ban — styled to match the crew app.
- Auto-refreshes every 5 minutes.

### Pilot Training (`training.html`)
- Electronic **Initial Operational Readiness** record implementing the SOP Appendix E curriculum: prerequisites, aircraft qualifications (**DJI M30T, DJI M4T, DJI Avata**), software, and operational blocks.
- **Operational readiness percentage** and per-block progress; each item carries an instructor **sign-off stamped by name and date**, synced live across devices.
- PIN sign-in (same auth as the crew app). Instructors see every trainee and are the only ones who can sign items off; trainees open their own folder.
- Its own **Training Record** branding (home-screen icon, favicon, and link-preview card).

## Architecture

- **Frontend** — single self-contained HTML file per tool. React via UMD CDN, `React.createElement` aliased as `h`, no JSX and no build step. Fonts: DM Mono and Bebas Neue.
- **Backend** — Firebase Firestore (project `firehawk-scheduler`). Schedule documents are keyed `schedule_YYYY_M` (month is 0-indexed) and store the day map as a JSON string. Crew, availability, bulletins, and the access log live in the same collection. The crew roster is stored as a keyed map (`membersById` + `memberOrder`) and written with field-scoped updates so concurrent crew and availability edits don't overwrite one another.
- **Auth** — a Cloudflare Worker (`firehawk-auth`) verifies sign-in PINs against salted SHA-256 hashes held in Worker KV and returns the member's id and access tier. PIN hashes live only in the Worker, never in this repository.
- **Weather / alerts** — a Cloudflare Worker (`firehawk-wx`) proxies the NWS API (`api.weather.gov`, the primary forecast source), Open-Meteo, and METAR, and exposes Red Flag, Flood, and Burn Ban status used across the tools.
- **Hosting** — GitHub Pages, served from the repository root.

> The Firestore web API key in the page source is a public client key protected by Firestore security rules. **No secrets, sign-in PINs, or private credentials are committed to this repository.**

## Deployment

The apps are static files. To publish a change:

1. Edit `index.html`, `chief.html`, or `training.html`.
2. Validate before shipping — extract the last `<script>` block and run `node --check`, then run the headless render smoke (`render_smoke.js`, jsdom + React) to catch runtime crashes that a syntax check misses.
3. Bump `APP_VERSION` in `index.html` and add a line to the in-app **What's New** changelog (crew-facing changes only).
4. After pushing, confirm the **"pages build and deployment" run is green** in the Actions tab before trusting the live site — a committed file and a served file are separate checkpoints.
5. GitHub Pages serves the updated files from root. `.nojekyll` must be present to disable Jekyll.

`legacy.html` is the prior monolithic build, kept for reference and rollback.

## Versioning

The footer and the in-app **What's New** panel show the **user-facing** version. Each user-facing release bumps the number; behind-the-scenes work (data-model hardening, concurrent-edit fixes, sign-in lockout for archived members, and similar) ships between releases without its own public number, so the visible sequence stays continuous for crew.

- **v1.0** — go-live (June 2026): production crew app and redesigned command status board, shield branding/favicon, fire-rank access log, and the in-app What's New panel.
- **v1.1** — clearer Class E airspace read (no authorization required for standard Part 107 ops to 400 ft AGL).
- **v1.2** — installable home-screen app with the Fire Hawk badge icon.
- **v1.3–v1.4** — staff Availability calendar: reliable concurrent saving, and months that stay locked until the program opens them.
- **v1.5** — personal **My Shifts** view: each signed-in member sees only the days they're assigned this month and next, and can add them straight to their phone's calendar.
- **v1.6** — **YTD Stats**: days-worked-per-crew-member view for the calendar year (finalized days, one tally per person per day, both units collapsed), visible to all signed-in crew.
- **v1.7** — **Finalized / Draft** day states: clearer green/amber labeling, a footer status dot, single-day and whole-month finalize, and auto-revert to Draft when a finalized day is edited.
- **v1.8** — **smoother ADS-B tracker**: faster polling with motion interpolated between updates so traffic glides instead of jumping; more reliable conflict / inbound alerts.
- **v1.9** — **tail number + type code** shown per contact in the traffic list, and a faster traffic refresh for smoother movement.
- **v2.0** — **AGL traffic altitudes**: ground elevation at the launch site converts each contact's MSL altitude to height above the operator; filters and alerts now key off AGL, with MSL shown secondary.
- **v2.1** — **Part 107 currency advisory** on the Dashboard (amber inside 90 days, red inside 30, per-pilot days remaining), correctly sized desktop radar, and steadier traffic on a jittery GPS signal.
- **v2.2** — **live TFR awareness**: Texas TFR scan every 10 minutes with an honest status line (clear / nearby / inside / unavailable), detail cards, and scope markers.
- **v2.3** — **TFR boundary rendering**: the actual published polygon or circle paints on the scope when it reaches the 3NM window, and inside/outside is determined against the true boundary.
- **v2.5** — **airspace overhaul**: the status card always shows the most restrictive condition — an active TFR at your position (red, NOTAM + end time) outranks everything including a LAANC grid, as does a National Security no-fly or surface Restricted area; high-floor special-use airspace no longer raises false alarms and flight-level floors read correctly; overlapping grids show the controlling (lowest) ceiling; data-source failures render CHECK INCOMPLETE instead of a false all-clear; special-use data comes directly from the FAA's published layer with an on-card provenance chip. An optional LAANC toggle on the traffic scope paints the FAA facility-map grid cells with their ceilings around your position; TFR geometry comes from the FAA's own GeoServer WFS. Weather is NWS-gridpoint-primary with model and observed-METAR fallbacks, and ground elevation for AGL is multi-sourced (cached per launch area, Open-Meteo, USGS). An owner-page diagnostics console live-tests every external data source. Decision logic is documented in `AIRSPACE_COMPLIANCE.md` (current release).

## Contact

Aaron Sanchez — UAS Program Manager, Fire Hawk UAS Program (BC2FD)
Email: Firehawk@bc2fd.org
