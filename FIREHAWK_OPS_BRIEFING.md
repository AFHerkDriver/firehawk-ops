# Fire Hawk UAS Team — Firehawk Ops Resume Briefing

**Purpose:** Continuity kit for AI-assisted work on the Fire Hawk UAS program (BC2FD, Districts 2 & 6). Upload this + the current `index.html` to any new chat to resume. Single source of truth for project state.

**Last updated:** July 6, 2026 (end of day)

---

## ⚠️ SESSION START — DO THIS FIRST, EVERY TIME

Multiple chat sessions build on this codebase in parallel. A stale working copy caused a real incident (see Lessons). Before editing ANY app file:
1. **Pull the live deployed file** from `https://raw.githubusercontent.com/AFHerkDriver/firehawk-ops/main/index.html` (and `chief.html`, `training.html` as needed).
2. **Diff against the feature list below** — confirm expected features present before writing a line.
3. If regression suspected, use commit history (`api.github.com/repos/AFHerkDriver/firehawk-ops/commits?path=index.html`) to find last good revision.

---

## Current deploy state (Jul 6 EOD)

- **Live on repo:** `index.html` v2.6, 731,426 bytes — recovered Pilot Training integration + TFR/LAANC fixes through the CHECKING-freeze repair.
- **In outputs, NOT yet deployed:** `index.html` 736,013 bytes — today's final TFR work: three-tier color/access doctrine + NOTAM contact-authority parser. **Deploy this to sync.**
- **Deploy:** GitHub mobile upload -> wait for GREEN "pages build and deployment" run in Actions tab -> hard refresh (commit truth != serve truth). iOS PWA: remove & re-add each deploy. `.nojekyll` must be in repo root.

## Validation ritual (mandatory, in order)
1. Pull live + diff.
2. Edit via Python str_replace with count assertions; big literals via cat-heredoc _old.txt/_new.txt.
3. Extract last <script> -> `node --check`.
4. **Headless render smoke** — render_smoke.js (jsdom + npm react@18.3.1, all-fail fetch stub). Pass = root innerHTML >500 chars, zero errors. Catches runtime crashes node --check misses.
5. Verify deploy: raw file not 0 bytes AND green Actions run.

---

## The product

**Firehawk Ops** — single-file React PWA (React UMD CDN, createElement aliased `h`, no JSX/build). Repo AFHerkDriver/firehawk-ops (main), site afherkdriver.github.io/firehawk-ops/. Single-file is intentional; edit surgically.

**Companion repo files:**
- `chief.html` (~183KB) — read-only command board: on-duty RPIC contact button, day-level UPSTAFF section, FINALIZED/DRAFT parity.
- `training.html` (~284KB) — Pilot Training tracker: SOP Appendix E curriculum, live instructor sign-offs, readiness %. Own branding (Training Record badge). iOS safe-area fixed. Block 2: DJI M30T, DJI M4T, DJI Avata quals.
- `AIRSPACE_COMPLIANCE.md`, `airspace_reference.html` — airspace logic of record + visual gallery.
- `README.md`, `render_smoke.js`, icon PNGs, `.nojekyll`.
- `PROGRAM_SUPPORT_CHARTER.md` — program-support scope. **NOT for repo/website** — it is the AI project-instructions doc. Lives in Claude project custom-instructions + admin records only.

**Backend:** Firestore (firehawk-scheduler) REST. Workers: firehawk-auth (PIN via KV), firehawk-wx (open /?url= proxy — exonerated; filters non-browser origins).

---

## Airspace module

**Ladder, most-restrictive-first:** TFR (Layer 0 render override) -> National Security (99.7 DoD layers) -> P/R SUA reachable floor (<=3000 AGL, FL-aware) -> LAANC min controlling ceiling -> advisory SUA -> Class -> earned-green Class G. Fail-loud: named-source failures, all-fail -> CHECK INCOMPLETE, never false all-clear.

**TFR pipeline:** worker-proxied tfrapi/exportTfrList (labels) + GeoServer WFS tfr.faa.gov/geoserver/TFR/ows (geometry). Layer self-discovered from GetCapabilities, boundary-first ranked (airport/navaid are traps). Queries ALL non-reference layers, merges. Polygons AND point+radius circles. Radius caps (loose <=50NM, hard <=500). Phantom filter: drop no-id + radius>200NM. Cross-layer dedupe. +-72NM pull so status names NEAREST beyond scan (self-proving). Race fix + 40s watchdog: status can never freeze on CHECKING.

**TFR color/access doctrine (today's work, deploy pending):**
- ORANGE Fire/Hazard (91.137 incl HAZARD): "FIRE/HAZARD TFR — COORDINATE WITH AIR BOSS." Our airspace to work.
- RED National Defense (99.7/SSI): "UAS PROHIBITED · FIRE/EMERGENCY REQUIRE AGENCY APPROVAL (NOT AIR BOSS)." Different door.
- RED Other (VIP/security/space): "FLIGHT PROHIBITED."
- Inside ANY TFR -> scope tints red. Nat-def detection beats fire keywords.
- **tfrContact parser:** scans NOTAM text for authority — ATSC, SOSC, DoD/DHS-via-ATSC, air boss/ATGS, ARTCC, CTC/CONTACT + phones. Fallback "SEE NOTAM FOR ENTRY COORDINATION." Limitation: parses shape's carried properties; sparse ones fall back. Per-NOTAM detail fetch is a scoped future step.

**Weather:** NWS gridpoint at exact GPS = PRIMARY (source of record) -> OM direct -> OM proxy -> METAR observed. NWS-served: background OM enriches 80m winds (setWx(prev)), never blocks GO card. Windy has no free API.

**Elevation (AGL):** cache (fh_elev_cache 0.005deg) -> OM direct -> OM proxy -> USGS EPQS -> EPQS proxy. Survives OM outages. OM IP-blocks program (v2.0 flood aftermath); rate guards keep us trivial.

**Other:** LAANC overlay toggle (envelope query, outFields=*, controlling-min dedupe of overlapping facility maps). Quick-Zoom (0.5NM, 20s auto-return). AGL traffic (CONFLICT<=500 red, NEARBY<=1000 amber). GPS priming banner (in DashboardView NOT App). Owner SourceDiagnostics: ~20 live probes, "ALL SOURCES OK / N FAILING."

---

## Crew & schedule

- Crew Mgmt: Phone field (chiefs see when on duty), Instructor toggle, In-Training chip.
- **Seed-write guard (critical):** crew doc seeds defaults only when doc PROVABLY exists and empty — failed/timed-out read never authors DB (this bug wiped Goddu/Rodriguez 107 dates). Fallback roster baked: Goddu 2028-05-14, Rodriguez 2028-06-12.
- My Shifts: forward-looking (past auto-drop, today kept), planned-OOS flag (3-col row: unit+role / OOS center / status right), .ics carries OOS.
- Finalize Month includes OOS-only days.
- chief.html: on-duty RPIC contact button (skips if manager, no doubling), day-level UPSTAFF section.

---

## Lessons (do not repeat)
- **Pull live before editing.** Stale base overwrote Pilot Training across 5 deploys; recovery needed GitHub history. Hence SESSION START.
- node --check != runtime — render smoke mandatory.
- Never bet a source on unverified field names — use outFields=* (bit us on SUA, LAANC overlay, TFR radius).
- FAA NationalSecurityUAS_FlightRestrictions never existed — real: DoD_Mar_13 + Part_Time_National_Security_UAS_Flight_Restrictions.
- iOS permission modal SUSPENDS page — freezes in-flight fetches; not endpoint health.
- One user-facing version per deploy session; manager sets final. What's New = crew VO/RPIC-facing only.
- Reassembled catch-chains drop braces (caught by node --check).

---

## Program context (non-app work)

Aaron Sanchez, UAS Program Manager. Colleagues: Ryan Bauchman (Coordinator), Michael Thomas, Blake Goddu, Joseph Rodriguez. Fire Chief Ralph Rodriguez. Assets: DJI M4TD (UAV121/124), DJI Dock 3 (planned DFR), DJI Avata, DJI Mini 5 Pro.

**On the horizon:** SOP wet-ink signature + Captain designation; FY27 budget for Chiefs Review; FAA COA/waiver (fall); five-station DFR rollout (DFR121-125, Dock 3 + M4TD, late 2026-early 2027; UVT quote SO229565 exp Jul 2026); TIFMAS/TXTF1 list (Warren Weidler). Contacts: UVT/Todd Johnson (vendor), Brandon Alberd & Paul Brown (TX DPS TAK), Jake Caskey (TFS UAS Lead).

**Principles:** Let operational evidence (AARs, exercises) carry arguments. SOP appendices are drafts until Chief-signed — never cite as established. Aaron authored the SOP (sensitivity around self-promotion in rank requests). Terse; lead replies with a "For you" block (decisions/heads-up), detail below.
