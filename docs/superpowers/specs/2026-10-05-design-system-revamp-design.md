# Daily Briefing - design system revamp

Date: 2026-10-05
Status: implemented

## Why

The app had grown seven modules with seven private visual vocabularies. Module 02
(Today) was violet glass on a warm canvas; modules 04 and 05 were flat dark cards;
module 07 (then "Demos") was a table. Three parallel colour sources existed -
`src/lib/palette.js`, `src/design/tokens.js` and a scatter of hard-coded hex
literals - and none of them agreed. A number that meant "you are behind" rendered
amber in one module, red in another, and decorative violet in a third.

The second problem was semantic. Colour was applied for decoration rather than
meaning, so a count of zero alerts could render in alarm red purely because the
card it sat in was styled that way. The reader learned to ignore colour, which is
the one thing the colour was there to prevent.

## What changed

### One token layer, one primitive layer

`src/lib/tokens.js` is now the only place a colour, radius, shadow, font or type
size is defined. `src/design/ui.jsx` holds every shared primitive - `Card`,
`Stat`, `StatRow`, `DataList`, `DataRow`, `TabBar`, `Badge`, `StatusDot`,
`ProgressBar`, `AreaChart`, `Bars`, `PageHeader`, `Page`, `Empty`, `Glyph`,
`SectionLabel`. Modules compose these; they do not define their own chrome.

Deleted: `src/lib/palette.js`, `src/design/tokens.js`, the five
`src/design/primitives/*` glass/neon components, and `DesignProbe.jsx`. None had
a consumer left once the modules were migrated.

No Tailwind. The project uses inline style objects and that has not changed - the
tokens are plain exported constants, not a class system.

### Colour is earned, not decorative

The doctrine encoded in `tokens.js`:

- Semantic state (`risk` / `warn` / `ok` / `idle`) is separate from module accent.
  Accent identifies which module you are in; semantic tone says what the number
  means. They never share a swatch.
- `risk` red is reserved for a deadline that has **already** passed. Not "soon",
  not "large" - passed.
- A count only takes a semantic tone once it actually means something. Zero alerts
  reads neutral.
- No pulsing, flashing or animation on any alert. Urgency comes from position in
  the page, not from motion. A dashboard that blinks gets muted.

### Palette

Neutral near-black canvas (`#0A0A0C`) with a single faint indigo ambient gradient
at the top of the viewport. One ambience, not seven. Cards are a low-contrast
gradient over that canvas rather than a flat fill, which gives depth without the
frosted-glass blur the old module 02 used.

Craft borrowed from the reference dashboard: gradient active pill on nav and
toggles, segmented controls, hero stat plus period selector, gradient area fills
under line charts, floating crosshair tooltips, logo-square list rows. The
magenta/glass *palette* from that reference was deliberately not adopted.

### Renumbering

Module 05 (Coach) was removed, leaving a gap. Rather than leave a hole or shuffle
once, the whole registry was renumbered to start at 01:

```
01 Dashboard   02 Today   03 Calculator   04 Performance
05 Self-Served   06 SDR Pacing   07 Deals
```

`src/lib/modules.js` is the single source of truth for id, number, label, accent
and status. `freshness.js`, the Shell, the dashboard tiles, `REFRESH_SPEC.md` and
the `briefing-daily` skill all read from or mirror it.

Removed with Coach: `scripts/gen-coach.mjs`, `scripts/lib/coach-prompt.mjs`,
`src/server/coach.mjs`, `src/modules/coach/`. The module needed an LLM in the
refresh loop to produce a prose brief that the operator already had in their head.

### Module 01 Dashboard earns the landing slot

Previously a tile grid - a menu, not a view. Now it opens with a four-stat band
and a **rule-based** three-item action ladder ("Needs you") that aggregates the
genuinely actionable alerts across every module, each deep-linking into the module
that raised it. A secondary "Also running" row carries the rest. Tiles sit below.

Rule-based, not LLM. The rules are auditable, deterministic and run with no API
call. The Coach module already proved that a generated brief is harder to trust
than a sorted list of facts.

### Module 07 Deals (was Demos)

Renamed because the object is a deal, not a demo. Rebuilt as a kanban by outcome
with four columns: **Upcoming** (demo booked, still future) -> **Awaiting
decision** -> **Accepted** -> **Rejected**. A second tab, **By AE**, gives
per-AE acceptance rate, open count and median time-to-ruling.

Two deliberate decisions:

- **Cohort is every deal created in the current calendar month** where Santiago is
  `deal_creator__sdr_only_`. No demo filter, no acceptance-grace exclusion. The
  old cohort was narrow enough that the module could not total the month, which
  was the thing it was for.
- **The aging clock starts at the demo date**, not at creation, with a 48h AE SLA.
  The SLA is on the AE, so the clock cannot start before the AE has anything to
  rule on. Deals with no demo booked fall back to aging from creation, and that
  fallback is declared in `dataGaps` rather than hidden.

Breach is derived at render time (`outcome === "pending" && ageH > slaHours`),
never stored in the payload. Config lives in `src/deals.config.js`.

### Module 06 SDR Pacing - three altitudes

Three tabs that deliberately sit at different levels of detail:

- **Team forecast** - projected month-end run rate for SQL created and SQO
  accepted, against target, with the office split. No individual is named. The
  team number answers whether the month lands; who is behind is a conversation
  with that person, not a leaderboard.
- **Barcelona** / **Toronto** - per-SDR rows with daily-rate targets, progress
  against expected-to-date, and pace percentage.

Each target is that SDR's own daily rate multiplied by their own working days this
month, so time off and reduced quotas are already in the number.

### Module 02 Today

Fully migrated onto the shared system; the violet/glass identity is gone. The
day-stat band was rewritten onto `Stat` / `StatRow` so a zero reads neutral.
`LinkBtn` and `AnimatedNumber` were deleted - both were dead once the band was
rebuilt.

## Data contracts unchanged

Nothing in this revamp touched the generator pipeline's guarantees. Generators
still own every `data.js`, still back up, write atomically, re-import to prove the
file parses, reconcile, and restore on failure. `data.js` files remain gitignored
(live customer PII). `gen-demos.mjs` became `gen-deals.mjs` with the module 07
payload shape documented in `REFRESH_SPEC.md`, verified field-by-field against a
real payload rather than written from memory.

Added to `.gitignore`: `.tmp-*.json`. Every refresh stages a payload there and
those payloads are the raw pull - deal names, prospect names, emails. They survive
the run on disk, so the glob is safer than relying on cleanup.

Seeds regenerated for all five generated modules via `scripts/make-seeds.mjs`
(structural skeletonisation - every leaf becomes a type-appropriate zero, arrays
empty, only key names survive). Verified: zero email or phone matches across all
five seed files.

## Follow-ups

- The `funnel` block in `performance/data.js` is now largely unrendered since
  `FunnelView` / `SegmentsView` / `GeoView` were removed. `gen-performance.mjs`
  still requires it. Left in place to avoid breaking the refresh contract; worth
  deciding whether to surface it again or drop it from the payload.
- `decidedAt` and `country` are carried in the module 07 payload but not yet
  rendered. Keep populating them - both are cheap at pull time and expensive to
  backfill.
- `framer-motion` is still imported by `BriefingModule.jsx` alone. Removing that
  last dependency would drop the bundle meaningfully.
