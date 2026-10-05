# Pipeline 07 + Pacing 06 upgrade - design

Date: 2026-10-05. Approved verbally: "take it - go ahead with everything
including the curve however dont implemnt parts we already have."

## Rulings that shape the scope

- Stale SQLs from a previous month "dont count towards my comission" - they are
  commercially irrelevant and never shown. Everything stall-related is scoped to
  the current month (`DEALS.monthStart`).
- Demos do not get their own module. `demoAt` already lives on every deal row;
  a separate demo tracker would duplicate module 07.
- No duplication of what already renders. The audit of what exists is below.

## Module 04 - Performance

Remove the "Stall alerts" Card (the pending-SQLs list). Stalls move to module
07 as the first stage of the pipeline. Nothing else in 04 changes.

## Module 07 - Deals becomes "Pipeline": one 4-stage conveyor

Reframe the board as the deal's actual left-to-right journey:

1. **Qualified, no demo decision yet** - NEW lane. Fed from
   `PERFORMANCE.stalls` filtered to `createdate >= DEALS.monthStart`. These are
   contacts (SQLs) whose deal has not reached the demo stage - the stage before
   the existing four columns. Rows show name, country, seats, value, age.
   Zero new pulls: performance data is already on disk.
2. **Demo booked** - existing `upcoming` column: demoAt sort, countdown clock,
   "No demo booked" flag. Already built, untouched.
3. **Demo held, awaiting AE** - existing `pending` column with SLA rings.
   Already built, untouched.
4. **Decided** - existing `accepted` / `rejected` columns. Already built.

Header/sub copy updates to describe the conveyor. `src/lib/modules.js` 07
entry sub/signal updated to match. Cross-module import direction:
`deals/index.jsx` imports `PERFORMANCE` from `../performance/data.js` -
read-only, same pattern as module 05 Coach reading sibling data files.

Edge cases: if performance data is stale (older GENERATED_AT than deals), the
stalls lane shows its own "pulled <date>" note. Empty stalls-this-month -> the
lane renders the standard Empty state, not hidden.

## Module 06 - SDR Pacing additions (team tab)

Already exists, NOT rebuilt: projected month-end headline, gap + days left,
needs €/day vs running €/day, expected-today bar markers, "lands short"
callout, per-SDR rows with pace on office tabs. The pace dial from the
reference screenshot is also skipped - the Forecast verdict dot + marker bar
carry the same information.

New:

1. **Strip plot - "Where everyone stands".** One horizontal axis of SQO pace
   (booked / expected-by-now, the existing `pct`), each SDR an initials badge
   positioned by pace, colored by office (EMEA cyan ring, NA violet ring),
   banded At risk (<80) / Behind (80-99) / On pace (>=100), Santiago's badge
   highlighted. Derived entirely from existing roster + actuals. This names
   people on the team tab - deliberate departure from the old "no names on the
   forecast" rule, per the approved reference dashboard. Collision handling:
   badges stack vertically when within ~3% of each other.
2. **Drag callout.** One derived sentence naming the office further behind and
   how many € behind expected it sits, e.g. "Toronto is the drag - €4.2k behind
   where today expects." Computed from the two office aggregates already built
   in TeamTab. Hidden when both offices are on pace.
3. **Cumulative curve.** SQL-created MRR cumulated day by day across the month:
   actual line to today, flat-run-rate projection dashed to month-end, straight
   target path, and a runway band between projection and target. Needs the one
   NEW data element:

### New data contract - `PACING.daily` (optional key)

```js
daily: [ { date: "2026-10-01", sqlMrr: 3100, sqoMrr: 2400 }, ... ]
```

- Team-level per-calendar-day totals, non-cumulative (UI cumulates).
- Pulled with ONE extra HubSpot query per metric: `GROUP BY` day over the
  month-to-date window (same cohorts as the existing month-to-date pulls).
- `gen-pacing.mjs` validates the key only when present (date string, numeric
  mrr fields) and reconciles: sum of daily sqlMrr must equal the sum of
  actuals' sqlMrr within €0.01, same for sqo.
- UI guards: no `daily` key (every refresh until the spec lands) -> curve card
  shows "day-by-day series arrives on the next refresh" instead of a chart.
- REFRESH_SPEC.md module 06 section and briefing-daily SKILL.md gain the
  day-grain query; it rides the existing module 06 pull, so no new run slot.

## Out of scope

Module 08 (rejected - redundant), pace dial (duplicate), any new pull beyond
the day-grain series, office-tab changes, PreviousTab changes.
