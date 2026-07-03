# Firehawk Ops — Handoff Briefing
**Current live build: v2.5 (July 2026).** Upload this + `index.html` (and `chief.html` if touching the command board) to a fresh chat to resume.

> This brief replaces the older "Firehawk Ops v2 / ops.html rebuild" handoff. That rebuild is **done** — it cut over and *is* the production `index.html` now (`DEV_COL = "firehawk"`, cutover complete). There is no separate dev file. Disregard any prior brief that talks about `ops.html`, `firehawk_dev`, or a pending swap.

---

## What this is
Aaron Sanchez (UAS Program Manager, BC2FD, badge 2118) runs the Fire Hawk UAS scheduling/ops platform: two single-file web apps deployed to GitHub Pages, backed by Firebase Firestore and two Cloudflare Workers. No build step.

| Tool | File | URL | Audience |
|------|------|-----|----------|
| Fire Hawk Ops (crew) | `index.html` | afherkdriver.github.io/firehawk-ops/ | UAS crew (PIN sign-in) |
| Daily Status Board | `chief.html` | afherkdriver.github.io/firehawk-ops/chief.html | Battalion Chiefs / command (read-only) |
| Legacy build | `legacy.html` | (in repo, reference/rollback only) | — |

Repo: `AFHerkDriver/firehawk-ops`, served from root.

---

## Architecture (settled — don't relitigate without cause)
- **One self-contained file per tool.** React via UMD CDN, `React.createElement` aliased `h`, **no JSX, no Babel, no build step.** Rationale: trivial to re-upload to resume a chat; Claude edits surgically (grep → `str_replace`) so a large single file stays maintainable.
- **Frontend:** `index.html` ≈ 6,068 lines, `chief.html` ≈ 524 lines. Fonts: DM Mono, Bebas Neue.
- **Backend:** Firebase Firestore, project `firehawk-scheduler`, collection **`firehawk`** (this is `DEV_COL`, now pointed at production). Helpers: `fsGet/fsSet/fsListen(col, doc)`, `fsGetPath/fsSetPath(docPath)`. The public Firestore web key in source is client-side and protected by security rules — no secrets/PINs in the repo.
- **Auth:** Cloudflare Worker `firehawk-auth` verifies PINs against salted SHA-256 hashes in Worker KV; returns member id + tier. Hashes live only in the Worker.
- **Weather/alerts:** Cloudflare Worker `firehawk-wx` (`https://firehawk-wx.usafsentinel-45e.workers.dev`) — `/burnban` (TFS, hourly), `/redflag` (NWS, 30 min), flood via `/?url=` proxy to api.weather.gov for TXZ205/TXC029 (30 min). All fail-silent. **Not reachable from the Claude sandbox** — verify banners on-device.
- **Hosting:** GitHub Pages from repo root.

---

## Data model (the part that bites if you forget it)
**Crew** — stored in Firestore doc `crew` as a keyed map `membersById` + explicit `memberOrder`. Written with **field-scoped updates** so concurrent crew/availability edits don't overwrite each other. App works with the array form (`crew`), members have: `id` (numeric), `name`, `first`, `rank`, `title`, `role` (RPIC/VO), `tier` (owner/admin/staff), `initials`, `color`, `part107`, `archived`. `isActive = c => !c.archived` (reserve concept removed; field vestigial). `LEAD_PILOT_ID = 1` = Sanchez = UAV121.

**Schedule** — one doc per month: `firehawk/schedule_{YYYY}_{M}` (**M is 0-indexed**). Stored as `{ days }` (object keyed by day-of-month) or a `daysJson` string; `fsGetPath` normalizes both.

**Two-unit day model** — each day decodes via `decodeDay(day, crew)` → `{ u121:{active,vo}, u124:{rpic,vo}, upstaff:[] }` plus `day.confirmed` (finalized flag):
- **UAV121** (lead unit): `u121.active` means Sanchez/`LEAD_PILOT_ID` flies it as RPIC; `u121.vo` is the observer.
- **UAV124** (primary): `u124.rpic` + `u124.vo`.
- **Upstaff**: day-level extra/training crew, independent of a second aircraft.
- `encodeDay(u121,u124,upstaff)` writes the stored shape `{rpic, vo, vo2, lead, extra}`. `decodeDay` also reads a **legacy format** (no `lead` field — infers UAV121 from `rpic === LEAD_PILOT_ID`), so historical months still parse.

**Availability** — Firestore doc `availability` (field-scoped, month-keyed) + `availability_locks` doc. **Locked by default**; owner/admin unlock a month via the Lock/Unlock button so crew can input. Access log in doc `access_log` (owner-only, capped, full name + fire rank).

**Shift rotation** (module scope): `ANCHOR_DATE = Date.UTC(2026,0,1)`, `SHIFT_PATTERN = ["A","A","B","B","C","C"]`, `getShift(y,m,d)`, `todayShift()` (shift flips at 0700). `SHIFT_COLORS` A=red, B=blue, C=green.

**Theme `C`** (top of script): bg `#0D1117`, panel `#161B22`, panel2 `#1C2230`, border `#30363D`, text `#E6EDF3`, dim `#8B949E`, accent `#FF6B35` (Aaron reads as "red"/bad), blue `#3B82F6`, green `#34C759`, amber `#FFC107`, red `#FF3B30`.

---

## App layout (`index.html`)
- **Top nav:** Dashboard · Schedule · Links.
- **Dashboard** nav-rows: 🌤️ Preflight WX · ✈️ Airspace · 🌡️ Thermal Config · 🔦 SAR Operations (each opens a modal). Plus Bulletins.
- **Schedule** sub-tabs: **Calendar** (read-only for signed-out/staff; manager grid + auto-propose for owner/admin) · **Crew** (owner/admin only) or **My Shifts** (staff) · **Availability**. The sub-tab row is hidden when signed out.
- **Sign-in:** PIN-based, tiers **owner / admin / staff**. Sanchez = owner, Bauchman = admin (both show ADMIN pill). Archived members locked out of sign-in.
- **Footer:** version + collapsible **What's New** (user-facing changelog only).
- **`chief.html`:** read-only, no sign-in. Today's date/shift, 7-day coverage strip, crew on duty grouped by UAV121/UAV124 (same two-unit model), per-unit OOS windows, live weather banners. Auto-refresh every 5 min.

---

## Version history (user-facing)
The footer/What's New show the **user-facing** version; behind-the-scenes reliability work ships between releases without its own number, so the visible sequence stays continuous for crew.

- **v1.0** — go-live: production crew app + redesigned command board, shield branding/favicon, fire-rank access log, What's New panel.
- **v1.1** — Class E reads clear-to-fly (no auth for standard Part 107 to 400 ft AGL).
- **v1.2** — installable home-screen PWA with the Fire Hawk badge icon.
- **v1.3–v1.4** — Availability calendar: reliable concurrent saving (field-scoped writes); months locked until the program opens them.
- **v1.5** — personal **My Shifts** view; add shifts to phone calendar (ICS).
- **v1.6** — **YTD Stats.** Button under the calendar opens a full-screen, legacy-styled stats page: one count per person of **finalized** days worked this calendar year (UAV121 + UAV124 collapsed, upstaff counts, one tally per person per day), a Total Crew-Days / Active Crew summary, per-person bar vs. the busiest crew, and a Jan–Dec mini-bar. Visible to all signed-in crew (no secrets). Button sits in MANAGER CONTROLS next to Lock/Unlock for owner/admin; under the calendar (no lock button) for staff. Component `YtdStatsModal`; lazy-fetches 12 months of `schedule_{year}_{m}` on open.
- **v1.7 (current)** — **Finalized / Draft day states.** A day reads **Finalized** (green) or **Draft** (amber) everywhere — legend, day card (manager toggle now "✓ Finalized / ● Draft" instead of ON/OFF, and read-only status). **Auto-draft on edit:** changing crew or an OOS window on a finalized day re-opens it as Draft (via the single `editDay` mutation point — `confirmed`-bearing patches, i.e. the finalize toggle and bulk Finalize/Unfinalize, are exempt). Footer shows a **status dot**: green when every crewed day is finalized, amber while any day is Draft. Single-day finalize is the existing day-card toggle. Month-level Finalize/Unfinalize unchanged (bulk-sets per-day `confirmed`; no separate month flag exists).
- **v1.8** — **Smoother ADS-B tracker.** Airspace 3NM traffic polls airplanes.live every 5s (was 10s) and **interpolates between polls** on a 500ms tick — each blip is dead-reckoned forward from its last real fix using ground speed + track, then range/bearing recomputed to the operator, so blips glide instead of jumping (zero extra API load; re-syncs every poll). Also fixed a **latent crash**: the conflict/inbound audio refs (`prevConflictIds`, `inboundTimer`) were used but never declared, so alert tones threw and were swallowed on any real low-altitude contact — now declared properly. New helper `projectAircraft(b, nowMs)`; raw `lat/lon/gs/track/t0` kept in an `adsbBase` ref.
- **v1.9** — **Tail number + type in traffic list.** Each traffic row shows raw **tail · type** (`r` = registration, `t` = ICAO type code from the feed), hidden when the feed omits both (anonymized/PIA/some military). List-only; not on the scope blips. Poll bumped **5s → 3s** for smoother movement (still inside airplanes.live's 1 req/sec limit; 3s is the most aggressive rate run to date — watch for `429`).
- **v2.0** — **AGL traffic altitudes.** On GPS lock the app fetches ground elevation at the operator (Open-Meteo `/v1/elevation`, ft = m×3.28084, `groundElevFt` state + `groundElevRef`); `projectAircraft` adds `agl`, `effAlt(ac)=agl??alt`. Thresholds `CONFLICT_AGL=500`, `NEARBY_AGL=1000`; SFC-1k/5k/10k filter, blip colors/labels, row display (AGL big + MSL sub), conflict/inbound alerts all keyed to AGL; clean MSL-only fallback when elevation fetch fails (header shows which mode). AGL is relative to ground *under the operator*, not under the aircraft.
- **v2.1** — **Scrub-fix batch + currency advisory.** Fixed: GPS-jitter thrash (`posGateRef` ~20 m gate before `setPosCoords` — jitter was tearing down the ADS-B effects and polling at GPS rate), stale `altMax` closure (fetch effect deps now `[posCoords, altMax]`), iOS-silent alert tones (WebAudio primed on first touch/pointer), out-of-order poll overwrites (`fetchSeq` guard). Dashboard **Part 107 currency banner**: red <30 d (incl. expired), amber 30–90 d, per-pilot days, worst-tier coloring. Desktop radar capped `maxWidth:420` centered. **chief.html**: removed legacy `HISTORY` force-confirm override (board must mirror scheduler truth) and renamed badges to ✓ FINALIZED / DRAFT.
- **v2.2** — **Live TFR awareness.** FAA ArcGIS has **no live TFR layer** — live TFRs come from tfr.faa.gov, fetched through the `firehawk-wx` `/?url=` proxy (CORS). **Post-ship fix:** `tfr2/list.html` was deprecated (redirects to a dataless JS shell) — list source is now the JSON API `tfrapi/exportTfrList` (fields `notam_id/type/state`, TX-filtered, cache-busted; legacy scrape kept as fallback), shape XMLs still at `save_pages/detail_X_XXXX.xml` (verified live static store). All fetches have AbortController timeouts (12 s list / 8 s detail), details run in parallel, and if the list shows TX TFRs but zero detail XMLs are reachable the status reads **UNAVAILABLE** — never a false all-clear. Cap 8, 10-min refresh + on GPS lock, expired dropped, upcoming kept. Status line above scope, detail cards (NOTAM, type, brg, dist-to-edge, end time CT), diamond markers clamped at ring edge. ⚠ If the worker allowlists domains, add `tfr.faa.gov` or status shows UNAVAILABLE.
- **v2.3 (current)** — **True TFR boundaries.** Per-shape parsing (polys per `abdMergedArea` `geoLat/geoLong`; circles per `geoLatCen/geoLongCen` + `valRadiusArc`), shapes rendered on the scope (SVG `clipPath` `fhScopeClip` at the 3 NM ring, inside the track-up rotated group, beneath blips) when the boundary reaches ~3.2 NM; ray-cast point-in-polygon / circle radius test now decides **inside**, centroid-circle only as fallback.
- **v2.5 (current) — consolidated airspace release.** Internal sequence 2.4→2.6 collapsed to one user-facing number at Aaron's direction (**policy: one release number per deploy session; Aaron sets the final number before deploy**). Components:
  - **SUA floor-relevance filter.** MOA/Restricted/Warning polygons only surface if their floor is reachable by a Part 107 op (`floorAGL(...) <= 3000`, AMSL converted via `groundElevRef`, unknown floors treated as SFC). Fixed the false alarm where a 14,000 MSL MOA showed as an actionable caution.
  - **Airspace audit (ladder + fail-loud).** Findings fixed: (1) *priority inversion* — LAANC grid used to short-circuit BEFORE the National Security check; ladder is now most-restrictive-first (NSR → P/R SUA → LAANC → advisory SUA → Class → clear); (2) *false all-clear on failure* — `safeFetch` now marks failures/`{error}` payloads `__failed`; all-fail → status `"incomplete"` (red CHECK INCOMPLETE card, verify via B4UFLY); partial-fail → warning line, and green Class G requires all 4 sources to have answered; (3) overlapping LAANC grids show the **minimum** (controlling) ceiling; (4) advisory SUA over a grid rides the LAANC card as `suaNote` instead of vanishing.
  - **LAANC grid overlay (display-only).** `gridOn` toggle (default OFF) beside North-Up/Track-Up; envelope query (±3.5 NM) of `FAA_UAS_FacilityMap_Data` with `returnGeometry`, rate-gated (0.01° move / 5-min floor per the GPS-rate rule), cells rendered beneath TFR shapes + blips, clipped at the ring, ceiling number per cell (0=red, ≤100 amber, else blue). Fail-silent; never affects the card verdict. Also Title-Case label pass: 'Launch Ground', 'Ground Elev Unavailable', '(MODEL UNAVAILABLE)'.
  - **TFR as Layer 0 + FAA provenance.** Render-time derive (`insideTfr`/`dispData`/`dispStatus`, all card reads renamed to `disp*` — state decls unchanged): standing inside an active TFR overrides EVERY verdict with a red `TFR {notam} — FLIGHT PROHIBITED` card (NOTAM + end time CT). SUA source migrated to the FAA AIS `Special_Use_Airspace` layer (schema: `TYPE_CODE/LOWER_DESC/LOWER_VAL/UOM/CODE/TIMESOFUSE/CONT_AGENT`, verified live, data-edit May 2026) with `fetchSUA()` falling back to the TAMU NASR mirror only on failure; `normSua()` normalizes both schemas; cards carry a `SRC · FAA-AIS|TAMU-NASR|tfr.faa.gov` provenance chip. `floorAGL` now handles flight levels (`FL180` → 18,000 MSL). Compliance doc `AIRSPACE_COMPLIANCE.md` lives in the repo root — **any change to sources/ladder/thresholds/failure semantics must update it in the same commit.**

---

## Validation workflow (non-negotiable, every change)
1. Extract the last `<script>` and `node --check` it:
   `python3 -c "import re; open('_c.js','w').write(re.findall(r'<script>(.*?)</script>', open('index.html').read(), re.S)[-1])" && node --check _c.js && rm -f _c.js`
2. **Bump `APP_VERSION`** only on user-facing change (footer renders it); add a What's New line. Copy-only/internal fixes don't bump.
3. Surgical edits: `str_replace` on unique anchors; assert replacement count == 1. Multi-occurrence → python global replace with count asserts.
4. Unit-test pure logic in node before presenting (e.g. the YTD tally was tested against explicit + legacy day formats incl. dedup).
5. `node --check` passing is necessary, **not sufficient** — Claude can't render React here; Aaron validates on-device (iOS-specific layout/inputs MUST be confirmed on his phone).
6. Aaron deploys himself. Claude produces complete, validated files and `present_files` them.

Working files: `/home/claude/firehawk_extract/`. Outputs: `/mnt/user-data/outputs/`.

---

## Comms & working style
- **Lead every message with a `🚩 **For you**` block** — decisions Aaron must make + heads-ups. Build detail goes below it.
- Aaron is terse ("works, next"). **Surface structural issues and tradeoffs BEFORE building; never assume approval.** Aaron makes all product decisions.
- Check available project files before asking; ask only what's still unclear.
- Title Case for buttons/labels, sentence-case prose, minimal bold. Own mistakes without groveling.
- What's New / LOG is **user-facing (VO/RPIC) only** — describe only what a signed-in user sees or does; exclude owner/admin mechanics (crew mgmt, PIN/access tiers).
- UI: archive button gray, remove button red (red reserved for destructive actions only). Real department data over placeholders where it's a useful reference.

---

## Deployment
GitHub mobile app only. After deploy, iOS PWA needs **remove-then-re-add** on the home screen (not just hard refresh) to clear stale installs — old pre-fix code in a home-screen PWA is a known silent killer of regressions.

---

## Known follow-ups / on the horizon
- **⚠ Incident (Jul 2026) — GPS-rate API flooding, root-caused and guarded:** effects keyed on `posCoords` (20 m gate) refired network calls at driving speed — Open-Meteo elevation ~1 req/s sustained → **Open-Meteo silently IP-blocks abusive ranges** (their issue #1651: "timeout depends on the public IP"), which killed Preflight WX on *all* the user's devices (direct leg) and risked the worker egress (proxy leg). Guards now in code: elevation ≤1 attempt/5 min (or >0.005° move), TFR run ≤1/2 min (or >0.02° move), ADS-B floored at 2.5 s spacing via `lastAdsbAt`. **Rule for all future features: nothing network-facing may key its rate off raw GPS movement.** Blocks on the device/CGNAT IP may take time to clear; the WX proxy leg (Cloudflare egress) is the recovery path meanwhile.
- **YTD Stats on-device check:** confirm 12-month totals against a known month; test the staff button with a staff PIN (not just owner).
- **PIN clash check** — Worker-side fix outstanding (client is ready to surface the error).
- **DFR program:** DJI Dock 3 stations DFR121–125, targeting late 2026–early 2027; DroneSense dashboard live at dashboard.dronesense.com/bc2fdfirehawk.
- **SOP / FAA COA:** Firehawk UAS SOP v2 in Chiefs Review; SOP signature is the prerequisite for the FAA Certificate of Authorization/waiver (targeted fall). Captain designation resolution ongoing.

## Resuming
Upload `index.html` + this brief to a new chat. Claude greps to the relevant spot and edits surgically — it does not re-read the whole file each turn, which is why a single large file stays workable.
