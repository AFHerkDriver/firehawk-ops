# Firehawk UAS — Digital Operations Platform

Operational web app for the **Bexar County ESD No. 2 Fire Department (BC2FD) Firehawk UAS Program**. Provides crew scheduling, preflight weather, real-time airspace awareness, ADS-B traffic monitoring, and program administration — all in a single mobile-optimized interface synced live through Firebase.

## Access

- **Main app:** <https://afherkdriver.github.io/firehawk-ops/>
- **Chief’s daily-status board:** <https://afherkdriver.github.io/firehawk-ops/chief.html>

Staff see a read-only view by default. Manager tools unlock with a PIN. Two access levels exist — full admin (Program Manager) and standard manager (Program Coordinator).

-----

## Pages

### `index.html` — Main Operational App

The primary interface for all crew members. Mobile-first, single-file React app.

**Tabs (staff):** Dashboard · Schedule · Bulletin Board · Links

**Tabs (manager):** Dashboard · Schedule · Crew Mgmt · Bulletin Board

### `chief.html` — Daily Status Board

Read-only command view. Auto-refreshes and shows today’s crew grouped by unit (UAV121 / UAV124), including any out-of-service flags. Reads from the same Firebase backend as `index.html`.

-----

## Dashboard

The dashboard is the primary preflight and situational awareness hub. It contains:

- **Shift and date display** — current shift (A/B/C), today’s date
- **Active Pilots / Active VOs / Cert Alerts** — live crew status summary
- **Preflight WX** — opens the weather modal
- **Airspace** — opens the airspace modal
- **Thermal Config** — opens thermal settings by mission type
- **SAR Operations** — search pattern and sensor reference
- **Latest Bulletin** — most recent program bulletin preview

-----

## Preflight WX

GPS-based preflight weather assessment using Open-Meteo and live METAR data.

**What it shows:**

- Flight ops status: GO / USE CAUTION / DO NOT FLY
- Surface wind, gust, direction
- Visibility and ceiling
- Temperature, dewpoint, altimeter
- Wind aloft at 260ft AGL
- Aircraft-specific readiness (M30T, M4TD, M4T) with limit checks
- METAR readouts from the two nearest towered airports (dynamic, GPS-based)
- Flight category (VFR / MVFR / IFR / LIFR)

Weather pulls from Open-Meteo using the operator’s GPS position. Ceiling is sourced from the nearest airport METAR. Aircraft readiness cards show reasons only when flagged — clean cards on GO status.

-----

## Airspace

Real-time airspace situational awareness using the operator’s GPS position. Queries four FAA data layers in priority order:

1. **LAANC Facility Map** — LAANC authorization ceiling for civilian controlled airports
1. **National Security UAS Restrictions** — DoD and federal facility hard stops (24/7, SFC–400 AGL)
1. **Special Use Airspace** — Restricted, Prohibited, MOA, Warning, Alert
1. **Class Airspace** — Controlled airspace without a LAANC grid

**Color coding:**

- 🟢 Green — LAANC authorized, instant authorization available
- 🟠 Amber — Verify required (MOA, controlled airspace, restricted ceiling)
- 🔴 Red — Do not launch without coordination (Prohibited, Restricted, National Security)

**Conflict alerts:** Audible tones fire when manned aircraft enter the monitored range. A CONFLICT ADVISORY banner displays with aircraft count. Keep device volume on during active operations.

### Status Tab

- Airspace classification card (live, GPS-based)
- ADS-B scope — 3NM range, north-up and track-up modes
- Range toggle: SFC–1k / SFC–5k / SFC–10k
- Traffic tier badges: CONFLICT (red, 0–400ft) / NEARBY (amber, 400–1k) / CLEAR (green, 1k+)
- Position panel: W3W (dispatch-ready), Coordinates (aviation-ready), MGRS (military-ready)
- NIFOG interop frequency reference (collapsible)

### Airports Tab

- **Nearest four towered airports** — dynamic, GPS-based, sourced from embedded FAA airport database (924 airports, airspace class from 14 CFR Part 71)
- Cards show: class badge, LAANC availability, tower frequency, ATIS, military flag, live distance and heading
- Tap cards with known grid data to view LAANC ceiling detail

### Quick Links Tab

FAA TFR map, Aloft LAANC, FAA DroneZone, UASFM viewer, sectional chart, NOTAM search, TAK

-----

## Schedule

Per-day crew assignment with RPIC / VO / VO2 / additional crew. Shift coloring (A/B/C), confirm and OOS states. Staff tap days for read-only view; managers can edit.

### Unit Model

Units are derived automatically from each day’s assignment:

- Program Manager always flies as **UAV121**
- All other RPICs fly as **UAV124**
- Single-unit and two-unit days both supported
- Unit grouping in `index.html` mirrors `chief.html` exactly

### Temporary OOS

Per-unit out-of-service flags set from the day editor. Reason (Training / Personnel), time window, optional note. Displayed as an amber banner on the chief’s board only.

-----

## Crew Mgmt *(manager only)*

- Part 107 expiry tracking with automatic status badges: CURRENT / EXPIRING SOON / EXPIRED / NO CERT
- RPIC / VO role toggles, active / reserve designation
- Archive and restore crew members
- Login history panel (admin only) — last 5 access entries

-----

## Thermal Config

Recommended thermal camera settings organized by mission type:

M30T · M4TD · M4T across 12 mission categories including Fire, SAR, Water Rescue, Hazmat, MCI, and Law Enforcement. Quick view mode shows compact 3-column card with gain, palette, and isotherm settings.

-----

## SAR Operations

Search pattern reference and sensor selection guide for search and rescue deployments. Full-screen modal.

-----

## Airport Database

An embedded database of 924 US towered airports provides instant GPS-based proximity lookups with no API dependency. Airspace class assignments sourced from FAA 14 CFR Part 71 (not inferred from airport size).

**Counts:** 37 Class B · 140 Class C · 747 Class D

To refresh: run `scripts/update_airports.py`. Downloads current data from OurAirports and rebuilds the embedded array. Run every 6 months or after a major airspace change event.

-----

## Tech Stack

- Single-file React app — HTML, CSS, and JavaScript inline
- **React 18** via CDN, using `React.createElement` (no JSX, no build step)
- **Firebase Firestore** REST API for persistence
- **Cloudflare Worker** proxy for weather and alert data
- No bundler, no server — static files on GitHub Pages

-----

## Deploying

1. Replace `index.html` and/or `chief.html` in the Pages repo
1. Commit and push to the published branch
1. GitHub Pages rebuilds — hard-refresh or test in incognito to clear cache

Features touching both files (OOS flags, unit grouping) require both files deployed together. `chief.html` is independent for all other changes.

-----

## Editing Notes

- All code is `React.createElement(...)` — no JSX angle-bracket syntax
- Validate after every edit: extract the inline `<script>` and run `node --check`
- Paren balance is critical — off-by-one causes silent blank renders
- Never use `localStorage` / `sessionStorage` — state is React + Firebase only
- When changing the per-day assignment shape, update `chief.html` in lockstep