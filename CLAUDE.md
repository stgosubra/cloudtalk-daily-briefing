# daily-briefing - project rules

## Canonical module map (single source of truth)

The live-data modules and their numbers. Generator headers and refresh skills must match this - do not renumber in one place only.

- 01 Briefing - `src/modules/briefing/` - generator `scripts/gen-briefing.mjs`
- 03 Performance - `src/modules/performance/` - generator `scripts/gen-performance.mjs`
- 04 Self-Served - `src/modules/selfserved/` - generator `scripts/gen-selfserved.mjs`
- 05 SDR Pacing - `src/modules/pacing/` - generator `scripts/gen-pacing.mjs`
- 06 Demos - `src/modules/demos/` - generator `scripts/gen-demos.mjs`

"Re-run module 03" = Performance. "Module 04" = Self-Served. When in doubt, this map wins.

## Refresh rules

- Live HubSpot pulls go through the `/hs` skill (`anthropic-skills:hs`), server-side GROUP BY + COUNT/SUM - never client-side row counting. Raw row counting undercounts at pagination edges and mis-buckets deal-creator vs deal-owner and createdate vs acceptance date.
- Never hand-write any module's `data.js`. Only the matching generator writes it (backup -> atomic write -> re-import -> reconcile -> restore on failure).
- `src/modules/**/data.js` is gitignored - it holds live customer PII. Keep PII in `data.js` only; never in memory, logs, summaries, or committed files.
