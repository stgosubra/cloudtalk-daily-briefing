# Daily Brief - Canonical Pull Spec

Reference for the refresh mechanism (Option A: agent-orchestrated). Claude, in-session, is the refresh runtime. The app stays static: no runtime fetch, no standing credentials. Each refresh re-pulls live data for the **present day**, transforms it to the module's `data.js` shape, writes the file, and verifies the preview.

This spec is the source of truth for the per-module generators and for the single refresh skill, `briefing-daily`. Any structural change to a `gen-*.mjs`, a payload shape, or a module's data schema must update this file in the same commit - the skill and the repo are a synchronised pair.

There is no token-based path. `scripts/refresh-perf.mjs` was deleted: it hardcoded a retired quota and wrote `data.js` directly, bypassing every gate below. No token is stored, no script runs unattended, Claude drives every pull through approved connectors.

## Identity and shared constants

- Owner: Santiago Subra
- `hubspot_owner_id` = 87191703
- HubSpot portal = 6195055
- Email: santiago.subra@cloudtalk.io
- Contact-record URL: `https://app.hubspot.com/contacts/6195055/record/0-1/{hsObjectId}`
- Deal-record URL: `https://app.hubspot.com/contacts/6195055/record/0-2/{dealId}`

## Refresh scope and cadence

Wraps **modules 01, 03 (Performance), 04 (Self-Served)** at the trigger. Present-day snapshot only.

| Module | id | Sources | Pull discipline |
|--------|-----|---------|-----------------|
| 01 Today / Schedule | `briefing` | Google Calendar + HubSpot + Gmail | calendar via browser, HubSpot per-contact lookup, Gmail via browser |
| 03 Performance | `performance` | HubSpot | `/hs` (server-side GROUP BY aggregation) |
| 04 Self-Served | `selfserved` | HubSpot | `/hs` + per-contact deal-association check |

The other two surviving modules pull nothing: 00 Dashboard derives its tiles from the registry, 02 Calculator is pure client-side computation. Pre-Call SE now lives outside this app (`cloudtalk-precall-se/`, entered via the `pcb-cloudtalk` skill); Coach and Competitor were removed.

## `/hs` discipline (modules 03 and 04)

- Call `tool_guidance` once before the first `query_crm_data` of a run.
- Aggregate **server-side** with `GROUP BY` + `COUNT(*)` / `SUM(...)`. Never pull rows and count client-side - that path undercounts (see CLAUDE.md memory).
- Supported: `DATE_TRUNC`, `COUNT(*)`, `SUM`, `GROUP BY`, `BETWEEN`, cross-object `OBJECT.property`.
- Not supported: `DISTINCT`, `CASE`, column aliases, `JOIN`, `HAVING`.

---

## Module 01 - Today / Schedule

File: `src/modules/briefing/data.js`. Component (`BriefingModule.jsx`) is never touched by a refresh.

### What gets regenerated each run

- Date constants: `TODAY_ISO`, `TODAY_LABEL`, `REFRESHED_AT`, `WEEK_DAYS` (Mon-Sat of the current week).
- `WEEK_PROSPECTS[TODAY_ISO]` = array of prospect cards for today.
- `WEEK_OTHER_EVENTS[TODAY_ISO]` = array of non-meeting calendar blocks for today.
- Historical week arrays (`LAST_WEEK_PROSPECTS`, `TWO_WEEKS_AGO_PROSPECTS`, prior-day arrays) are **not** refreshed - they are frozen history.

### Step 1 - Calendar (browser)

Use `Claude_in_Chrome` (`tabs_context_mcp` -> `navigate` to Google Calendar day view for `TODAY_ISO` -> `get_page_text`). `Control_Chrome` is unreliable in this environment (read/exec fail with "Chrome not running"); prefer Claude_in_Chrome.

Per event extract: attendee display name + email, `start`, `end` (HH:MM), Google Meet link, RSVP status, canceled flag. Classify each event:

- Has an external attendee / is a prospect call -> prospect card.
- Personal / internal block (gym, lunch, AFK, sport) -> other event.

### Step 2 - HubSpot enrichment (per attendee)

For each prospect attendee email, look up the contact (`search_crm_objects` on contacts by `email`). Single-record lookups are fine via raw MCP; the `/hs` aggregation rule applies only to counts. Pull:

`firstname`, `lastname`, `company` (+ company domain for `companyUrl`), `jobtitle`, `country`, `hs_lead_status` (-> `leadStatus`), `lead_source` (-> `leadSource`), associated deal count (-> `deals`), `seat_range` (-> `seats`), `phone`.

Ambiguity rule: if the calendar gives only a first name and HubSpot returns multiple matches, pick the best candidate, **flag the assumption** in `companyBrief`, and add a "confirm who is on the call" qualifier. Never silently guess.

### Step 3 - Gmail (browser)

Last email thread with the attendee -> `lastEmail` (subject + date + 1-line gist). If Gmail is not reachable this run, set `lastEmail: null` (the card render guards on null). Do not block the refresh on Gmail.

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

Other event: `{ emoji, name, start, end, color, note? }`.

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

- **SQL** = deals Santiago created: `deal_creator__sdr_only_` = 87191703, bucketed by deal `createdate`.
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
- **Geo matrix** `byCountry`: `{ [country]: [{ month, label, mql, sql, sqo, rejected }] }` for each funnel month. This is the live geo re-pull the full-refresh standing instruction requires every run. Drive it from three GROUP BY queries (country x DATE_TRUNC month) for SQL, SQO, Rejected, plus the MQL contact count by country.

### Query pattern (geo matrix example)

One aggregation per metric, grouped by country and month:

```
SELECT country, DATE_TRUNC('month', createdate) AS m, COUNT(*)
FROM deals
WHERE deal_creator__sdr_only_ = 87191703
  AND createdate BETWEEN <window_start> AND <window_end>
GROUP BY country, m
```

(Aliases are not supported - express the month bucket inline per the live tool's accepted syntax.) Repeat with `+ deal_accepted_by_ae = true` for SQO and the rejected filter for Rejected. MQL is a contact-level count by `country`.

---

## Module 04 - Self-Served

File: `src/modules/selfserved/data.js`. Single export `SELFSERVED` (+ `onboardingAlertCount`). Rolling 90-day window ending today.

### Cohort (all must hold)

- `hubspot_owner_id` = 87191703
- `hs_lead_status` != 'Qualified' (already-qualified leads are being worked / have a deal)
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
