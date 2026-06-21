# Firehawk Ops — Rebuild Briefing

**App version:** 9.5.2
**Status:** Feature-complete and validated in the dev sandbox. Cutover to production is the only remaining step.
**Owner:** Aaron Sanchez — UAS Program Manager, BC2FD

---

## Where things stand

The Firehawk Ops app has been rebuilt from the legacy monolithic page into a modernized, self-contained app. Every planned feature has been ported and validated on-device. Historic schedule data (January through June 2026) is loaded into the dev sandbox, including upstaffing, so the rebuild can be checked against the real record. The next and final move is the production cutover, planned for the day after this briefing was written.

---

## The app at a glance

- **One self-contained file**, built with React loaded from a CDN — no build step, no tooling to maintain. Easy to deploy by dropping the file onto GitHub Pages.
- **Firestore backend** with two separate spaces: a dev sandbox (used through the whole rebuild) and a production space (goes live at cutover).
- **Weather and airspace** pulled live from public aviation and National Weather Service feeds, routed through a lightweight proxy so the app stays fast and avoids browser cross-origin issues.
- **Three access tiers:** owner, admin, and staff — enforced throughout. Owners and admins can post and edit; staff get a clean read-only view.
- **Deployed to GitHub Pages** as a static site, with a separate Battalion Chief view.

---

## Completed features

- **Dashboard** — central nav and program status.
- **Preflight Weather** — GPS-aware conditions plus the nearest reporting stations, drawn from the full airport database.
- **Airspace** — live status, full airport/airspace classification database, and live aircraft tracking with an iOS audio fix. Classifications are authoritative, not guessed.
- **Bulletin Board** — owner/admin posting, staff read-only, author titles stamped automatically by identity.
- **Thermal Config** — mission-by-mission camera guidance (gain, palette, isotherm, tips) with a day/night toggle and quick-view palette swatches.
- **NIFOG** — national interoperability radio channel reference (fire, tactical, medical, law, search-and-rescue groups).
- **SAR Operations** — search patterns, sensor guidance, and flight tips, with a cross-link into Thermal Config.
- **Links** — quick access to the partner tools and field apps, each with its own icon.
- **Schedule** — the most recently reworked area (see below).

---

## Schedule & upstaffing

This was the focus of the most recent work and is now settled:

- **Month view (quick read):** each day shows the two units — **UAV121** and **UAV124** — followed by the colored initials of each unit's RPIC. Fast to scan at a glance. Coloring stays consistent: green confirmed, amber unconfirmed, red out of service.
- **Day popup (expanded):** tapping a day opens a **"Crew On This Day"** roster listing everyone assigned — RPIC, VO, and any additional crew — each with their colored dot, name, and role. Upstaffed crew are flagged in amber, with a **"+N UPSTAFF"** tag in the panel header. This is where training-day and surge staffing become visible.
- **Shift label order:** the popup header reads shift-first, e.g. **"A Shift · UAV121 + UAV124"** — matching how the team actually says it.
- **Historic data:** January–May 2026 (the locked, non-editable months) were rebuilt from the original coverage record and loaded into the sandbox **with upstaffing preserved**. June came across from the live board. The full January–June set is now available for validation.

**Note for any future edits:** the day editor still uses the unit-assignment controls. The month cell and day popup are the display layers. If the editor ever needs a dedicated upstaff control of its own, that's the natural follow-on — but it isn't required for current operations.

---

## Remaining — Production cutover (final step)

Mechanical and low-risk, since the rebuild is already proven. In order:

1. **Point the app at the production space** instead of the sandbox.
2. **Promote the rebuild to the primary page** and point the Battalion Chief view at production.
3. **Load the historic January–May schedule into production** — production currently only holds June, so the locked months need to be loaded there once, the same way they were loaded into the sandbox.
4. **Verify on-device**, then keep the legacy page deployed-but-unlinked for a few days as a fallback before fully retiring it.

**Two decisions to settle at cutover:**
- Whether to carry over or reset the existing crew availability data.
- The access-log history cap (legacy keeps fewer entries; the rebuild keeps more) — pick one.

**Housekeeping:** the temporary one-button loader pages used during the data migration can be deleted from the repo once production is confirmed.

---

## Working principles (carry these forward)

- **Title Case for all buttons and labels.** This is a hard rule, not a preference. (Letterspaced all-caps eyebrow labels like "AIRCRAFT STATUS" or "GAIN" are a separate, intentional style and are exempt.)
- **Build and ship.** Surface real blockers and decision points first, get a quick confirmation, then execute. Don't over-plan or ask redundant questions.
- **Rebuild unstable components from scratch** rather than patching repeatedly — patching compiled or tangled output tends to fail.
- **Airspace classifications are authoritative** from the federal regulation, never inferred from airport size.
- **Validate every increment on-device** (phone and desktop) before moving to the next.
- **Operational detail stays out of personnel-facing screens** — it belongs in reasoning and back-end logic, not on the surface.

---

---

## Links & Resources

**Program sites (GitHub Pages)**
- Firehawk Ops app — `afherkdriver.github.io/firehawk-ops/`
- Battalion Chief view — `afherkdriver.github.io/firehawk-ops/chief.html`
- Blue Card trainer — `afherkdriver.github.io/bcesd2-blue-card/`
- TAK Ops (State of Texas) — `afherkdriver.github.io/bcesd2-tak-ops/`

**Field & records apps** (the Links-tab destinations)
- DroneSense public dashboard — `bc2fd.dronesense.com` (also `dashboard.dronesense.com/bc2fdfirehawk`)
- Firehawk EFB — `jotform.com/app/260715423210141`
- ESO Suite — `esosuite.net/login/bxcesd2`
- MapNova — `app.mapnova.com/login`

**Live data sources** (powering the app, by name)
- Open-Meteo — weather
- National Weather Service — alerts and forecasts
- FAA UAS Facility Map — LAANC airspace ceilings
- Texas A&M Forest Service — burn-ban status

---

*This briefing is a continuity snapshot. It includes navigable links to program sites and tools, but intentionally omits credentials, API keys, and implementation code.*
