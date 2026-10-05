# Module 04 Quality / Mix / Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three cards to module 04 (qualification quality trend, segment mix bars, monthly progression table) from PERFORMANCE data that is already pulled.

**Architecture:** Pure render additions to `src/modules/performance/index.jsx`. Three self-contained components (`QualityCard`, `SegmentMixCard`, `ProgressionCard`) slot between the existing funnel card and the points chart. A single `SINCE = "2026-02"` constant filters all three. No pull, generator, or spec changes.

**Tech Stack:** React 19 (static Vite SPA), house design system (`design/ui.jsx`, `lib/tokens.js`), inline style objects, NO Tailwind, no new dependencies.

**Spec:** `docs/2026-10-05-performance-04-quality-mix-design.md`

**Verification model:** This repo has no UI test suite; the house gate is `npx vite build` + rendered preview. Per the user's standing rule, **nothing is committed until the user has seen it rendered and approved** - so the commit is a single, final, approval-gated step, not per-task.

**Data contracts (from `PERFORMANCE`, already reconciled by gen-performance.mjs):**

```js
acceptanceByMonth: [{ month: "2026-02", label: "Feb", accepted: 47, rejected: 5, pending: 0 }]
acceptanceYtd:     { accepted, rejected, pending }
sqoToWonByMonth:   [{ month: "2026-02", label: "Feb", sqo: 47, won: 19 }]
sqoToWonYtd:       { sqo, won }
segmentMonthly:    [{ month, label, sql: { micro: {count,value}, smb: {...}, midmarket: {...} }, sqo: { same } }]
segmentSplit:      { sql: { micro/smb/midmarket: {count,value} }, sqo: { same } }
progression:       [{ month, label, mqlCount, sqlCount, sqlValue, sqoCount, sqoValue, rejectedCount }]
```

Month keys sort lexically, so the Feb filter is `row.month >= "2026-02"`.

---

### Task 1: Quality trend card

**Files:**
- Modify: `src/modules/performance/index.jsx` (components above `PerformanceModule`, JSX inside it)

- [ ] **Step 1: Add the SINCE constant and QualityCard component**

Insert after the `eur` helper (line ~21):

```jsx
// Charts below start at February - January is a 4-SQO ramp month whose tiny
// denominator distorts every rate. Render-time filter only; the data keeps Jan.
const SINCE = "2026-02";

// ---------------------------------------------------------------------------
// Qualification quality - acceptance rate and SQO->Won rate, monthly
// ---------------------------------------------------------------------------
// Two rates, one chart, because they are the same question: do my quals
// survive contact with an AE and then with the market. Acceptance buckets on
// decision month (accepted_deal__date_time_ / rejected_deal_timestamp), so
// history is effectively append-only; the current month still moves as
// pending deals get decided.
function QualityCard({ accByMonth, sqoWonByMonth, accYtd, sqoWonYtd }) {
  const acc = accByMonth.filter((m) => m.month >= SINCE);
  const won = sqoWonByMonth.filter((m) => m.month >= SINCE);
  const accSeries = acc.map((m) => {
    const decided = m.accepted + m.rejected;
    return { x: m.label, y: decided > 0 ? (m.accepted / decided) * 100 : 0 };
  });
  const wonLine = won.map((m) => ({ x: m.label, y: m.sqo > 0 ? (m.won / m.sqo) * 100 : 0 }));
  const accYtdDecided = accYtd.accepted + accYtd.rejected;
  const accYtdRate = accYtdDecided > 0 ? Math.round((accYtd.accepted / accYtdDecided) * 100) : null;
  const wonYtdRate = sqoWonYtd.sqo > 0 ? Math.round((sqoWonYtd.won / sqoWonYtd.sqo) * 100) : null;
  return (
    <Card title="Qualification quality · since Feb" right={<SectionLabel>monthly rates</SectionLabel>} style={{ marginTop: 18 }}>
      <AreaChart
        series={accSeries}
        reference={[{ points: wonLine, color: C.blue, dash: "4 5", opacity: 0.8 }]}
        color={SEMANTIC.ok.fill}
        height={170}
        yMax={100}
        xLabels={acc.map((m) => m.label)}
        format={(v) => `${Math.round(v)}%`}
      />
      <div style={{ font: `400 ${T.micro}px/1.6 ${FONT_SANS}`, color: C.textHint, marginTop: 10 }}>
        Solid line is AE acceptance ({accYtdRate == null ? "-" : `${accYtdRate}% YTD`}), dashed is
        SQO to Won ({wonYtdRate == null ? "-" : `${wonYtdRate}% YTD`}). Both bucket on decision
        month - the current month is still deciding, so its points will move.
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Mount it in the module JSX**

In `PerformanceModule`'s return, immediately after the funnel card's closing `)}` (line ~276) and before the "Points per month" `<Card>`:

```jsx
      <QualityCard
        accByMonth={p.acceptanceByMonth}
        sqoWonByMonth={p.sqoToWonByMonth}
        accYtd={p.acceptanceYtd}
        sqoWonYtd={p.sqoToWonYtd}
      />
```

- [ ] **Step 3: Build check**

Run from `/Users/ss_cloudtalk/Desktop/daily-briefing`: `npx vite build`
Expected: builds with no errors (chunk-size warning is pre-existing and fine).

---

### Task 2: Segment mix card

**Files:**
- Modify: `src/modules/performance/index.jsx`

- [ ] **Step 1: Add SEG constant, SegmentBars, SegmentMixCard below QualityCard**

```jsx
// ---------------------------------------------------------------------------
// Segment mix - SQO value by seat segment, monthly stacked bars
// ---------------------------------------------------------------------------
// Where the euros come from. Deliberately NOT masked by present mode: segment
// MRR is deal data, not comp-plan data.
const SEG = [
  { key: "micro", label: "Micro", color: C.cyan },
  { key: "smb", label: "SMB", color: C.blue },
  { key: "midmarket", label: "Mid-market", color: C.bloom },
];

function SegmentBars({ months }) {
  const totals = months.map((m) => SEG.reduce((a, s) => a + (m.sqo[s.key]?.value || 0), 0));
  const max = Math.max(...totals, 1);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150 }}>
        {months.map((m, i) => (
          <div
            key={m.month}
            title={SEG.map((s) => `${s.label} ${eur(m.sqo[s.key]?.value || 0)}`).join(" · ")}
            style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}
          >
            <div style={{
              display: "flex", flexDirection: "column-reverse",
              height: `${Math.max((totals[i] / max) * 100, totals[i] > 0 ? 2 : 0)}%`,
              borderRadius: 3, overflow: "hidden",
            }}>
              {SEG.map((s) => {
                const v = m.sqo[s.key]?.value || 0;
                if (v <= 0 || totals[i] <= 0) return null;
                return <div key={s.key} style={{ height: `${(v / totals[i]) * 100}%`, background: s.color, opacity: 0.72 }} />;
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 7 }}>
        {months.map((m) => (
          <div key={m.month} style={{ flex: 1, textAlign: "center", font: `400 ${T.micro}px/1 ${FONT_MONO}`, color: C.textHint }}>
            {m.label}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
        {SEG.map((s) => (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `400 ${T.micro}px/1 ${FONT_SANS}`, color: C.textMuted }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, opacity: 0.72 }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SegmentMixCard({ segmentMonthly, segmentSplit }) {
  const months = segmentMonthly.filter((m) => m.month >= SINCE);
  const sqoYtd = segmentSplit.sqo;
  const totCount = SEG.reduce((a, s) => a + (sqoYtd[s.key]?.count || 0), 0);
  const totValue = SEG.reduce((a, s) => a + (sqoYtd[s.key]?.value || 0), 0);
  const mmValuePct = totValue > 0 ? Math.round(((sqoYtd.midmarket?.value || 0) / totValue) * 100) : 0;
  const mmCountPct = totCount > 0 ? Math.round(((sqoYtd.midmarket?.count || 0) / totCount) * 100) : 0;
  return (
    <Card
      title="Segment mix · SQO value by month"
      right={<SectionLabel>MM is {mmValuePct}% of value on {mmCountPct}% of deals</SectionLabel>}
      style={{ marginTop: 18 }}
    >
      <SegmentBars months={months} />
    </Card>
  );
}
```

- [ ] **Step 2: Mount it after `<QualityCard ... />`**

```jsx
      <SegmentMixCard segmentMonthly={p.segmentMonthly} segmentSplit={p.segmentSplit} />
```

- [ ] **Step 3: Build check**

Run: `npx vite build` - expect clean.

---

### Task 3: Monthly progression table

**Files:**
- Modify: `src/modules/performance/index.jsx`

- [ ] **Step 1: Add ProgressionCard below SegmentMixCard**

```jsx
// ---------------------------------------------------------------------------
// Monthly progression - the MQL -> SQL -> SQO ladder in counts and euros
// ---------------------------------------------------------------------------
const PROG_COLS = "48px 1fr 1fr 1.3fr 1fr 1.3fr 0.8fr";

function ProgressionCard({ rows }) {
  const data = rows.filter((r) => r.month >= SINCE);
  const head = { font: `500 ${T.micro}px/1 ${FONT_MONO}`, color: C.textHint, textTransform: "uppercase", letterSpacing: 0.4 };
  const cell = { font: `400 ${T.body - 1}px/1 ${FONT_MONO}`, color: C.textMid, ...NUM };
  const right = { textAlign: "right" };
  return (
    <Card title="Monthly progression" right={<SectionLabel>since Feb</SectionLabel>} style={{ marginTop: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: PROG_COLS, gap: "10px 14px", alignItems: "baseline" }}>
        <span style={head}>Month</span>
        <span style={{ ...head, ...right }}>MQL</span>
        <span style={{ ...head, ...right }}>SQL</span>
        <span style={{ ...head, ...right }}>SQL MRR</span>
        <span style={{ ...head, ...right }}>SQO</span>
        <span style={{ ...head, ...right }}>SQO MRR</span>
        <span style={{ ...head, ...right }}>Rej.</span>
        {data.map((r) => (
          <Fragment key={r.month}>
            <span style={{ ...cell, color: C.textMuted }}>{r.label}</span>
            <span style={{ ...cell, ...right }}>{r.mqlCount.toLocaleString("en-US")}</span>
            <span style={{ ...cell, ...right }}>{r.sqlCount}</span>
            <span style={{ ...cell, ...right }}>{eur(r.sqlValue)}</span>
            <span style={{ ...cell, ...right }}>{r.sqoCount}</span>
            <span style={{ ...cell, ...right, color: C.text }}>{eur(r.sqoValue)}</span>
            <span style={{ ...cell, ...right, color: r.rejectedCount > 0 ? SEMANTIC.risk.fill : C.textHint }}>{r.rejectedCount}</span>
          </Fragment>
        ))}
      </div>
      <div style={{ font: `400 ${T.micro}px/1.6 ${FONT_SANS}`, color: C.textHint, marginTop: 12 }}>
        Values are MRR in home currency (EUR). SQO MRR is the slice of SQL MRR an AE accepted.
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Update the react import for Fragment**

Change line 1 of the file from:

```jsx
import { useState } from "react";
```

to:

```jsx
import { Fragment, useState } from "react";
```

- [ ] **Step 3: Mount it after `<SegmentMixCard ... />`**

```jsx
      <ProgressionCard rows={p.progression} />
```

The final new-block sequence inside the module return is:

```jsx
      {funnelStages && ( ...existing funnel card... )}

      <QualityCard ... />
      <SegmentMixCard ... />
      <ProgressionCard rows={p.progression} />

      <Card title="Points per month" ...>   {/* existing, untouched */}
```

- [ ] **Step 4: Build check**

Run: `npx vite build` - expect clean.

---

### Task 4: Preview verification (no commit yet)

- [ ] **Step 1: Reload the running preview** (serverId from `preview_start` name `may4-briefing`) and open module 04.
- [ ] **Step 2: Verify content against the data**: quality chart starts at Feb (no Jan label), two lines visible, YTD rates in the footnote are plausible (acceptance ~90s, won-rate lower); segment bars show 9 columns Feb-Oct with the legend; progression table rows match `progression[]` months >= Feb, euro columns formatted.
- [ ] **Step 3: Toggle Present mode** - the three new cards must NOT change (nothing in them is masked); existing masking still works.
- [ ] **Step 4: Fresh console check** - no new errors after a clean reload (ignore the known stale HMR buffer entries; confirm via clean build + correct render).
- [ ] **Step 5: Screenshot the module** and show the user.

### Task 5: Approval-gated commit

- [ ] **Step 1: Wait for explicit user approval of the rendered result.** Do not commit without it.
- [ ] **Step 2: Commit** (only `index.jsx` changed in this feature):

```bash
cd /Users/ss_cloudtalk/Desktop/daily-briefing
git add src/modules/performance/index.jsx
git commit -m "feat(04): quality trend, segment mix, monthly progression cards"
```

Note: the working tree also carries the earlier uncommitted 02/06/07 work - stage only the file above for this commit unless the user asks to bundle.
