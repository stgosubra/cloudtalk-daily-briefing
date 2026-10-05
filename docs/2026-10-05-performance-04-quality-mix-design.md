# Module 04 Performance - quality, mix and progression additions

Date: 2026-10-05. Status: approved in session.

## Problem

Module 04 answers "am I going to hit quota this month" but the performance pull
already lands four datasets the page never renders: `acceptanceByMonth`,
`sqoToWonByMonth`, `segmentSplit` / `segmentMonthly`, and `progression`. The
module shows this month's acceptance snapshot but not whether qualification
quality is trending up or down, what segment the value comes from, or the
month-by-month MQL/SQL/SQO ladder in euros.

## Decision

Option A: three new blocks on the existing single-scroll page, between
"Pipeline funnel · year to date" and "Points per month". Nothing existing
moves. Fallback if the page feels long once rendered: Option C, a tab bar
("Quota" / "Quality" / "Mix") - the cards are self-contained so lifting them
into tabs needs no rework.

**Zero pull, generator, or spec changes.** Every block reads `PERFORMANCE`
keys that already exist and already pass the generator's reconciliation.
Full-window pull every refresh stays (rejected the incremental/delta-pull
idea: the aggregates are one `GROUP BY month` query returning ~10 rows
regardless of window, and pending-to-decided transitions reshape the current
month daily).

## Blocks

### 1. Qualification quality · since Feb

One AreaChart, two lines, y-axis 0-100%:

- **Acceptance rate** per month = `accepted / (accepted + rejected)` from
  `acceptanceByMonth`. Pending excluded - undecided is not a verdict.
  Bucketing is decision-month (`accepted_deal__date_time_` /
  `rejected_deal_timestamp` per the spec), so history is effectively
  append-only.
- **SQO to Won rate** per month = `won / sqo` from `sqoToWonByMonth`.
- Colors: emerald (acceptance), blue (won-rate).
- Footnote: both YTD rates from `acceptanceYtd` / `sqoToWonYtd`, plus a note
  that the current month is still deciding (pending deals will move it).

### 2. Segment mix · SQO value by month

Stacked bars from `segmentMonthly` - micro / SMB / mid-market SQO value per
month, euros (`value` already carries `amount_in_home_currency`). Right-side
label derives the YTD skew from `segmentSplit` (e.g. "MM is X% of value on
Y% of deals"). **Not masked by Present mode** - segment MRR is deal data,
not comp-plan data.

### 3. Monthly progression

Compact mono table, one row per month: MQL count · SQL count + EUR · SQO
count + EUR · rejected count. Straight from `progression[]`. No chart, no
hover - numbers to scan.

## February start

A single `SINCE = "2026-02"` constant in the module; render-time filter on
all three new blocks. January is a 4-SQO ramp month that distorts every
rate. Jan stays in the data and in the existing cards (points chart, YTD
funnel), which keep their full-YTD behavior.

## Out of scope

- Any change to the pull window, `gen-performance.mjs`, or `REFRESH_SPEC.md`.
- Masking the new blocks in Present mode (nothing in them is comp-plan).
- Geo matrix / `rejectedByOwner` / `closed` ARR - available in the data,
  deliberately not added this round.
