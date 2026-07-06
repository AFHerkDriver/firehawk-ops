# Firehawk Ops — Developer Briefing Document

**BC2FD Firehawk UAS Program — `index.html` Reference**
Last updated: July 2026 (training system integration)

-----

## CRITICAL RULES — READ BEFORE TOUCHING ANYTHING

1. **Never edit `index.html` structurally without a syntax check.** After every change, extract the `<script>` block and run `node --check` on it. Silent render failures are the #1 cause of broken pages.
1. **This is compiled output — not source JSX.** All code is `React.createElement(...)` calls, not JSX syntax. Do not introduce JSX angle-bracket syntax.
1. **Paren balance is critical.** Every `React.createElement(` must have a matching `)`. Off-by-one parens cause silent blank renders with no error.
1. **Make surgical edits only.** Use Python string replacement on exact text matches. Never rewrite large blocks unless absolutely necessary. If you must rewrite a full function, write it to a temp file, run `node --check`, then splice it in.
1. **Always verify the match count before replacing.** `assert old_text in html` before every replace. If not found, stop and investigate — do not guess at alternate text.
1. **ops.html is a separate file — ignore it** unless explicitly asked to edit it.

-----

## File Overview

- **File:** `index.html` — single-file React app, no build step required
- **Deployed at:** `https://afherkdriver.github.io/firehawk-ops/`
- **Companion file:** `chief.html` — read-only Battalion Chief view (separate file, same Firebase backend)
- **Runtime:** React via UMD CDN, plain `React.createElement` (aliased `h`) — no JSX, no Babel, no build step
- **Second companion file:** `training.html` — "Pilot Training" — crew onboarding checklist with trainer sign-offs (separate file, same Firebase backend + auth Worker)

-----

## Architecture

### Firebase (Firestore REST API)

- **Project:** `firehawk-scheduler`
- **Functions:** `fsGet(collection, doc)`, `fsSet(collection, doc, data)`, `fsListen(collection, doc, callback)`
- **Collections used:**
  - `firehawk / schedule` — monthly schedule data keyed by `YYYY_M_D`
  - `firehawk / crew` — crew roster
  - `firehawk / bulletins` — bulletin board posts
  - `firehawk / access_log` — manager login history (last 50 entries)
- **`USE_JSON_STRING = true`** — all data serialized as JSON string in a single Firestore field

### Cloudflare Worker

- Proxies NWS weather alerts (burn ban, Red Flag Warning) with KV caching
- Referenced in `FirehawkOps` useEffect for `burnBan` and `redFlag` state

-----

## Top-Level Constants (module scope, defined before any function)

```
FS_PROJECT, FS_API_KEY, FS_BASE, USE_JSON_STRING
CREW_DEFAULT          — default crew array with id/name/role/color/initials
LEAD_PILOT_ID = 1     — Aaron Sanchez; always UAV121
UNIT_LEAD = "UAV121"
UNIT_PRIMARY = "UAV124"
LOGO_B64              — base64 encoded logo
STATUS_STYLE          — shared style object
PIN = "241408"        — legacy, kept for back-compat
MANAGER_PINS          — { "241408": {name, admin:true}, "0336": {name, admin:false} }
                        241408 = Aaron Sanchez (Program Manager, full admin)
                        0336   = Ryan Bauchman (Program Coordinator, manager but not admin)
CREW_MEMBERS          — production crew list
HISTORY               — static historical schedule data (keyed "YYYY_M_D")
SHIFT_COLORS          — A/B/C shift color definitions
SHIFT_PATTERN         — rotating shift array
ANCHOR_DATE           — shift rotation anchor
MONTHS, DAYS          — display label arrays
NIFOG_GROUPS          — national interop frequency data (VFIRE/VTAC/VMED/VLAW/SAR)
MISSIONS              — 12 mission type objects for ThermalModal
PALETTES              — 4 thermal palette objects (White Hot, Black Hot, Iron Bow, Rainbow)
```

-----

## Component Tree

```
FirehawkOps()                  — main app, manages all top-level state
  ├── SchedulerPanel()         — handles all tab content except dashboard modals
  │     ├── AutoFillTab()      — autofill scheduling logic
  │     └── CrewAvatar()       — crew member avatar display
  ├── LoginHistoryPanel()      — admin-only, shown in Crew Mgmt tab
  ├── NIFOGPanel()             — collapsible interop frequency reference
  ├── WeatherModal()           — weather overlay modal
  ├── ThermalModal()           — thermal config modal (see section below)
  ├── AirspaceModal()          — airspace status modal (LAANC, ADS-B, NIFOG)
  └── SARModal()               — SAR search pattern reference modal
```

-----

## FirehawkOps — Key State Variables

|State         |Purpose                                                            |
|--------------|-------------------------------------------------------------------|
|`tab`         |Active tab: `"dashboard"` (default)                                |
|`isManager`   |True after correct PIN entry                                       |
|`isAdmin`     |True only for PIN 241408 (Aaron). Controls login history visibility|
|`showPin`     |PIN entry modal visibility                                         |
|`showThermal` |ThermalModal visibility                                            |
|`showAirspace`|AirspaceModal visibility                                           |
|`showWeather` |WeatherModal visibility                                            |
|`showSAR`     |SARModal visibility                                                |
|`burnBan`     |Burn ban alert from Cloudflare worker                              |
|`redFlag`     |Red Flag Warning from Cloudflare worker                            |
|`crew`        |Live crew roster from Firebase                                     |
|`bulletins`   |Live bulletin board from Firebase                                  |

-----

## Tab Structure

**Manager tabs (PIN required):**
`Dashboard · Schedule · Crew Mgmt · Bulletin Board · Links`

**Staff tabs (no PIN):**
`Dashboard · Schedule · YTD Stats · Bulletin Board · Links`

- **Dashboard tab** — UAV unit status panels, OOS flags, weather/airspace buttons, Thermal Config button
- **Schedule tab** — SchedulerPanel calendar. Manager can edit days; staff can tap days for read-only view
- **Crew Mgmt tab** — crew cards with RPIC/VO toggles, archive/restore. Admin-only: Login History panel at top
- **YTD Stats tab** — staff only, not visible to manager
- **Bulletin Board** — shared, both views
- **Links** — shared quick links

-----

## SchedulerPanel — Key Details

Props: `isManager, isAdmin, crew, setCrew`

Internal states: `month, year, schedule, tab, selectedDay, editingCrew, availInput, staffMember, proposals, autoPreview, autoApplied, confirmClear, pushConfirmed`

- Schedule data stored in Firebase keyed as `YYYY_M_D` (e.g. `"2026_5_25"`)
- Each day object: `{ rpic, vo, vo2, extra[], confirmed, oos: { UAV121: {active, reason, start, end, remark}, UAV124: {...} } }`
- **OOS fields:** reason = “Personnel” or “Training”, start/end = time strings (CST/CDT), remark = optional free text
- Manager taps a day → opens editor with crew assignment + OOS flags
- Staff taps a day → opens read-only chief-style view showing UAV121/UAV124 unit groupings

-----

## Unit Grouping Logic — `groupAssignmentByUnit(a, crewList)`

**Critical rules:**

- Sanchez (LEAD_PILOT_ID = 1) **always** goes to UAV121, regardless of which field he’s in (`rpic`, `vo`, `vo2`, or `extra[]`)
- All Firebase IDs must be coerced with `parseInt()` before comparison — Firebase returns strings, crew IDs are integers
- **Single-unit day:** `vo` pairs with the active RPIC on that unit
- **Two-unit day:** `vo` (VO1) → UAV124, `vo2` (VO2) → UAV121 (Sanchez’s unit)
- UAV124 RPIC = non-Sanchez person in `rpic` field, OR first RPIC found in `extra[]`

-----

## ThermalModal — Complete Rebuild Reference

**If ThermalModal is broken or missing, use the saved file `thermal_modal_rebuild.js`.**

That file contains:

- Full `MISSIONS` array (12 missions)
- Full `PALETTES` object (4 palettes)
- Complete `ThermalModal` function

**Insertion points in `index.html`:**

1. `MISSIONS` and `PALETTES` — place at module level, just before `function ThermalModal(`
1. `ThermalModal` function — place between `PALETTES` and `function WeatherModal(`

**Structure rules (critical — violations cause invisible modal):**

```
ThermalModal return:
  div [position:fixed, inset:0, display:flex, flexDirection:column]   ← outer
    div [flexShrink:0]                                                  ← header (fixed)
    div [flex:1, minHeight:0, overflowY:auto, WebkitOverflowScrolling:touch]  ← scrollable content
```

- `minHeight:0` is mandatory for iOS Safari flex scrolling
- Without `flexShrink:0` on header, the header will scroll away
- Without `minHeight:0` on content, the modal renders invisible on mobile

**Water Rescue special case:**

- Uses `dayNight: true` toggle but with custom labels
- `dayLabel: "THERMAL"` → Iron Bow palette (victim detection)
- `nightLabel: "RIPPLE"` → Rainbow palette (water disturbance/submerged)

**Quick view:** `⚡ Quick` button in header toggles `quickView` state → compact 3-column card showing Gain / Palette+color bar / Isotherm, plus Altitude and Zoom below

**Subtitle:** “Recommended thermal settings by mission type”

-----

## AirspaceModal — Key Details

- Tabs: `Status · Airports · Quick Links`
- Status tab contains: position panel, airfield distances (KSKF·KSAT·KSSF fixed order), ADS-B radar scope, traffic list, NIFOGPanel (collapsible), COA note
- ADS-B scope: 3 rings at 1/2/3 NM (labels uppercase: “1NM”, “2NM”, “3NM”)
- North-up: all 12 degree labels every 30°; Track-up: N/E/S/W only
- 3-tier traffic colors: red ≤400ft (CONFLICT), amber 400–1000ft (NEARBY), green >1000ft (HIGH TRAFFIC)
- Airfield distance colors: red <2nm, amber 2–5nm, green >5nm
- W3W API key: `J4FL5TE7` (first responder key, referrer restricted to `afherkdriver.github.io`)
- Opening ThermalModal must close AirspaceModal: `setShowThermal(true); setShowAirspace(false);`

-----

## chief.html — Battalion Chief View

- Separate file, read-only companion to `index.html`
- Same Firebase backend — reads `firehawk/schedule` and `firehawk/crew`
- Shows UAV121 and UAV124 unit panels for current and upcoming days
- OOS amber banners shown per unit when `oos.UAV121.active` or `oos.UAV124.active` is true
- No PIN required — display only, no edit capability
- Uses same `groupAssignmentByUnit` logic as staff day detail view

-----

## Safe Edit Workflow

```python
# Standard pattern for every edit:
html = open('/mnt/user-data/outputs/index.html').read()

old = '''exact text to replace'''
new = '''replacement text'''

assert old in html, "Not found — stop and investigate"
assert html.count(old) == 1, "Multiple matches — be more specific"
html = html.replace(old, new, 1)

open('/mnt/user-data/outputs/index.html', 'w').write(html)

# Syntax check — run after EVERY edit
import re, subprocess
scripts = [m.group(1) for m in re.finditer(r'<script[^>]*>(.*?)</script>', html, re.S)]
open('/tmp/v.js','w').write(scripts[-1])
r = subprocess.run(['node','--check','/tmp/v.js'], capture_output=True, text=True)
print("Syntax:", "OK" if r.returncode == 0 else "FAIL:\n" + r.stderr)
```

-----

## Known Pitfalls

- **Firebase ID type mismatch:** Firebase returns IDs as strings; crew IDs in the app are integers. Always use `parseInt()` when looking up crew by ID from Firebase data.
- **Stale deploy:** GitHub Pages caches aggressively. Always hard-refresh or test in incognito after deploying.
- **Two-unit day display:** The staff day detail and chief view both use `groupAssignmentByUnit`. If a unit isn’t showing, the ID coercion or field lookup is the likely culprit — not a rendering issue.
- **Modal invisible on mobile:** Almost always a CSS flex issue. The pattern `flex:1 + minHeight:0 + overflowY:auto` on the scroll wrapper is required. `position:sticky` headers do not work reliably inside `overflowY:auto` containers on iOS Safari — use `flexShrink:0` instead.
- **Never use `overflowY:auto` on the outer modal div if using flex column layout** — the scroll must be on the inner content wrapper, not the outer container.

-----

## Pilot Training System (v2.6, July 2026)

**File:** `training.html` — standalone single-file page, no React, plain JS + Firestore REST. Deployed alongside index.html at `/training.html`. Opened from the orange "Pilot Training" bar on the Dashboard (anchor `href="training.html"`, target `_blank`), placed directly below the Bulletin Board bar. Not in the Links tab.

**Purpose:** electronic delivery of the SOP Appendix E Initial Operational Readiness curriculum, individually delivered, with authenticated trainer sign-offs. Curriculum lives as a `BLOCKS` array in the file: Prerequisites + Blocks 1–7 + Closeout, 34 items total. Item labels are Title Case; notes are sentence case.

### Data

- **Doc:** `firehawk / training` — `{ trainees: { c<crewId>: { name, crewId, start, created, createdBy, items: { <itemId>: { by, byId, ts } }, ... } } }`
- Trainee keys are `"c" + crewId` (crew-linked, prevents duplicates). Legacy `t<timestamp>` free-text records render fine but never write to the crew doc.
- All writes are field-masked PATCHes (`fsUpdate`) — trainers on different devices cannot clobber each other. Sign-off removal = mask includes the path, body omits the field (Firestore deletes it).
- Page polls the doc every 10s (`fsListen`-style poll).

### Auth & authority

- Sign-in required to view anything: the page opens to a Restricted Access gate. **Shared session with index.html**: both pages use localStorage key `firehawk_dev_session` (crew id only — a PIN is never stored, matching the app's existing remember-login). Signed into the app = walks straight into training; PIN entry is the fallback; Sign Out on either page clears the shared session. POST `firehawk-auth` Worker `/auth` with `{pin}` → `{ok, id}` → identity resolved from the live `firehawk/crew` doc (archived members rejected). Session is in-memory only.
- **Instructor model (July 2026):** only crew with `instructor: true` on their roster record can sign off, add trainees, or browse all records. Everyone else gets a read-only view of their own folder (`c<their id>`), or a "No Training Record Yet" card. Sign-off removal: original signer or owner.
- Instructor seed: `INSTRUCTOR_IDS = [1, 3, 6]` (Sanchez, Bauchman, Rait) — seeded idempotently alongside the grandfather seed on owner sign-in; fills only unset flags. Rait stays archived, so his instructor flag is dormant until restored (archived members can't sign in).
- Instructor designation is managed day-to-day via the Crew Mgmt **Instructor** pill (owner toggles; managers see it read-only). Field: `membersById.<id>.instructor` — carried in `memberShape`/`normalizeMember` (same preservation class as `trainingStatus`).
- **PM Approval (item `c3`) is owner-tier only** — flips the record to "Approved For Operational Status" and starts the 6-month probation clock (12.2).
- **Delete Trainee is owner-only**, double-tap "Delete?" confirm (4s window, same pattern as Crew Mgmt).

### Crew roster integration (`trainingStatus`)

- New per-member field on `firehawk/crew` → `membersById.<id>.trainingStatus`: `"grandfathered" | "in_training" | "qualified" | null`.
- **CRITICAL: `memberShape` and `normalizeMember` in index.html now carry `trainingStatus`.** Per-member crew saves write the whole member slot from `memberShape` — removing the field from that whitelist would silently wipe training status on any crew edit (same preservation class as `part107`).
- Lifecycle (written by training.html only; index.html is read-only for this field):
  - Create trainee → `in_training`
  - PM Approval tap → `qualified` (un-tap reverts to `in_training`)
  - Delete trainee → `null`
- **Grandfathered seed:** `GRANDFATHERED_IDS = [1, 3, 4]` (Sanchez, Bauchman, Thomas). Seeded idempotently on first owner sign-in to training.html; only fills members whose status is unset. Goddu (2) and Rodriguez (5) go through the checklist.
- Numeric crew IDs in Firestore field paths must be backtick-quoted — `fpSeg()` exists in both files; always use it.

### index.html additions

- `trainingChip(c)` in Crew Mgmt member rows — read-only chip: Grandfathered (blue) / In Training (amber) / Qualified (green). No chip when status is null.
- Orange **Pilot Training** bar on the Dashboard, same geometry as the Bulletin Board bar (accent `C.accent`, custom aviator-wings SVG data-URI icon (silver `%23C9D1D9`) per PM direction; Dashboard rows: Preflight WX `C.green`, Airspace `C.blue`; Bulletin Board bar uses 📋, Thermal Config dashboard row `C.red`). No Links-tab entry — an earlier Links entry + `training` icon were added and then removed in the same session per PM direction.
- Shipped under **v2.6** (PM-set number; a brief v2.7 split was made and reverted in-session). What's New: one user-facing line for the Dashboard Pilot Training bar in the v2.6 entry alongside the My Shifts/OOS items (chip/roster mechanics excluded per changelog policy).
- **Training status never touches role.** RPIC/VO stays manual — trainees serve as VOs during training; PM flips role after qualification.

### chief.html

- Unaffected and verified: zero write paths (read-only), unknown member fields ignored. No edits made.

### Validation ritual for training.html

- Extract last `<script>` block → `node --check`.
- Smoke test with mocked Firestore + auth Worker (see session harness): boot, PIN sign-in, grandfather seed paths, picker eligibility (excludes archived/grandfathered/existing records), crew-linked create + `in_training` write, PM approval + `qualified` write, delete + roster clear, masked-delete body shape.
- index.html render smoke harness (jsdom + npm React 18.3.1, all-fail fetch stub) remains mandatory on every index.html build.
