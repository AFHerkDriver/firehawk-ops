# Firehawk Ops — Airspace Data Sources & Decision Logic

**Program:** Fire Hawk UAS Team · Bexar County ESD No. 2 Fire Department (BC2FD), Districts 2 & 6
**Applies to:** Firehawk Ops crew app (`index.html`), Airspace module
**Document version:** 1.0 · July 2026 · reflects app v2.5
**Maintained by:** UAS Program Manager

---

## 1. Purpose

This document records, for compliance and audit purposes, exactly what data the Firehawk Ops Airspace status uses, where that data comes from, how the app decides what to display, and the known limits of that determination. It exists so that any reviewer — internal, county, or FAA — can trace every on-screen airspace verdict back to its source and its decision rule.

## 2. Advisory nature — read first

The Airspace status is a **preflight situational-awareness aid. It is not an airspace authorization and does not replace one.** LAANC authorizations are obtained through an FAA-approved UAS Service Supplier (e.g., Aloft); DroneZone authorizations through the FAA. The remote pilot in command remains responsible under 14 CFR Part 107 for the legality of every flight regardless of what this app displays.

## 3. Data sources and provenance

| # | Layer | Source & host | Authority | Update cadence |
|---|-------|--------------|-----------|----------------|
| 0 | Temporary Flight Restrictions | tfr.faa.gov — JSON list API (`tfrapi/exportTfrList`) + per-NOTAM shape XML (`save_pages/detail_*.xml`), fetched via the program's Cloudflare Worker proxy | FAA (authoritative, live NOTAM system) | App refresh every 10 min and on GPS lock (rate-gated) |
| 1 | National Security UAS Flight Restrictions | FAA AIS ArcGIS (`services6.arcgis.com/ssFJjBXIUyZDrSYZ`), `NationalSecurityUAS_FlightRestrictions` | FAA (authoritative) | FAA-maintained; queried on 0.1 NM movement |
| 2/4 | Special Use Airspace (P/R/W/A/MOA) | **Primary:** FAA AIS ArcGIS `Special_Use_Airspace` layer. **Automatic fallback:** Texas A&M NRI mirror of FAA NASR (`gis.nri.tamu.edu`), used only if the FAA layer is unreachable. The active source is displayed on the card as a `SRC ·` chip. | FAA NASR data, 28-day AIRAC cycle | Queried on 0.1 NM movement |
| 3 | LAANC UAS Facility Map (grid ceilings) | FAA AIS ArcGIS, `FAA_UAS_FacilityMap_Data` | FAA (authoritative) | FAA 56-day publication cycle |
| 5 | Class Airspace boundaries | FAA AIS ArcGIS, `Class_Airspace` | FAA (authoritative) | FAA NASR cycle |

Supporting data: operator position from device GPS; ground elevation at the launch point from Open-Meteo (used to convert AMSL floors to AGL); local airport database embedded in the app, sourced from FAA Part 71 designations.

## 4. Decision ladder — most restrictive always wins

All spatial layers are point-intersect queries at the operator's GPS position. The first layer that matches controls the card; every layer below it is outranked.

**Layer 0 — Active TFR (render-time override).** If the operator's position is inside an active TFR — determined by ray-cast against the TFR's published polygon, or radius test for circular TFRs — the card goes red: `TFR {NOTAM} — FLIGHT PROHIBITED`, with the NOTAM number and end time. This outranks every other verdict, including a valid LAANC grid.

**Layer 1 — National Security UAS Flight Restriction.** Hard stop, red. Outranks LAANC grids (a grid ceiling does not authorize flight inside an NSR).

**Layer 2 — Prohibited / Restricted SUA with a reachable floor.** Red. "Reachable" means the area's floor is ≤ 3,000 ft AGL after converting AMSL and flight-level (FL) floors using launch-site ground elevation. The 3,000 ft screen is a deliberate 7.5× margin over the 400 ft Part 107 ceiling: high-altitude SUA (e.g., a MOA with a 14,000 MSL floor) is real airspace but is never a factor for sUAS and is filtered to prevent alarm fatigue. Unknown or unparsable floors are treated as surface — the app fails toward warning, never toward silence.

**Layer 3 — LAANC facility grid.** Shows the **controlling ceiling — the minimum** across all overlapping grids at the position. An optional scope overlay (LAANC toggle, off by default) renders this same layer's grid cells with their ceilings around the operator's position; it is display-only and does not participate in the verdict. A 0-ft grid renders red (DroneZone manual authorization required). If an advisory SUA (MOA/Warning/Alert) with a reachable floor overlies the grid, it is carried onto the same card as an amber caution rather than being hidden.

**Layer 4 — Advisory SUA alone.** MOA / Warning / Alert with a reachable floor and no LAANC grid: amber, "verify active status before launch."

**Layer 5 — Class airspace.** Controlled airspace without a LAANC grid → DroneZone guidance; Class E surface → cleared for standard Part 107 to 400 AGL. A nearest-airport sanity check guards against boundary-data gaps near Class B/C cores.

**Layer 6 — Clear (Class G).** A green all-clear is rendered **only when all four spatial sources answered and found nothing.**

## 5. Failure semantics — no false all-clear

- A source that fails (network error, or an ArcGIS error payload) is counted as **failed**, never as "no restrictions."
- If **all** sources fail, the card renders red: **CHECK INCOMPLETE — verify via B4UFLY / FAA UAS Facility Map before launch.**
- If **some** sources fail, whatever verdict the surviving sources produce is displayed **with a warning line** stating how many sources were unreachable; if the survivors found nothing, the card still renders CHECK INCOMPLETE rather than green.
- The TFR status line has the same property: it displays CLEAR, *n* WITHIN 15 NM, INSIDE, or **CHECK UNAVAILABLE** — it never renders clear on missing data. If the TFR list is retrieved but no shape files can be read, the status is UNAVAILABLE.

## 6. Known limitations (for the SOP)

1. **Point check, not area check.** The verdict applies to the ground the operator is standing on. Airspace 2 NM downrange may differ; crews planning to range out should verify the mission area, not just the launch point.
2. **Data currency.** SUA, Class, and LAANC layers follow FAA's 28/56-day publication cycles; the app is exactly as fresh as FAA's data. TFRs are the live exception (10-minute refresh).
3. **TFR geometry approximation at range.** "Inside" is a true boundary test. Distance-to-edge for *nearby* TFRs uses a centroid-plus-extent approximation and is conservative.
4. **Coincident hard stops.** If a TFR and an NSR overlap at the operator's position, the TFR is displayed (it is the transient condition crews are least likely to know about); both are flight-prohibiting.
5. **GPS dependency.** No GPS lock → no verdict (AWAITING GPS LOCK); the app never substitutes an assumed position for spatial queries.

## 7. Change control

This document is versioned in the repository alongside the code it describes. Any change to a data source, the ladder order, the floor-relevance threshold, or the failure semantics requires an update to this document in the same commit.

| Doc ver | App ver | Date | Change |
|---------|---------|------|--------|
| 1.0 | v2.5 | Jul 2026 | Initial issue following full airspace audit: ladder reordered most-restrictive-first; fail-loud semantics; SUA floor-relevance filter (incl. FL floors); minimum controlling LAANC ceiling; SUA source migrated to FAA AIS with TAMU fallback and on-card provenance; TFR integrated as Layer 0. |
