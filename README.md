# Firehawk UAS Scheduler

Crew scheduling and operational-status web app for the **Bexar County ESD No. 2 Fire Department (BC2FD) Firehawk UAS Program**. It manages daily RPIC/VO assignments, crew availability and currency, an airspace/comms reference, and a read-only daily-status board, all synced live through Firebase.

Live site: `https://afherkdriver.github.io/firehawk-ops/`

---

## Pages

The deployment is two standalone HTML files that share the same Firebase data:

- **`index.html`** — the full operational app (scheduling, crew management, availability, airspace/comms, bulletin board). Manager and staff views are gated by PIN.
- **`chief.html`** — a separate read-only "Daily Status" board for command staff. Auto-refreshes and shows today's crew grouped by unit (UAV121 / UAV124). It derives units from the same schedule data the scheduler writes.

Because both pages read the same schedule records, **any change to the assignment data format in `index.html` must stay compatible with `chief.html`'s reader.**

---

## Tech stack

- Single-file apps — all HTML, CSS, and JavaScript inline in each file.
- **React 18** via CDN (`unpkg.com`), using `React.createElement` (no JSX build step).
- **Firebase Firestore** REST API for persistence (project `firehawk-scheduler`).
- No bundler, no server — static files served from GitHub Pages.

---

## Access

Staff see a read-only view by default. Manager tools unlock with a PIN:

| PIN | Holder | Access |
|-----|--------|--------|
| `241408` | Aaron Sanchez (Program Manager) | Admin (full) |
| `0336` | Ryan Bauchman (Program Coordinator) | Manager (no admin panels) |

Successful logins are written to a Firebase access log; the admin-only login history panel appears at the top of the Crew Mgmt tab.

### Tabs
- **Manager:** Schedule · Crew Mgmt · Bulletin Board
- **Staff:** Dashboard · Schedule · Bulletin Board · Links

---

## Unit / callsign model

Units are **derived automatically** from each day's assignment — there is no manually stored unit tag, which is what keeps the scheduler and the chief's page in sync.

- **Aaron Sanchez (crew id 1)** flies as **UAV121** (program-lead callsign).
- **Everyone else** flies as **UAV124**.
- A day can run one unit (typical) or two (e.g. Sanchez on UAV121, another RPIC on UAV124).
- Within a unit: a lead RPIC plus an optional partner (a second RPIC or a VO).
- Displays show only units that actually have crew assigned.

This grouping logic in `index.html` mirrors `chief.html` exactly so both pages always agree.

---

## Data model (Firestore)

All documents live under the `firehawk` collection:

- **`firehawk/crew`** — roster. Each member carries availability per month as `availByMonth`, keyed `"YEAR-MONTH"` (e.g. `"2026-5"` = June 2026). A blank month means **unavailable**.
- **`firehawk/schedule_<year>_<month>`** — one document per month. Days are stored as a JSON string in `daysJson`. Each day is `{ rpic, vo, vo2, extra[], confirmed }` (crew IDs). Units are computed from these fields at render time.
- **`firehawk/access_log`** — recent manager logins (last 50).

> Crew IDs are **non-sequential** (1, 2, 3, 4, 5, 6). Sanchez = 1.

---

## Key features

- **Schedule:** per-day RPIC / VO / VO2 / additional-crew assignment, shift (A/B/C) coloring, confirm/pending/OOS states, and tap-to-view day detail (read-only for staff, editable for managers).
- **Unit grouping:** automatic UAV121 / UAV124 display matching the chief's board.
- **Availability:** flexible text parser (ranges, ordinals, "weekends only", "all month except…", negation, etc.) stored per month.
- **Crew Mgmt:** currency tracking (Part 107 expirations) and, for admins, the login-history panel.
- **Airspace:** local airfields with class, UASFM grid altitudes, and **CTAF frequencies** (KSAT 119.8, Kelly 124.3, Stinson 118.2, Randolph 128.25).
- **Comms reference:** collapsible NIFOG national-interop channel list (VFIRE / VTAC / VMED / VLAW / SAR / aviation common) with frequencies and CTCSS tones — reference only.
- **Quick Links:** TAK, Aloft LAANC, B4UFLY, FAA DroneZone, TFR map, UASFM viewer, sectional, NOTAM search.

---

## Deploying

The app is static — deploying means publishing the current `index.html` (and `chief.html`) to the GitHub Pages repo that backs `afherkdriver.github.io/firehawk-ops/`.

1. Replace `index.html` (and `chief.html` if it changed) in the Pages repo.
2. Commit and push to the published branch.
3. GitHub Pages rebuilds; hard-refresh the live URL to clear cache.

**Edits are not live until the updated file is the one published to the repo** — testing the live site before pushing will show the old version.

---

## Editing notes

- Both files use `React.createElement`, so element nesting is expressed through parentheses — watch closing-paren counts when inserting elements.
- Validate after edits by extracting the inline `<script>` and running `node --check`.
- Never use `localStorage` / `sessionStorage`; state is React + Firebase only.
- When changing the per-day assignment shape, update `chief.html` in lockstep or keep the existing `{ rpic, vo, vo2, extra }` fields intact.
