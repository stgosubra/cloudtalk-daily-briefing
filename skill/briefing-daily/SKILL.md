---
name: briefing-daily
description: Refresh the daily-briefing dashboard - modules 02 (Today), 04 (Performance), 05 (Self-Served), 06 (SDR Pacing), 07 (Deals). Use for the weekday morning refresh, for the two-hourly module 02 top-up (09/11/13/15/17 CET), when the app shows a STALE banner, or when asked to re-run all modules. Pulls live HubSpot/Calendar/Gmail data and writes each data.js through its generator.
---

# briefing-daily

Refresh runtime for `/Users/ss_cloudtalk/Desktop/daily-briefing`. Runs unattended
on a weekday cadence as the `briefing-daily` scheduled task, and on demand.

Five modules, in this order: **02 Today -> 04 Performance -> 05 Self-Served -> 06 SDR Pacing -> 07 Deals**.

The app has seven modules; the two not listed pull nothing. **01 Dashboard**
derives its alert ladder from the other modules' `data.js` already on disk, and
**03 Calculator** is pure client-side computation. Neither has a generator and
neither is ever refreshed.

## Cadence - full run once, module 02 every two hours

The scheduled task fires at **09:00, 11:00, 13:00, 15:00 and 17:00 CET, Mon-Fri**.
Two run types:

- **First run of the day (09:00) - full run.** All five modules, in order, per
  the hard gate below.
- **Every later slot (11:00 / 13:00 / 15:00 / 17:00) - module 02 only.** Pull,
  payload, `gen-briefing.mjs`. Do not touch 04/05/06/07.

Why: meetings get booked into the current day after the morning brief was written,
and a card that does not exist is worse than a card that is two hours old. 04/05
are YTD/90-day trend data; 06/07 are monthly pacing and deal-outcome data.
Re-pulling any of them five times a day burns the API budget to move numbers
that do not move.

The 17:00 slot is the last one; nothing books a same-day call after 18:00 CET, so
an evening pass has no purpose the next 09:00 run does not already serve.

How to tell which run you are in: read `TODAY_ISO` and `GENERATED_AT` from
`src/modules/briefing/data.js`. `TODAY_ISO` already equal to today means a full
run has landed today -> this is a **top-up run**, module 02 only (04/05/06/07
skipped). `TODAY_ISO` older than today -> **full run**. On a manual trigger with
no instruction either way, default to a full run.

A top-up run still does the Step 0 preflight, still runs the whole module 02
procedure (intraweek pull, exhaustive per-lead enrichment, fresh prose), and
reports counts. It is not a lighter version of 02 - it is the same 02 with
04/05/06/07 skipped as `not due this slot`.

## The spec owns the data contracts, this file owns the procedure

`REFRESH_SPEC.md` in the repo is the source of truth for metric definitions,
funnel math, cohort rules, payload shapes, `/hs` discipline and the validation
gate. **Read it before pulling.** It versions atomically with the generators, so
it is right when this file might be stale. Do not restate its numbers here.

This file owns only: run order, guardrails, PII rules, failure behaviour.

## Config

`config.local.json` alongside this file. Never inline the ids into a query -
read them from there.

## Step 0 - preflight (always, before any pull)

One cheap read-only call per connector, in this order, to establish reachability
before committing to a long pull:

1. **Calendar** - list today's events.
2. **HubSpot** - one trivial aggregate, e.g.
   `SELECT COUNT(*) FROM CONTACT WHERE hubspot_owner_id = '<ownerId>'`.
3. **Gmail** - one thread search.

Then apply the reachability rules below: **Calendar or HubSpot unreachable means
stop before pulling anything.** Report which connectors answered.

Two reasons this is not redundant with the pull itself. It fails in seconds
rather than after a long HubSpot aggregation, and on a manual run it surfaces all
three permission prompts up front instead of stalling mid-refresh.

Sequential, not parallel. Parallel calls make a stall impossible to attribute to
a specific connector.

## How a refresh works

Option A: Claude is the runtime. The app is static - no runtime fetch, no stored
credentials. Per module:

1. Pull live data through approved connectors, per the spec's per-module section.
2. Assemble the module's exports as a JSON payload in a temp file.
3. Hand it to the generator, which validates and writes:

```
node scripts/gen-briefing.mjs    <payload.json>
node scripts/gen-performance.mjs <payload.json>
node scripts/gen-selfserved.mjs  <payload.json>
node scripts/gen-pacing.mjs      <payload.json>
node scripts/gen-deals.mjs       <payload.json>
```

Run these from the project root. Stage payloads as `.tmp-<module>-payload.json`
- that glob is gitignored, and the payloads are the raw pull.

**Never hand-edit a `data.js`.** The generators own those files. Writing one
directly bypasses the shape checks, the reconciliation gates and the atomic
backup - which is exactly how a plausible-looking wrong number ships. If a
generator rejects the payload, fix the payload.

## Module 02 ships first - hard gate

`gen-briefing.mjs` must have written `briefing/data.js` successfully **before a
single module 04 or 05 query is issued.** Not "02 first in the list" - 02 first,
finished, on disk, verified.

Why: module 02 is the only time-critical module. It briefs calls happening in the
next few hours, so a run that spends its first twenty minutes on YTD aggregations
and then dies has failed at the only thing that could not wait. 04 and 05 are
trend data and tolerate being a day old; 02 does not tolerate being an hour late.

So:

1. Do 02 completely - pull, payload, generator, confirm the write succeeded.
2. Then start 04.
3. Then 05.
4. Then 06 (SDR Pacing) - per-SDR SQL/SQO from HubSpot, merged with pacing.config.
5. Then 07 (Deals) - month-to-date deal pull from HubSpot, enriched per deal.

**If 02 fails, stop the run.** Do not fall through to 04/05/06/07. A failed 02
is the headline, and burying it under successful module reports is how it goes
unnoticed. Report the failure and stop. (Trade-off accepted deliberately: a thin
prose card costs you that morning's 04/05/06/07 refresh too. They keep
yesterday's data and the STALE banner says so.)

If 02 succeeds and 04 later fails, continue to 05 - at that point the critical
work already shipped. If 06 fails, continue to 07. A failed 06 or 07 is not
blocking for the rest of the run.

**Start the dev server the moment 02 lands - do not wait for 04/05.** `02
ships first` means the dashboard should be reachable first too:

```
cd /Users/ss_cloudtalk/Desktop/daily-briefing && npm run dev
```

`http://localhost:5173` is then live on module 02's fresh data while 04 and 05
keep pulling. Vite hot-reloads each `data.js` as its generator writes it, so
04/05 landing later updates the page already open since module 02 - no
restart between modules.

## Guardrails

- **Modules 04/05/06 pull via the `/hs` skill, not raw MCP calls.** Aggregate
  server-side with `GROUP BY` + `COUNT(*)`/`SUM(...)`. Pulling rows and counting
  client-side undercounts. Module 07 is the exception: it needs individual deal
  records via `search_crm_objects` (paginate to `total`), not aggregates.
- **One query per metric, spanning the whole window.** Never loop a query per
  month - it returns identical output at 8x the round-trips and no gate catches
  it. See the spec's `/hs` discipline section.
- **Parallelize the module 04/05 aggregations**, 4-6 concurrent. They have no
  interdependencies, the run is latency-bound, and a tight pull window reduces
  count skew. Module 06's two queries (SQL + SQO per SDR) can also run in
  parallel. The Step 0 preflight stays sequential.
- **Module 06 reads roster and targets from `pacing.config.js`**, not from the
  payload. The HubSpot pull provides the per-SDR actuals plus the `daily`
  day-grain series (team SQL/SQO MRR per calendar day, same cohorts - see the
  spec's module 06 section); the generator merges them with the config's targets
  and working-day calculator, and rejects a `daily` series whose sums disagree
  with the actuals. Omitting `daily` needs a declared dataGap.
- **Module 07 uses `deals.config.js`** for the SLA window, segment brackets,
  no-show classification, stage IDs and the monthly target. The HubSpot pull
  provides deal records; enrichment (outcome, segment, age) is computed at
  payload assembly time.
- **Module 07's cohort is every deal created this calendar month**, with no demo
  filter and no acceptance-grace exclusion. A deal with no demo booked still
  counts, and a deal accepted three weeks ago still counts. Narrowing this is how
  the old module failed to total the month.
- **Module 07's clock starts at the demo, not at creation.** `ageH` is measured
  from `demoAt` when there is one, else from `created`. The 48h SLA is on the AE,
  so the clock cannot start before the AE has anything to rule on.
- **A real qualification call is a Modjo note** in HubSpot (NOTE with
  `source=INTEGRATION`), not a booked meeting date.
- **Never pull lead status `ATTEMPTED_TO_CONTACT`** - it means "Qualified Out"
  (~1135 records) and is not part of any cohort here.
- **Points quota is 90/month.** If you see `80` anywhere in `gen-performance.mjs`
  or a `data.js`, that is stale - flag it, do not silently carry it.
- **Declare gaps, do not fill them.** An unreachable connector or a missing field
  goes in `dataGaps` for the user to judge. Never invent a value to satisfy a
  gate.
- **Do not widen the pull scope** to make a number look better. The cohort
  definitions in the spec are deliberate.

## Module 02 pull scope - every run, no exceptions

These three are not optional and not "when time allows". They apply on the 09:00
full run and on every two-hourly top-up identically.

- **Intraweek pull, every run.** Pull the whole current calendar week (Mon-Fri,
  the `weekDays(TODAY_ISO)` set), not just today. Newly booked meetings land on
  Wednesday afternoon for Friday, and the old today-only pull could not see them
  until Friday morning. Today's slice is fully regenerated (facts + prose);
  future days of the week get their cards created or updated from the fresh
  calendar; already-elapsed days of the current week are carried forward verbatim
  as history. Empty days stay `[]` - the generator requires all five keys present.
- **Every invite with a meeting link keeps it.** Any event carrying a join URL
  gets `meetLink` populated, whatever the provider (Meet, Zoom, Teams, Whereby, a
  dial-in in `location`, a URL pasted in the description) and whoever created it -
  including events that classify as *other events* rather than prospect cards.
  Never restrict this to HubSpot-booked meetings. No link found -> `meetLink:
  null`, never a reconstructed URL.
- **Exhaustive per-lead enrichment.** For every attendee run the full search, not
  the minimum needed to fill the card. Search HubSpot on the email, and when that
  misses or returns a partial record, search again by name and by company domain
  before concluding there is nothing. Pull the complete property set in the spec's
  Step 2 - `country` in particular, since the Gmail draft language keys off it and
  a null country silently ships an English draft to a French prospect. A field the
  record genuinely does not hold goes to `null` **and** into `dataGaps`; a field
  you did not look for is a defect. Supplement HubSpot data with LinkedIn and web
  search when records are incomplete.

## Prose gates on module 02

`gen-briefing.mjs` hard-rejects any card with an empty `companyBrief`, an empty
`challengerInsight`, fewer than 5 `qualifierQuestions`, or a question missing
`key`/`label`/`hint`/`why`. This is why the refresh needs an LLM in the loop and
cannot be a plain script. Thin prose aborts the run rather than shipping a weak
brief - that is the intended behaviour, not a bug to work around.

## Connector degradation

- **Calendar unreachable: stop.** Module 02 produces nothing without it. Report
  and leave the existing data in place.
- **Gmail unreachable: continue.** `lastEmail` becomes null; the card render
  guards on it.
- **HubSpot unreachable: stop.** All five refreshed modules depend on it.

Module failure is asymmetric, per the hard gate above: a failed **02 stops the
run**; a failed 04 continues to 05; a failed 06 continues to 07. Report which
succeeded.

## PII

`data.js` holds live customer names, emails and phone numbers. It is gitignored
and stays local.

- Never commit a `data.js`, never paste its contents into a report, a log, a
  commit message or a chat summary.
- Task reports are **counts only**: "02 refreshed, 7 cards, 2 dataGaps". No
  names, no emails, no note contents.
- Never push this repo to its remote. Hosting is deliberately out of scope
  because it would force a PII decision that has not been made.

## Failure behaviour

The generator backs up, writes atomically, re-imports to prove the file parses,
reconciles, and restores the backup on any failure. So a failed run leaves
yesterday's data fully intact and the app's STALE banner shows it.

On failure: report what broke and stop. Do not retry blindly, do not hand-patch
`data.js`, do not relax a gate to get a green run.

## Verify

The server has been running since module 02 shipped (see above) - no fresh
start needed here. After all five modules complete (or after 02 on a top-up
run), use `preview_start` (name `may4-briefing`, reuses the running server) and
confirm no console errors and no STALE banner. Use the serverId that
`preview_start` returns - it changes on every restart.

If 5173 was already taken, Vite silently falls back to 5174 or higher. Read the
port off the `npm run dev` output rather than assuming 5173.

## Known limitations (infrastructure, not per-run)

These are permanent constraints of the current environment. Do not declare them as
per-run dataGaps - they recur every run and create noise that drowns real transient
gaps.

- **Lusha: no MCP connector.** No Lusha tool (`contacts_search`,
  `companies_search`, etc.) exists in the available MCP tools. Every card gets
  `lusha: null`. Do NOT add "Lusha not available this run" to each card's
  `dataGaps` array - it is not a run-specific failure, it is an infrastructure
  absence. Mention it once in the run report as a standing note if needed, never
  per card. The `companyBrief` may note the absence when it materially affects
  qualification (e.g. "no Lusha data to confirm headcount"), but as prose, not a
  gap declaration.

- **segmentSplit: never GROUP BY `amount__products_recurring`.** That field has
  too many distinct values and hits HubSpot's dataset row limit, causing the
  query to fail every time. Use BETWEEN-filtered queries per tier instead (see
  REFRESH_SPEC.md "Segment query pattern" section). This is the fix for the
  recurring "segmentSplit carried forward" dataGap.

## Report

Counts only, plus:

- the run type: `full run` or `top-up run (module 02)`
- one line for the preflight, e.g. `preflight: calendar ok, hubspot ok, gmail ok`
- one line per module, e.g. `02 refreshed: 7 cards, 2 dataGaps`
- `06 refreshed: 12 SDRs, SQL €X / SQO €Y` (or failure reason)
- `07 refreshed: N deals, M breaching the 48h SLA` (or failure reason)
- on a top-up run, the intraweek delta: cards added/removed for later days this week
- any module skipped and why (`04/05/06/07 not due this slot` is a valid reason)
