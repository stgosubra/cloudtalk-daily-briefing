# Daily Brief - Canonical Pull Spec

Reference for the refresh mechanism (Option A: agent-orchestrated). Claude, in-session, is the refresh runtime. The app stays static: no runtime fetch, no standing credentials. Each refresh re-pulls live data for the **present day**, transforms it to the module's `data.js` shape, writes the file, and verifies the preview.

This spec is the source of truth for the per-module generators and for the single refresh skill, `briefing-daily`. Any structural change to a `gen-*.mjs`, a payload shape, or a module's data schema must update this file in the same commit - the skill and the repo are a synchronised pair.

There is no token-based path. `scripts/refresh-perf.mjs` was deleted: it hardcoded a retired quota and wrote `data.js` directly, bypassing every gate below. No token is stored, no script runs unattended, Claude drives every pull through approved connectors.

## Identity and shared constants

Per-operator values are **not written here**. They live in `src/config.js`
(gitignored, created from `src/config.example.js` at install) and, for the
refresh runtime, in `~/.claude/skills/briefing-daily/config.local.json`. Read
them from there; never inline an owner id into a query.

- Owner: `PROFILE.name`
- `hubspot_owner_id` = `PROFILE.ownerId`
- Email: `PROFILE.email`
- HubSpot portal = 6195055 (shared)
- Contact-record URL: `https://app.hubspot.com/contacts/6195055/record/0-1/{hsObjectId}`
- Deal-record URL: `https://app.hubspot.com/contacts/6195055/record/0-2/{dealId}`

## Refresh scope and cadence

Wraps **modules 01, 05 (Coach), 03 (Performance), 04 (Self-Served), 06 (SDR Pacing), 07 (Demos)** at the trigger.

**Cadence: 09:00, 11:00, 13:00, 15:00, 17:00 CET, Mon-Fri.** The 09:00 slot is a **full run** (01, then 05, then 03, then 04, then 06, then 07). Every later slot is a **module 01 + 05 top-up**: 01 then 05, 03/04/06/07 untouched. Meetings get booked into the current day after the morning brief is written, so a once-a-day 01 is structurally behind by lunchtime; 03/04 are YTD and 90-day trend series that do not move five times a day. 17:00 is the last slot - a call booked after 18:00 CET is not a same-day call, so the next 09:00 run serves it.

Run type is read off `src/modules/briefing/data.js`: `TODAY_ISO` already equal to today means a full run landed today, so this is a top-up; `TODAY_ISO` older than today means full run. A manual trigger with no instruction defaults to a full run.

| Module | id | Sources | Pull discipline |
|--------|-----|---------|-----------------|
| 01 Today / Schedule | `briefing` | Google Calendar + HubSpot + Gmail | calendar via browser, HubSpot per-contact lookup, Gmail via browser |
| 03 Performance | `performance` | HubSpot | `/hs` (server-side GROUP BY aggregation) |
| 04 Self-Served | `selfserved` | HubSpot | `/hs` + per-contact deal-association check |
| 05 Coach | `coach` | briefing + performance + selfserved data.js | LLM generation via `gen-coach.mjs` |
| 06 SDR Pacing | `pacing` | HubSpot | `/hs` (per-SDR SQL/SQO aggregation) |
| 07 Demos | `demos` | HubSpot | `/hs` (deal-level demo pull + enrichment) |

**Order is a hard gate, not a preference.** `briefing/data.js` must be written and verified by `gen-briefing.mjs` before the first module 03 or 04 query is issued. Module 01 briefs calls happening within hours; 03 and 04 are trend data that tolerate a day of staleness. A run that burns its first stretch on YTD aggregations and then dies has failed at the only thing that could not wait. A failed 01 therefore stops the run; a failed 03 continues to 04. Modules 06 and 07 run after 04, in that order. A failed 06 continues to 07.

The other two surviving modules pull nothing: 00 Dashboard derives its tiles from the registry, 02 Calculator is pure client-side computation. Pre-Call SE now lives outside this app (`cloudtalk-precall-se/`, entered via the `pcb-cloudtalk` skill); Competitor was removed.

## `/hs` discipline (modules 03 and 04)

- Call `tool_guidance` once before the first `query_crm_data` of a run.
- Aggregate **server-side** with `GROUP BY` + `COUNT(*)` / `SUM(...)`. Never pull rows and count client-side - that path undercounts (see CLAUDE.md memory).
- Supported: `DATE_TRUNC`, `COUNT(*)`, `SUM`, `GROUP BY`, `BETWEEN`, cross-object `OBJECT.property`.
- Not supported: `DISTINCT`, `CASE`, column aliases, `JOIN`, `HAVING`.

### One query per metric, spanning the whole window

Each metric is **one** aggregation covering every month at once - `GROUP BY <dimension>, DATE_TRUNC('month', <date>)` with a single `BETWEEN` over the full window. Never loop a query per month.

A per-month loop returns byte-identical output at 8x the round-trips, and nothing downstream would catch it: the reconciliation gates check arithmetic, not how the numbers were fetched. This rule is the only thing standing between a 25-call run and a 200-call one. The geo-matrix example below is the canonical shape - copy its structure for every metric.

### Parallelize the aggregations

The module 03 metrics have no interdependencies. Issue them in parallel batches (4-6 concurrent; HubSpot's per-portal concurrency limit is not documented here, so stay conservative rather than discovering it mid-run) instead of one at a time. A run is latency-bound on round-trips, not on HubSpot's aggregation work.

This is a correctness measure as much as a speed one. `gen-performance.mjs` documents a known MQL drift whose stated cause is two counts "pulled moments apart" - independent `COUNT`s against a moving pipeline. Compressing the pull into a tight window shrinks that skew. A snapshot should be a snapshot.

Exception: the Step 0 preflight stays strictly sequential. Its purpose is attributing a stall to a specific connector, which parallel calls destroy.

---

## Module 01 - Today / Schedule

File: `src/modules/briefing/data.js`. Component (`BriefingModule.jsx`) is never touched by a refresh.

### What gets regenerated each run

- Date constants: `TODAY_ISO`, `TODAY_LABEL`, `REFRESHED_AT`, `WEEK_DAYS` (Mon-Fri of the current week - working week only, no weekend columns). Derived from `src/lib/dates.js`; never hand-typed.
- `WEEK_PROSPECTS[TODAY_ISO]` = array of prospect cards for today, fully regenerated (facts + prose).
- `WEEK_OTHER_EVENTS[TODAY_ISO]` = array of non-meeting calendar blocks for today.
- **Intraweek pull, every run.** The calendar pull covers the whole current week (the `weekDays(TODAY_ISO)` Mon-Fri set), not just today. Future days of this week get their cards created or updated from the fresh calendar - a meeting booked Wednesday for Friday must appear on Wednesday, not on Friday morning. Days of the current week that have already elapsed are carried forward verbatim. Days with nothing on them stay `[]`; the generator requires all five week keys present.
- Enrichment depth is graded by day, deliberately. Today's cards get the full treatment (exhaustive HubSpot + Gmail + Lusha + fresh prose, all the gates below). Future-day cards need the calendar facts and the HubSpot join at minimum; their prose is regenerated in full on the morning they become today.
- Historical week arrays (`LAST_WEEK_PROSPECTS`, `TWO_WEEKS_AGO_PROSPECTS`) are **not** refreshed - they are frozen history, rolled by `gen-briefing.mjs` itself on a Monday change.

### Step 1 - Calendar (browser)

Use `Claude_in_Chrome` (`tabs_context_mcp` -> `navigate` to Google Calendar -> `get_page_text`). `Control_Chrome` is unreliable in this environment (read/exec fail with "Chrome not running"); prefer Claude_in_Chrome.

**Week view, not day view.** One pull of the current week covers today and the intraweek days above at the same cost as a day view. Read today's slice off it for the cards, and the Tue-Fri columns for the forward days.

Per event extract: attendee display name + email, `start`, `end` (HH:MM), **meeting link**, RSVP status, canceled flag. Classify each event:

- Has an external attendee / is a prospect call -> prospect card.
- Personal / internal block (gym, lunch, AFK, sport) -> other event.

**Meeting links are not HubSpot-scoped.** Pull the join link for *every* event that has one, whatever its provider and whoever created it - Google Meet, Zoom, Teams, Whereby, a raw dial-in URL in the location field or pasted in the description. Do not restrict this to HubSpot-booked meetings, and do not drop the link just because the event classified as an "other event": an internal sync or a partner call is exactly the kind of block where a one-click join is the whole point.

This holds for **every invite in the intraweek pull**, not only today's: a forward-day card without its join link forces a calendar hunt at the moment the call starts, which is the one moment there is no time for it.

Both classifications carry it under the same key, `meetLink`, so the UI needs no branch. Look in this order: the event's conferencing entry, then `location`, then the first URL in the description. No link found -> `meetLink: null`, never a guessed or reconstructed URL.

### Step 2 - HubSpot enrichment (per attendee)

For each prospect attendee email, look up the contact (`search_crm_objects` on contacts by `email`). Single-record lookups are fine via raw MCP; the `/hs` aggregation rule applies only to counts. Pull:

`firstname`, `lastname`, `company` (+ company domain for `companyUrl`), `jobtitle`, `country`, `hs_lead_status` (-> `leadStatus`), `lead_source` (-> `leadSource`), associated deal count (-> `deals`), `seat_range` (-> `seats`), `phone`.

**Exhaustive search, per lead.** One email lookup is the start of the search, not the whole of it. If the email misses, or returns a record with the wanted properties empty, search again: by `firstname + lastname`, by company name, by the email's domain against company records, and check the contact's associated company for firmographics the contact record does not carry. Only after those miss is the field genuinely absent.

`country` is the field this rule exists for. It drives the Gmail draft language (Step 3), so a null country does not degrade gracefully - it ships an English draft to a French prospect and nothing in the app flags it. Chase it on the contact, then the associated company, then the phone country code as a last resort (recorded as an inference in `dataGaps`, never written as if pulled).

A property the record genuinely does not hold is `null` **and** an entry in `dataGaps`. A property that was not looked for is a defect, not a gap.

Ambiguity rule: if the calendar gives only a first name and HubSpot returns multiple matches, pick the best candidate, **flag the assumption** in `companyBrief`, and add a "confirm who is on the call" qualifier. Never silently guess.

### Step 3 - Gmail (browser)

Last email thread with the attendee -> `lastEmail` (subject + date + 1-line gist). If Gmail is not reachable this run, set `lastEmail: null` (the card render guards on null). Do not block the refresh on Gmail.

**Draft language.** The card's Gmail button opens a pre-filled "I'm on the call, are you joining?" draft. It is localised off the contact's `country`: **Spain -> Spanish, France -> French, everything else -> English.** Copy is written natively per language (FR vouvoiement and French question/colon spacing; ES tuteo, the norm in Spanish B2B SaaS), not machine-translated from the English.

This keys on **country, not on the card's sales region**. The regions would mistranslate - Portugal is region `ES` without being Spanish-speaking, Morocco and Belgium are region `FR`. English is the deliberate fallback for every other country: a machine-translated Dutch or Italian draft reads worse than a clean English one.

The copy lives in `DRAFT_COPY` in `BriefingModule.jsx` (component-side, not generated), so a refresh only needs to pull `country` correctly in Step 2 - it never writes email copy into `data.js`.

### Step 3b - Lusha enrichment (always run, every card, carryover and new)

For every prospect card - not just newly-enriched ones - run Lusha: `contacts_search` by email first, then by `first_name + last_name + company_name` if the email lookup 404s, then fall back to `companies_search` by domain for company-level firmographics if no contact match exists (e.g. shared inboxes, unindexed small companies). Populate the card's `lusha` object (verified, title, seniority, department, linkedin, personLocation, companyLegalName, headcount, headcountBand, industry, subIndustry, founded, hq, businessModel, linkedinFollowers, mainLine, teamShape, seniorityShape, competitors, itSpend, funding, signals, industryContext, dataGaps) with whatever Lusha returns; fields with no data stay `null`/`[]`, never fabricated. If both contact and company lookups miss, leave `lusha: null` but say so explicitly in `dataGaps`/`companyBrief` rather than silently skipping the attempt.

Feed Lusha firmographics into `qualifierQuestions` and `companyBrief` where it sharpens discovery - e.g. a large multinational contact should get a scope/authority-check question (is this team-scoped or enterprise-wide?), a small team gets different questions than a 10,000+ employee company.

### Output shape

Prospect card:

```js
{ name, email, start, end,
  hsLink: HS(id), meetLink, canceled, rsvp,
  company, companyUrl, jobtitle, country,
  leadStatus, leadSource, deals, seats, phone, multiAttendee,
  companyBrief, challengerInsight,
  qualifierQuestions: [{ key, label, hint }],
  lastEmail }
```

Other event: `{ emoji, name, start, end, color, note?, meetLink? }`.

`meetLink` on an other event is rendered as a join button by `BriefingModule.jsx` (Meet and Zoom are labelled distinctly, anything else falls back to a generic join). Omit the key or set it `null` when the event has no link.

`HS(id)` is defined locally in `data.js` (full contact URL, no `OWNER` dependency).

### Determinism vs generated prose

- Deterministic (pulled facts): everything except the three prose fields.
- Generated per run: `companyBrief`, `challengerInsight`, `qualifierQuestions`. These are Claude-authored from the pulled facts. Regenerate them each run from the fresh data; do not carry stale prose forward.

### PII handling

Names, emails, phones are pulled. They live in `data.js` for the **local dashboard only**. Never write them to logs, summaries, memory, or any external system. PII use here is pre-authorized for the local build (CLAUDE.md memory) and nowhere else.

---

## Module 03 - Performance

File: `src/modules/performance/data.js`. Single export `PERFORMANCE`. All counts via `/hs` GROUP BY.

### Metric definitions (deal-based, matched to portal reports)

- **SQL** = deals the operator created: `deal_creator__sdr_only_` = `<ownerId>`, bucketed by deal `createdate`.
- **SQO** = SQLs accepted by an AE: + `deal_accepted_by_ae` = true.
- **Rejected** = `deal_accepted_by_ae` = No, bucketed by `rejected_deal_timestamp`.
- **Points** = `deal_sdr_points_number` (seats_points + va_point). 90 pts/month = 100% = EUR 1,933.33; 1 pt = EUR 21.48. Quota was raised from 80 to 90 on 2026-07-22 - `scripts/gen-performance.mjs` and `performance/data.js` already carry 90; do not reintroduce 80. Credited in the month the deal is **accepted** (`accepted_deal__date_time_`), not created.
- **AI deal** = `va_point` >= 1.
- **Seat tier** (`discovery_call__seats`): micro 1-10, senior_micro 11-20, smb 21-50, mm 51-100, enterprise 101+.
- **MRR segment** (`amount__products_recurring`): micro <= 500, smb 500-1500, midmarket >= 1500.
- **Won** = dealstage 6607659 (Won / Implementation - Inbound Pipeline).
- **Value** = `SUM(amount_in_home_currency)` (EUR). **Geo** = deal-level `country`.

### Sections to regenerate (keys of `PERFORMANCE`)

- `refreshedAt`, `weekLabel`, `monthLabel`, `pacing.today` / `dayOfMonth` / `daysInMonth` / `earned`.
- `points[]`, `acceptance`, `acceptanceByMonth[]` + `acceptanceYtd`, `sqoToWonByMonth[]` + `sqoToWonYtd`.
- `stalls[]` (this month's SQLs still pending an AE decision; UI flags > 24h old).
- `funnel` (MQL by month; SQL/SQO/rejected/pending + value by seat tier by month; AI vs core by month).
- `metrics` (week + month headline), `mqlToSql`, `progression[]`.
- `rejectedByOwner[]`, `mqlGeo[]` + `mqlGeoTotal`, `segmentSplit`, `segmentMonthly[]`, `geo[]` + `geoTotal`.
- `mqlYtdDrift` - **required number.** `funnel.mql.ytd` minus the sum of the monthly MQL buckets. Declare it even when it is `0`. MQL YTD is its own distinct-contact `COUNT`, not a decomposition of the months, so a small drift is expected and must not abort the run - but it must not be invisible either. `gen-performance.mjs` checks the declared value for exactness, then lets the run through, and `src/lib/freshness.js` renders any non-zero drift in the Shell's amber GAPS banner. This replaces a `console.warn` that nobody reads on an unattended run.
- `dataGaps` - **required array of strings**, empty when there are none. The home for anything the run declared rather than filled: a connector that did not answer, a field HubSpot returned null for, a count pulled at a different moment. Also rendered in the GAPS banner. Empty must be an explicit `[]` so "no gaps" is a statement, not an omission.
- **Geo matrix** `byCountry`: `{ [country]: [{ month, label, mql, sql, sqo, rejected }] }` for each funnel month. This is the live geo re-pull the full-refresh standing instruction requires every run. Drive it from three GROUP BY queries (country x DATE_TRUNC month) for SQL, SQO, Rejected, plus the MQL contact count by country.

### Query pattern (geo matrix example)

One aggregation per metric, grouped by country and month:

```
SELECT country, DATE_TRUNC('month', createdate) AS m, COUNT(*)
FROM deals
WHERE deal_creator__sdr_only_ = <ownerId>
  AND createdate BETWEEN <window_start> AND <window_end>
GROUP BY country, m
```

(Aliases are not supported - express the month bucket inline per the live tool's accepted syntax.) Repeat with `+ deal_accepted_by_ae = true` for SQO and the rejected filter for Rejected. MQL is a contact-level count by `country`.

---

## Module 04 - Self-Served

File: `src/modules/selfserved/data.js`. Single export `SELFSERVED` (+ `onboardingAlertCount`). Rolling 90-day window ending today.

### Cohort (all must hold)

- `hubspot_owner_id` = `<ownerId>`
- `hs_lead_status` NOT IN ('Qualified', 'ATTEMPTED_TO_CONTACT') - both are excluded up front.
  `ATTEMPTED_TO_CONTACT` means "Qualified Out" in this account's lead-status model
  (see CLAUDE.md memory: never filter *for*/pull this status as an open cohort) and
  is treated as functionally equivalent to `Qualified` for this cohort - it must never
  surface as an eligible or non-qualified-open Self-Served candidate.
- `account_became_active` within the rolling 90-day window
- contact has **zero open** and **zero closed-won** deals (closed-lost is allowed -> flagged RE-ENGAGE)

Eligibility judged on contact-level deal association (`associations.DEAL`).

### Funnel (drives the top strip)

`activeInWindow` -> `qualified` (excluded) -> `nonQualified` -> `disqualifiedByDeal` (closed-won, excluded) -> `closedLostReengage` (kept, flagged) -> `noDeal` (clean) -> `eligible` (clean + closed-lost).

### Ranking

`rank_score = round(seat*0.40 + geo*0.35 + source*0.25)`. Tier -> score: T1=100, T2=66, T3=33. Sort desc; ties by `account_became_active` desc (newest activation first).

### Item shape

```js
{ hsObjectId, self_served, hsLink,
  firstname, lastname, email, phone, jobtitle, country, city,
  lifecyclestage, hs_lead_status, hs_lead_status_label, lead_source,
  account_became_active, ct_account_status, active_trial,
  seats: { seat_range, seats_indicated__aggregated_, seats_requested_in_ft },
  engagement: { notes_last_contacted, num_contacted_notes },
  company: { name, domain },
  closedLostFlag, hygieneFlag,
  seat_tier, geo_tier, source_tier, rank_score }
```

### Regenerate each run

`refreshedAt`, `today`, `windowStart`, `windowEnd`, `funnel`, `items[]` (re-pulled, re-scored, re-sorted). `onboardingAlertCount` (3-30 day activation band) recomputes from `items`.

### PII handling

Same as module 01: names, emails, phones are present; local dashboard only; never logged, transmitted, or stored in memory.

---

## Module 05 - Coach (AI strategy)

File: `src/modules/coach/data.js`. Single export `COACH`. PII-free: references cards by index, not by name/email.

### Generation

`scripts/gen-coach.mjs` runs during the `briefing-daily` refresh, after module 01 ships. It reads the three data.js files (`briefing`, `performance`, `selfserved`) and sends them with the system prompt from `scripts/lib/coach-prompt.mjs` to Claude. The response is validated and written through the `refresh-core.mjs` pipeline.

### Cadence

- **Full run (09:00)**: after module 01, before module 03. Order: 01 -> 05 -> 03 -> 04.
- **Top-up run (11:00/13:00/15:00/17:00)**: after module 01, every time.

If performance or selfserved data is stale (yesterday's), the generator still runs - the brief's primary value comes from today's calendar, which is always fresh.

### Data shape

```js
export const COACH = {
  generatedAt: "ISO",
  todayIso: "YYYY-MM-DD",
  priorities: [{ rank, type, title, detail, linkedModule, linkedEntity, urgency }],
  pipelinePulse: { summary, risks: [], opportunities: [] },
  weekRead: "...",
  dataGaps: [],
};
```

### Validation

1. `priorities` is 1-8 items, each with all required keys.
2. Every `linkedModule` is one of "01", "03", "04".
3. `pipelinePulse.summary` is non-empty.
4. `urgency` is one of "high", "medium", "low".
5. No email address anywhere in the serialized output (PII leak check).

---

## Module 06 - SDR Pacing

File: `src/modules/pacing/data.js`. Single export `PACING`. All counts via `/hs` GROUP BY across the full SDR roster.

### What it tracks

Current-month SQL and SQO actuals for every SDR in both offices (BCN + TOR), against per-person targets from `src/pacing.config.js`. The component renders progress bars, pace markers, status pills, and a month-over-month comparison tab.

### Pull discipline

Two `/hs` aggregations, one for SQL and one for SQO, grouped by `deal_creator__sdr_only_`:

**SQL actuals (current month):**
```
SELECT deal_creator__sdr_only_, SUM(amount_in_home_currency), COUNT(*)
FROM deals
WHERE deal_creator__sdr_only_ IN (<all roster owner IDs>)
  AND createdate BETWEEN <month_start> AND <now>
GROUP BY deal_creator__sdr_only_
```

**SQO actuals (current month):**
```
SELECT deal_creator__sdr_only_, SUM(amount_in_home_currency), COUNT(*)
FROM deals
WHERE deal_creator__sdr_only_ IN (<all roster owner IDs>)
  AND deal_accepted_by_ae = 'true'
  AND accepted_deal__date_time_ BETWEEN <month_start> AND <now>
GROUP BY deal_creator__sdr_only_
```

Both queries run in parallel. Owner IDs come from `pacing.config.js` roster, not hardcoded. Results are keyed by owner ID in the `actuals` object.

### Payload assembly

1. Read `CURRENT_MONTH` from `src/pacing.config.js` for targets, roster, offices, pool.
2. For each roster entry, call `calFor(person, todayIso)` to get `{ total, elapsed, left }`.
3. Build the payload:

```js
{
  todayIso: "YYYY-MM-DD",
  monthLabel: "October",
  roster: [{ id, name, office, sql, sqo, cal: { total, elapsed, left }, note? }],
  actuals: { "<ownerId>": { sqlMrr, sqlDeals, sqoMrr, sqoDeals } },
  offices: { BCN: { label, region, workingDays }, TOR: { ... } },
  pool: { sql, sqo }
}
```

4. Write to temp file, run `node scripts/gen-pacing.mjs <payload.json>`.

### Reconciliation

- Roster is non-empty.
- Every roster entry has `id`, `name`, `office`, `sql`, `sqo`, `cal`.
- Actuals keyed by owner ID.
- If `rollups.team` is present, team SQL/SQO must equal sum of individual actuals.

### Cadence

Full run only (09:00). Not on top-up runs - pacing numbers move once a day at most.

---

## Module 07 - Demos at Stake

File: `src/modules/demos/data.js`. Single export `DEMOS`. Deal-level pull via `/hs`, enriched per-demo.

### What it tracks

Demos booked on inbound-SDR deals across both offices. Tracks MRR at stake, segment mix, no-show rate, speed-to-demo, and per-SDR breakdown. Horizon window: 15 working days forward, 20 working days back, 8-week history.

### Cohort

A demo is an inbound-SDR deal with a booked demo slot (`demo_call__date_time_` is set):

- `deal_creator__sdr_only_` IN `(<all roster owner IDs>)` - team-wide, not just the operator
- `demo_call__date_time_` within the pull window (20 working days back through 15 working days forward from today)
- Exclude deals already past AE acceptance with > 24h grace: if `deal_accepted_by_ae = 'true'` AND `accepted_deal__date_time_` < today - 1 day, skip

### Pull

Use `search_crm_objects` (not `query_crm_data`) because individual deal records are needed, not aggregates. Read `total`, paginate to it.

**Properties to request:**
`dealname`, `deal_creator__sdr_only_`, `demo_call__date_time_`, `hubspot_owner_id`, `amount_in_home_currency`, `deal_currency_code`, `country`, `hs_analytics_source`, `dealstage`, `createdate`, `deal_accepted_by_ae`, `accepted_deal__date_time_`, `demo_no_show_status`, `closedate`

**Filter:**
```json
{
  "filterGroups": [{
    "filters": [
      { "propertyName": "deal_creator__sdr_only_", "operator": "IN", "values": ["<all roster IDs>"] },
      { "propertyName": "demo_call__date_time_", "operator": "BETWEEN", "value": "<window_start_epoch_ms>", "highValue": "<window_end_epoch_ms>" }
    ]
  }]
}
```

### Per-demo enrichment

For each deal returned:

1. **SDR name** - look up `deal_creator__sdr_only_` in the roster from `demos.config.js`.
2. **AE name** - `hubspot_owner_id` is the current owner (AE after handoff). Look up owner name via `search_owners`.
3. **Segment** - apply `segOf(amount_in_home_currency)` from `demos.config.js`: micro < 500, smb 500-1500, mm > 1500, none if null.
4. **No-show status** - apply `noShowState(demo_no_show_status)` from `demos.config.js`: "ok", "noshow", or "rescheduled".
5. **Speed-to-demo** - working hours between `createdate` and `demo_call__date_time_`, weekends excluded. `slow = speedH >= 48`.
6. **In play** - `true` unless `ns === "noshow"` or deal is in a won/lost stage (stage IDs from `demos.config.js`).
7. **Closed** - if dealstage is in `WON_STAGES` -> "won"; in `LOST_STAGES` -> "lost"; else `null`.
8. **Office** - from roster lookup on `deal_creator__sdr_only_`.
9. **Key** - ISO date portion of `demo_call__date_time_` (the calendar day the demo is booked on).
10. **Time** - HH:MM portion of `demo_call__date_time_`, converted to the office's local timezone (BCN -> Europe/Madrid, TOR -> America/Toronto).

### Payload shape

```js
{
  todayIso: "YYYY-MM-DD",
  demos: [{
    id: "<dealId>",
    name: "<dealname>",
    key: "YYYY-MM-DD",        // demo date
    time: "HH:MM",            // local to office TZ
    office: "BCN" | "TOR",
    sdrId: "<ownerId>",
    sdr: "Name",
    ae: "Name",
    amt: 1200,                 // amount_in_home_currency (EUR)
    seg: "micro" | "smb" | "mm" | "none",
    country: "ES",
    src: "Inbound",            // hs_analytics_source
    speedH: 22,                // working hours deal-create -> demo
    slow: false,               // speedH >= 48
    ns: "ok" | "noshow" | "rescheduled",
    closed: null | "won" | "lost",
    inPlay: true,
    url: "https://app.hubspot.com/contacts/6195055/record/0-2/<dealId>"
  }],
  roster: {
    "<ownerId>": { name: "Name", office: "BCN" | "TOR", lead: false }
  }
}
```

Write to temp file, run `node scripts/gen-demos.mjs <payload.json>`.

### Reconciliation

- `DEMOS` has `todayIso`, `demos` (array), `roster` (object).
- Every demo has required keys: `id`, `name`, `key`, `time`, `office`, `sdrId`, `sdr`, `seg`, `ns`, `inPlay`.
- Valid `office`: BCN, TOR. Valid `seg`: micro, smb, mm, none. Valid `ns`: ok, noshow, rescheduled.

### Cadence

Full run only (09:00). Not on top-up runs - demo bookings do not change intraday at the frequency that justifies re-pulling.

### PII handling

`demos[].name` is a deal name (company), not a person's name. No personal contact data in the payload. Safe from a PII standpoint, but `data.js` is still gitignored as a matter of policy.

---

## Validation gate (every module, every run)

Before writing `data.js`:

1. **Parse** the generated module to confirm it is valid JS (the file must `export` cleanly).
2. **Shape check** - required keys present, arrays non-degenerate, no `undefined`/`NaN` in numeric fields.
3. **Reconciliation** - module 03/04 totals must equal the sum of their parts (e.g. funnel SQL = sum of seat-tier SQL; `eligible` = `noDeal` + `closedLostReengage`). A mismatch means a client-side count slipped in - re-pull via `/hs`.

Steps 1-3 are enforced by `scripts/lib/refresh-core.mjs`, not by judgement - the generator throws rather than writing a payload that fails any of them.

After writing, reload the preview and confirm no Vite error overlay and no console errors. Start it with `preview_start` (name `may4-briefing`) and use whatever serverId that returns - never a hardcoded one, the id changes every restart. In an unattended run the preview check is best-effort: the generator's re-import already proves the file parses.

## Freshness stamp

`runGenerator` writes `export const GENERATED_AT = "<ISO>"` into every `data.js`, taken from the write itself rather than the payload, so it cannot drift or be forgotten. `src/lib/freshness.js` reads it and the Shell banners any module not refreshed today. Nothing in a payload should carry this value.

## Reversibility

`runGenerator` backs each `data.js` up before overwriting, writes to a temp file, renames atomically, re-imports to prove the module parses and exports what it should, then runs reconciliation. On any failure it restores the backup and throws; the backup is deleted only on success. An unattended failure therefore leaves the previous day's data fully intact - never a half-write. Report the failure and stop; do not retry blindly or hand-patch `data.js`.
