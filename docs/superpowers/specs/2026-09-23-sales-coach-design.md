# Module 05 - Sales Coach

Design spec for bringing back the AI coaching module as a data-driven strategy
companion. Two layers: a pre-computed brief (instant) and a live input field
(3-8s streaming). Local only, read-only, no external writes.

## Identity

| Field   | Value |
|---------|-------|
| id      | `coach` |
| num     | `05` |
| label   | Coach |
| sub     | AI strategy |
| accent  | `cyan` |
| status  | live |
| dir     | `src/modules/coach/` |
| data    | `src/modules/coach/data.js` |
| gen     | `scripts/gen-coach.mjs` |
| server  | `src/server/coach.mjs` |

## Motivation

The old module 06 (Sales Coach) was removed 2026-08-03 along with the Fastify +
Agent SDK engine that powered it. That engine served three modules; this time it
serves one. The dashboard already holds the full data picture - prospect cards
with enrichment (module 01), funnel/pipeline/geo metrics (module 03), and the
Self-Served re-engage cohort (module 04). A coaching layer that reasons over all
three turns static numbers into actionable priorities.

## Layer 1 - Pre-computed brief

### Generation

`scripts/gen-coach.mjs` runs during the `briefing-daily` refresh task, after
module 01 ships. It reads the three data.js files (`briefing`, `performance`,
`selfserved`) at invocation time and sends them with a fixed system prompt to
Claude. The response is validated and written to `src/modules/coach/data.js`
through the same `refresh-core.mjs` pipeline as the other generators (backup,
atomic write, re-import, reconcile).

### Cadence

- **Full run (09:00)**: after module 01, before module 03.
- **Top-up run (11:00/13:00/15:00/17:00)**: after module 01, every time. Newly
  booked meetings should immediately update the strategic read.

If performance or selfserved data is stale (yesterday's), the generator still
runs. It notes the staleness in its reasoning but does not block - the brief's
primary value comes from today's calendar, which is always fresh.

### Data shape

```js
export const COACH = {
  generatedAt: "ISO",
  todayIso: "YYYY-MM-DD",
  priorities: [
    {
      rank: 1,
      type: "call" | "pipeline" | "hygiene",
      title: "Short imperative headline",
      detail: "2-3 sentence reasoning with specific numbers",
      linkedModule: "01" | "03" | "04",
      linkedEntity: "card:2026-09-23:0" | "stall:2" | "item:5",
      urgency: "high" | "medium" | "low",
    },
    // 5-8 items, hard cap at 8. Fewer is fine; padding is not.
  ],
  pipelinePulse: {
    summary: "One paragraph: SQLs this month, pending AE decisions, pacing vs 90-pt quota, EUR earned",
    risks: ["One-line risk statements, max 5"],
    opportunities: ["One-line opportunity statements, max 5"],
  },
  weekRead: "Short paragraph: how the current week compares to last week, call density, deal trajectory",
  dataGaps: [],
};
```

### PII rule

`coach/data.js` does NOT contain prospect names, emails, or phones. Priority
items reference cards by day and index (`card:2026-09-23:0` = first prospect on
today's calendar, i.e. `WEEK_PROSPECTS["2026-09-23"][0]`), stalls by index into
`PERFORMANCE.stalls[]`, and selfserved items by index into `SELFSERVED.items[]`.
The UI component joins against the source data.js at render time to display
names. This keeps the coaching data PII-free so it could theoretically be
committed (though it is gitignored like the others for consistency).

### System prompt (generator)

The system prompt encodes the commercial logic the coach reasons with:

- **Quota math**: 90 pts/month = 100% = EUR 1,933.33. 1 pt = EUR 21.48.
  Points credited in the month the deal is accepted, not created.
- **Seat-tier weighting**: enterprise (101+) and mm (51-100) deals get priority
  over micro (1-10) when urgency is equal.
- **RSVP as risk signal**: `needsAction` on today's invite = elevated no-show
  risk. Recommend voicemail/follow-up contingency.
- **Re-engagement patterns**: ATTEMPTED_TO_CONTACT status + booked demo = second
  chance. Flag explicitly - these convert at a lower rate but higher stakes.
- **Geo pipeline gaps**: if a geo that carried last quarter has zero SQLs this
  month, surface it.
- **Stall detection**: SQLs pending AE decision >24h are flagged in
  performance/data.js as `stalls[]`. The coach promotes any >48h stall to a
  priority item.
- **Self-Served upsell**: high-rank items from module 04 that have not been
  contacted are low-effort pipeline additions. Surface the top 2-3.

The prompt is deterministic in structure (always produces the `COACH` shape) but
generative in content (prose adapts to the day's data). It never invents facts -
every claim must trace to a field in one of the three data.js files.

The system prompt lives in `scripts/lib/coach-prompt.mjs` as a shared export so
the generator and the live server use the identical reasoning frame. Updating
commercial logic (e.g. a quota change) means editing one file.

### Reconciliation

`gen-coach.mjs` validates:

1. `priorities` is an array of 1-8 objects, each with all required keys.
2. Every `linkedModule` is one of `"01"`, `"03"`, `"04"`.
3. `pipelinePulse.summary` is non-empty.
4. `urgency` is one of the three allowed values.
5. No PII leak: the output must not contain any email address (regex check).

A failed reconciliation restores the backup and throws, same as every other
generator.

## Layer 2 - Live input

### Server

`src/server/coach.mjs` - a lightweight Express server (~80 LOC) on port 8787.

Single endpoint:

```
GET /api/coach/stream?q=<url-encoded question>
Content-Type: text/event-stream
```

On each request the server:

1. Reads the three `data.js` files from disk (dynamic import with cache-bust).
2. Builds a message array: system prompt (same commercial-logic prompt as the
   generator) + a user message containing the serialized data + the question.
3. Calls the Anthropic SDK with `stream: true`, model `claude-sonnet-4-6`.
4. Pipes `content_block_delta` events as SSE `data:` lines to the browser.
5. Sends a final `event: done` line.

No conversation memory. Each request is standalone with full data context. This
is deliberate: the data changes every 2 hours, so a cached conversation would
reason over stale facts.

### Auth and secrets

`ANTHROPIC_API_KEY` is read from `.env.local` (gitignored). The key never
reaches the browser - the server proxies the call. No other credentials are
needed.

### Dev integration

`package.json` scripts:

```json
{
  "dev": "concurrently \"vite\" \"node src/server/coach.mjs\"",
  "dev:ui": "vite"
}
```

`vite.config.js` adds a proxy rule:

```js
server: {
  proxy: {
    "/api/coach": "http://localhost:8787",
  },
}
```

`dev:ui` is the fallback for running the dashboard without the coach server
(e.g., when no API key is configured). The module detects a missing server and
hides the input field, showing only the pre-computed brief.

### Error handling

- Server not running: the module catches the fetch error and hides the input
  field. The pre-computed brief remains fully functional.
- API key missing: the server logs a warning at startup and returns 503 to
  requests. The module shows "Coach server not configured" in the input area.
- Streaming error mid-response: the module renders whatever tokens arrived plus
  an amber "interrupted" badge. No retry.
- Question too long: the server caps input at 2000 characters and returns 400.

## UI

### Layout

The module uses the same dark palette and component patterns as the rest of the
Constellation. Cyan accent (`C.cyan`, `C.cyanBg`, `C.cyanBorder`).

```
+----------------------------------------------------------+
|  05   COACH                                  AI STRATEGY  |
+----------------------------------------------------------+
|                                                            |
|  PRIORITIES                           Week of 21-25 Sep   |
|  ┌─────────────────────────────────────────────────────┐  |
|  │  1  [amber]  Title                        →01 card  │  |
|  │     Detail text, 2-3 sentences...                    │  |
|  ├─────────────────────────────────────────────────────┤  |
|  │  2  [amber]  Title                        →01 card  │  |
|  │     Detail text...                                   │  |
|  ├─────────────────────────────────────────────────────┤  |
|  │  3  [cyan]   Title                        →03       │  |
|  │     Detail text...                                   │  |
|  ├─────────────────────────────────────────────────────┤  |
|  │  ...                                                 │  |
|  └─────────────────────────────────────────────────────┘  |
|                                                            |
|  PIPELINE PULSE                                            |
|  ┌─────────────────────────────────────────────────────┐  |
|  │  Summary paragraph                                   │  |
|  │                                                       │  |
|  │  Risks                    Opportunities               │  |
|  │  - risk 1                 - opp 1                     │  |
|  │  - risk 2                 - opp 2                     │  |
|  └─────────────────────────────────────────────────────┘  |
|                                                            |
|  WEEK READ                                                 |
|  "Paragraph..."                                            |
|                                                            |
+----------------------------------------------------------+
|  ┌──────────────────────────────────────────┐   [Ask]    |
|  │  Ask about your pipeline, deals, calls   │            |
|  └──────────────────────────────────────────┘            |
|                                                            |
|  ┌─────────────────────────────────────────────────────┐  |
|  │  Streaming answer...                                  │  |
|  │  (appears on submit, stays until next question)       │  |
|  └─────────────────────────────────────────────────────┘  |
+----------------------------------------------------------+
```

### Priority items

- Rank number on the left, urgency dot color-coded (high = amber, medium = cyan,
  low = textMuted).
- Title in `textMid`, detail in `textHint`.
- Right-aligned pill showing the linked module + entity. Clickable - navigates
  to that module via `Shell`'s `setActiveId` and optionally scrolls to the
  entity.
- Hover: `surfaceAlt` background, `borderHover` border.

### Pipeline pulse

- Summary paragraph in `textMid`.
- Two-column layout for risks (left, red-tinted) and opportunities (right,
  emerald-tinted).

### Input field

- Full-width text input with `surface` background, `border` outline.
- Placeholder: "Ask about your pipeline, deals, calls..."
- Submit on Enter or click the Ask button.
- While streaming: the input is disabled, a subtle pulse animation on the
  answer pane border.
- The answer pane renders markdown (bold, lists, inline code) using a lightweight
  renderer. No external dependency - a simple regex-based pass is sufficient for
  the limited markdown the model produces.

### Graceful degradation

- No server: input field hidden, pre-computed brief shows normally.
- No `coach/data.js` (first run, generator hasn't run yet): module shows a
  single message "Run a refresh to generate the coaching brief" with a hint
  that the live input still works if the server is running.
- Stale `coach/data.js` (yesterday's): the STALE banner from `freshness.js`
  handles this. The brief is still shown but visually flagged.

## Files to create

| File | Purpose |
|------|---------|
| `src/modules/coach/index.jsx` | Module component |
| `src/modules/coach/data.js` | Pre-computed brief (generated, gitignored) |
| `scripts/gen-coach.mjs` | Generator (validates + writes data.js) |
| `scripts/lib/coach-prompt.mjs` | Shared system prompt (commercial logic) |
| `src/server/coach.mjs` | Express SSE server for live queries |

## Files to modify

| File | Change |
|------|--------|
| `src/lib/modules.js` | Add coach entry to `MODULES` |
| `src/Shell.jsx` | Import CoachModule, add to `COMPONENTS` |
| `src/lib/freshness.js` | Add coach to `SOURCES` |
| `package.json` | Add `concurrently` dep, update `dev` script |
| `vite.config.js` | Add `/api/coach` proxy |
| `.gitignore` | Add `src/modules/coach/data.js` |
| `REFRESH_SPEC.md` | Add module 05 section |

## Refresh integration

The `briefing-daily` skill and scheduled task need a one-line addition to their
module sequence:

- Full run: 01 -> **05** -> 03 -> 04
- Top-up run: 01 -> **05**

The generator invocation is:

```
node scripts/gen-coach.mjs <payload.json>
```

Where `payload.json` contains the three data.js exports plus a `_refresh`
metadata block, same pattern as the other generators.

## Out of scope

- Multi-turn conversation memory
- Writes to HubSpot or any external system
- Production/hosted deployment
- Mobile-specific layout (desktop-first, same as the rest of the app)
- Voice input
- Caching of live query responses
