# Firehawk UAS Scheduler

Crew scheduling and operational-status web app for the **Bexar County ESD No. 2 Fire Department (BC2FD) Firehawk UAS Program**. It manages daily RPIC/VO assignments, crew availability and currency, an airspace/comms reference, and a read-only daily-status board, all synced live through Firebase.

## Access

- **Scheduler / operational app:** <https://afherkdriver.github.io/firehawk-ops/>
- **Chief’s daily-status board:** <https://afherkdriver.github.io/firehawk-ops/chief.html>
- **Operational display (ops.html):** <https://afherkdriver.github.io/firehawk-ops/ops.html>

Staff see a read-only view by default. Manager tools unlock with a PIN (held by the Program Manager). There are two manager levels — a full admin and a standard manager without admin panels.

-----

## Pages

The deployment is two standalone HTML files that share the same live data:

- **`index.html`** — the full operational app (scheduling, crew management, availability, airspace/comms, bulletin board). Manager and staff views are gated by PIN.
- **`chief.html`** — a separate read-only “Daily Status” board for command staff. Auto-refreshes and shows today’s crew grouped by unit (UAV121 / UAV124), including any temporary out-of-service flags. It derives units from the same schedule data the scheduler writes.
- **`ops.html`** — a laptop-optimized operational display intended for use at the field operations position. Shows live weather (decoded METAR), ADS-B radar with altitude-tiered traffic, aircraft readiness status, nearest airfield distances, quick thermal configuration reference, and external ops links. Does not display schedule data. See [Operational Display](#operational-display) below.

Because `index.html` and `chief.html` read the same schedule records, **any change to the assignment data format in `index.html` must stay compatible with `chief.html`’s reader.**

-----

## Tech stack

- Single-file apps — all HTML, CSS, and JavaScript inline in each file.
- **React 18** via CDN (`unpkg.com`), using `React.createElement` (no JSX build step).
- **Firebase Firestore** REST API for persistence.
- No bundler, no server — static files served from GitHub Pages.

### Tabs

- **Manager:** Schedule · Crew Mgmt · Bulletin Board
- **Staff:** Dashboard · Schedule · Bulletin Board · Links

-----

## Unit / callsign model

Units are **derived automatically** from each day’s assignment — there is no manually stored unit tag, which is what keeps the scheduler and the chief’s page in sync.

- The Program Manager flies as **UAV121** (program-lead callsign).
- **Everyone else** flies as **UAV124**.
- A day can run one unit (typical) or two (e.g. the PM on UAV121, another RPIC on UAV124).
- Within a unit: a lead RPIC plus an optional partner (a second RPIC or a VO).
- Displays show only units that actually have crew assigned.

This grouping logic in `index.html` mirrors `chief.html` exactly so both pages always agree.

-----

## Temporary out-of-service (OOS)

For short windows when a unit comes offline (training, personnel), the manager can flag a unit OOS from the day editor:

- Set from the scheduler, **per unit** — if both units are up, each can be flagged independently with its own reason, time window, and optional note.
- Reason (Training / Personnel), start and “back in service” times entered in **CST**.
- The flag appears **only on the chief’s board** — an amber banner over the affected unit’s pilot showing the reason and window (24-hr, e.g. `1300 – 1630 CST`). The scheduler keeps showing the normal assignment.
- It is a **manual** flag: it displays whenever set and does not auto-clear when the end time passes. Toggle it off when the unit is back in service.
- Requires both times to be entered before it shows.

-----

## Data model (Firestore)

Schedule and crew records are stored as documents in a shared collection:

- **Crew roster** — each member carries availability per month as `availByMonth`, keyed `"YEAR-MONTH"` (e.g. `"2026-5"` = June 2026). A blank month means **unavailable**.
- **Monthly schedule** — one document per month. Days are stored as a JSON string in `daysJson`. Each day is `{ rpic, vo, vo2, extra[], confirmed, oos }` (crew IDs). Units are computed from these fields at render time; `oos` is an optional per-unit map (`{ UAV121: {...}, UAV124: {...} }`).

> Crew IDs are **non-sequential**.

-----

## Key features

- **Schedule:** per-day RPIC / VO / VO2 / additional-crew assignment, shift (A/B/C) coloring, confirm/pending/OOS states, and tap-to-view day detail (read-only for staff, editable for managers).
- **Unit grouping:** automatic UAV121 / UAV124 display matching the chief’s board.
- **Temporary OOS:** per-unit out-of-service flags surfaced on the chief’s board.
- **Availability:** flexible text parser (ranges, ordinals, “weekends only”, “all month except…”, negation, etc.) stored per month.
- **Crew Mgmt:** currency tracking (Part 107 expirations) and, for admins, a login-history panel.
- **Airspace:** local airfields with class, UASFM grid altitudes, and **CTAF frequencies** (KSAT 119.8, Kelly 124.3, Stinson 118.2, Randolph 128.25).
- **Comms reference:** collapsible NIFOG national-interop channel list (VFIRE / VTAC / VMED / VLAW / SAR / aviation common) with frequencies and CTCSS tones — reference only.
- **Quick Links:** TAK, Aloft LAANC, B4UFLY, FAA DroneZone, TFR map, UASFM viewer, sectional, NOTAM search.

-----

## Operational Display

**`ops.html`** is a self-contained, laptop-optimized tactical screen designed for the field operations position. It is a **separate static page** — no schedule data, no authentication, no Firebase dependency.

Live at: <https://afherkdriver.github.io/firehawk-ops/ops.html>

### Layout

Three-column layout optimized for a 13–15” laptop screen:

|Left                                   |Center                  |Right               |
|---------------------------------------|------------------------|--------------------|
|External ops links                     |Decoded METAR weather   |Quick Thermal Config|
|GPS position panel (lat/lon, MGRS, W3W)|Aircraft readiness pills|—                   |
|Nearest airfields with distance/heading|ADS-B radar scope       |—                   |
|—                                      |Traffic list            |—                   |

### Features

- **Weather** — decoded METAR for the primary ops airfield (KSKF). Displays wind direction and speed, gust (amber when present), visibility, ceiling, temperature, and altimeter.
- **ADS-B radar** — 3nm scope (rings at 1/2/3nm), 30° tick marks, North-up orientation, 10-second auto-refresh. Altitude filter buttons (1,000 / 5,000 / 10,000 ft AGL). Traffic color-tiered by altitude: red (0–400ft, CONFLICT), amber (400–1,000ft, NEARBY), green (1,000ft+). Traffic list below radar sorted closest-to-farthest with callsign, bearing, distance, altitude, speed, and heading. Data from `api.airplanes.live` (free, no key required).
- **Aircraft readiness** — compact color pill per platform (M30T, M4TD, M4T). Tap a pill to see per-platform limit checks (wind, temperature, precipitation, visibility).
- **Position panel** — coordinates with copy button, MGRS, and What3Words address.
- **Nearest airfields** — KSAT, KSSF, KSKF with class, distance, magnetic heading, and CTAF frequency. Distance and heading color-coded by proximity.
- **Thermal config reference** — quick-reference cards organized by mission category (FIRE, SAR, HAZ, OPS, MCI, LE) with palette, gain, and flight parameter notes. Reed Curl’s field-validated thermal settings incorporated.
- **Burn Ban / Red Flag banners** — same Cloudflare Worker cache as `index.html`. Red alert banners appear at the top when active.

### What it does not do

- No schedule data, crew assignments, or login.
- No write operations — read-only display.
- No mobile layout — designed for laptop/desktop at the ops position.

### Cross-links

- Footer of `ops.html` includes a subtle link back to the Firehawk Scheduler (`index.html`).

-----

## Deploying

The app is static — deploying means publishing the current `index.html` (and `chief.html`) to the GitHub Pages repo that backs the live site.

1. Replace `index.html`, `chief.html`, and/or `ops.html` (whichever changed) in the Pages repo.
1. Commit and push to the published branch.
1. GitHub Pages rebuilds; hard-refresh the live URL to clear cache.

**Edits are not live until the updated file is the one published to the repo** — testing the live site before pushing will show the old version. Features that touch both files (e.g. temporary OOS) require **both** `index.html` and `chief.html` to be deployed together. `ops.html` is independent and can be deployed on its own.

-----

## Editing notes

- Both files use `React.createElement` / template strings, so element nesting is expressed through parentheses — watch closing-paren counts when inserting elements.
- Validate after edits by extracting the inline `<script>` and running `node --check`.
- Never use `localStorage` / `sessionStorage`; state is React + Firebase only.
- When changing the per-day assignment shape, update `chief.html` in lockstep or keep the existing `{ rpic, vo, vo2, extra }` fields intact.