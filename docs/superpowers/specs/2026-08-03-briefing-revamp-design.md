# Daily Briefing Revamp - Structure, Self-Update, Single Skill

Date: 2026-08-03
Status: approved design, not yet implemented
Owner: Santiago Subra

## Goal

Cut the dashboard to the five modules actually used, make the three data modules
refresh themselves each weekday morning with no manual run, and collapse the
refresh knowledge into one skill.

Three phases. Phase 1 is a prerequisite for Phase 2: removing modules 06/07/08
eliminates the external AI engine, which is what makes an unattended refresh
simple. Phase 3 depends on Phase 1's final module set.

## Phase 1 - Restructure

### Findings

1. Modules 06 (Coach), 07 (Pre-Call SE), and 08 (Competitor) are the only
   consumers of an external engine. `vite.config.js:29-64` auto-spawns a Fastify
   plus Agent SDK server from `cloudtalk-precall-se/` on port 8787 as a child of
   `npm run dev`, and proxies `/brief`, `/competitor`, `/coach` to it
   (`vite.config.js:72-74`). Removing those three modules removes the plugin, all
   three proxy routes, the port dependency, and the cross-project coupling.
   `npm run dev` becomes a plain static Vite app.

2. `src/server/precall/` is 2,500 lines of dead TypeScript. Nothing in `src/`
   imports it - a leftover from when the engine lived in-repo. It is also the only
   consumer of `@anthropic-ai/claude-agent-sdk`, `@google/generative-ai`, and
   `groq-sdk`. Separately `dotenv` and `gsap` are unused anywhere.

3. The module registry is duplicated. `Shell.jsx:26-44` defines NAV;
   `dashboard/index.jsx:128-141` defines the same 19 rows again for the
   Constellation tiles. Two hand-maintained copies that can drift.

### Verdict on all 21 module directories

| Num | Module | LOC | Verdict | Reason |
|-----|--------|-----|---------|--------|
| 00 | dashboard | 417 | Keep, refactor | Constellation. Stop hardcoding its own registry copy |
| 01 | briefing | 4,767 | Keep | Daily schedule. Generator-gated data.js |
| 02 | calculator | 1,026 | Keep | Minutes/cost. Pure client-side |
| 03 | performance | 13,436 | Keep | SQL/SQO. Generator-gated data.js |
| 04 | selfserved | 879 | Keep | Untouched MQLs. Generator-gated data.js |
| 05 | roadmap | 16 | Delete | Placeholder shell |
| 06 | coach | 207 | Delete | Live but engine-dependent. Superseded by chat |
| 07 | precall | 1,644 | Demote to skill | Real feature; `pcb-cloudtalk` skill covers it without a server |
| 08 | competitor | 360 | Delete | Live but engine-dependent. Ad hoc, not a daily surface |
| 09 | pipeline | 21 | Delete | Placeholder shell |
| 10 | library | 20 | Delete | Placeholder shell |
| 11 | quotes | 21 | Delete | Placeholder shell |
| 12 | battlecards | 20 | Delete | Placeholder shell |
| 13 | email | 21 | Delete | Placeholder shell |
| 14 | demos | 21 | Delete | Placeholder shell |
| 15 | review | 22 | Delete | Placeholder shell |
| 16 | activity | 20 | Delete | Placeholder shell |
| 17 | wiki | 20 | Delete | Placeholder shell |
| 18 | stale | 20 | Delete | Placeholder shell. Real thing is the standalone tracker |
| - | forecast | 20 | Delete | Orphan: on disk, in no registry |
| - | _common | 53 | Delete | Only exists to render the 12 placeholders |

Also removed: `src/server/precall/` (2,500 LOC dead), `engineAutospawnPlugin` and
the three proxy routes in `vite.config.js`, `scripts/refresh-perf.mjs`, and five
npm dependencies (`@anthropic-ai/claude-agent-sdk`, `@google/generative-ai`,
`groq-sdk`, `dotenv`, `gsap`).

Net: 21 modules to 5. Roughly 5,000 LOC removed. The app loses its external
service dependency entirely.

### Numbering

Survivors are already contiguous at 00-04. No renumbering. The command palette's
number search (`Shell.jsx:336`) keeps working unchanged.

### Removal sequence

Each step must leave a green build. Steps 2 onward are destructive and require
explicit approval before running, on a clean branch.

1. Collapse the registry. Extract one `MODULES` array to `src/lib/modules.js`.
   Point both `Shell.jsx` and `dashboard/index.jsx` at it. Pure refactor, no
   deletions. Verify the app renders identically.
2. Delete the 13 placeholders (05, 09-18, forecast) plus `_common/`. Remove their
   imports and registry rows.
3. Delete Coach and Competitor (06, 08). Remove their `ACTIONS` entries
   (`Shell.jsx:320-322`), their proxy routes, and their imports.
4. Demote Pre-Call (07): remove the module UI, `engineAutospawnPlugin`, the last
   proxy route, and `src/server/precall/`. `cloudtalk-precall-se/` stays as an
   independent project; the `pcb-cloudtalk` skill remains the entrypoint.
5. Delete `scripts/refresh-perf.mjs` and its `refresh:perf` entry in
   `package.json`, then prune the five dependencies, reinstall, and confirm build
   and dev come up clean with no child process and nothing listening on 8787.

## Phase 2 - Self-updating refresh

### Why a scheduled Claude task, not a script

`gen-briefing.mjs:94-110` rejects any module 01 payload where a card has an empty
`companyBrief`, an empty `challengerInsight`, fewer than 5 `qualifierQuestions`,
or any question missing `key`, `label`, `hint`, or `why`. No REST pull produces
prose, so an LLM must be in the loop or the generator refuses the write.

That rules out the `refresh-perf.mjs` direct-API pattern as a general solution.
It could serve modules 03 and 04, which are pure aggregation, but that means two
refresh mechanisms and two credential models when one is required regardless.

Decision: one scheduled Claude task invoking one skill, refreshing 01, 03, and 04
in that order, each through its generator. `scripts/refresh-perf.mjs` is deleted -
it hardcodes the retired 80-point quota and EUR 24.17 per point, and writes
`data.js` directly, bypassing the generator gates.

### Failure behaviour (already implemented)

`scripts/lib/refresh-core.mjs` backs `data.js` up to `.bak`, writes to a temp
file, renames atomically, re-imports to verify the module parses and exports what
it should, and on any failure restores the backup and throws. The backup is
deleted only on success.

An unattended failure therefore leaves the previous day's data fully intact. No
half-writes, no corrupt dashboard. No new work needed here.

### Schedule and timing

`briefing-daily`, Mon-Fri 06:45, on the same runner as the two tasks already
operating (`stale-lead-tracker-daily` at 07:08, `xauusd-daily-wr-brief` at 09:18).

Timing is best-effort, not guaranteed. On 2026-08-03 both existing tasks reported
`lastRunAt` of 07:29:08, 200ms apart, against schedules 2h10m apart: they fire on
machine wake and catch up. So 06:45 means "06:45 if the lid is open, otherwise
first thing on wake." Guaranteed wall-clock firing would need an always-on
machine, which is not justified for a dashboard read at 09:00.

### Autonomy and gates

Module 01 gets full autonomy on the pull and the prose, with the generator's prose
gates as the backstop: thin output aborts the run rather than shipping a weak
brief. Modules 03 and 04 get full autonomy, with reconciliation gates enforcing
that every total equals the sum of its parts.

### Observability

No external notification. Two in-app signals: a `REFRESHED_AT` freshness
indicator, and a visible staleness warning in the Shell when a module's timestamp
is not today. Task reports stay counts-only - no names, emails, or note contents.

### Prerequisite probe

HubSpot over MCP unattended is proven by `stale-lead-tracker-daily`. Calendar,
Gmail, and Lusha are not. Before building, run a one-shot read-only probe task
that attempts all four connectors and reports reachability only.

- Gmail unreachable: acceptable. `gen-briefing.mjs` treats it as warn-only.
- Lusha unreachable: acceptable. Misses are already allowed when declared in
  `dataGaps`.
- Calendar unreachable: blocking. Module 01 produces nothing without it, and the
  design must be reconsidered.

### What stays manual

Nothing daily. Structural changes to `gen-*.mjs` or payload shapes still need a
human, and judgment calls surfaced in `dataGaps` remain the user's to act on.

## Phase 3 - One skill

### Current duplication

Five overlapping copies of the same knowledge:

- `~/.claude/skills/briefing-refresh` - 343 lines, no `config.local.json` (unlike
  its siblings)
- `~/.claude/skills/performance-refresh` - 76 lines, with config
- `~/.claude/skills/selfserved-refresh` - 71 lines, with config
- `REFRESH_SPEC.md` in the repo - 12KB restating much of the above
- `cloudtalk-daily-briefing:briefing-refresh` from the plugin cache - 240 lines
  and diverged from the local 343-line copy

The last is a live hazard: two different versions of `briefing-refresh` are both
loadable and resolution order decides which fires. `briefing-setup` (122 lines) is
a fourth plugin skill in the same family.

### Target

One skill, `briefing-daily`, as the scheduled-task entrypoint, with one
`config.local.json`. Knowledge gets exactly one owner each:

- `REFRESH_SPEC.md` (in repo) owns data contracts, metric definitions, funnel
  math. In-repo because it must version atomically with the generators.
- `briefing-daily/SKILL.md` owns run order, guardrails, PII rules, and a pointer
  to the spec. Compact. Does not restate metric definitions.
- `gen-*.mjs` owns enforcement.

This mirrors the proven `stale-lead-tracker-daily` shape: heavy logic in the
pipeline, skill is procedure plus guardrails, kept compact.

Then retire `briefing-refresh`, `performance-refresh`, and `selfserved-refresh`,
and neutralise the plugin duplicates so `briefing-refresh` resolves to nothing.

Contract: any structural change to `gen-*.mjs`, a payload shape, or a module's
data schema must update `REFRESH_SPEC.md` in the same commit. Skill and repo stay
a synchronised pair.

### Out of scope

`stale-lead-scanner-refresh` and `stale-lead-tracker-daily` belong to a different
project and are not touched. The `anthropic-skills:stale-lead-scanner-refresh`
shadow copy is the same class of problem, noted but deferred.

## Risks

| Risk | Mitigation |
|------|-----------|
| Calendar unreachable in an unattended task | Probe first. Blocking if it fails |
| Deletions remove something still wanted | Per-step approval, clean branch, sequenced so each step builds |
| Pre-Call capability lost with the UI | Demote rather than delete; `cloudtalk-precall-se/` and `pcb-cloudtalk` retained |
| Task fires late or not at all | Accepted. In-app staleness warning surfaces it |
| Task stalls on a tool permission prompt instead of failing | Tool approvals are stored per task once granted. The task must be run manually once to pre-approve every connector it touches before relying on it unattended |
| Skill and repo spec drift | Same-commit contract stated above |
| PII exposure | Counts-only reports. `data.js` stays gitignored and local. No hosting in scope |

## Explicitly out of scope

Hosting or deploying the dashboard to a URL. `data.js` carries live customer PII
and is gitignored deliberately. Automating the refresh does not require hosting,
and hosting introduces a PII decision that is not being made here.

No restyling or redesign. Structure and automation only.
