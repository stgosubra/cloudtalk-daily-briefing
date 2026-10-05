import { useState } from "react";
import { PERFORMANCE } from "./data.js";
import { PORTAL_ID, POINTS_QUOTA_PER_MONTH } from "../../config.js";
import {
  Page, PageHeader, Card, SectionLabel, Stat, StatRow, StatusDot,
  Badge, DataList, DataRow, AreaChart, Empty,
} from "../../design/ui.jsx";
import { Gauge, FunnelFlow, CountUp, Sparkline } from "../../design/viz.jsx";
import { C, R, T, TRACK, NUM, SEMANTIC, FONT_SANS, FONT_MONO } from "../../lib/tokens.js";

// Module 04 - Performance. One question: am I going to hit quota this month,
// and what is standing between me and that. Everything here answers it or
// earns its place by flagging something that threatens it.
//
// Present mode masks the contractual figures (commission, point value, quota)
// so the module can be screen-shared in a team setting without putting the
// comp plan on a projector. It defaults ON - the safe state is the one you
// land on, not the one you have to remember to switch to.
const MASK = "•••";

const eur = (n) => "€" + Math.round(n).toLocaleString("en-US");

// ---------------------------------------------------------------------------
// Attainment dial
// ---------------------------------------------------------------------------
// Thin wrapper over the shared Gauge: this module's only job is deciding what
// the dial means. Colour tracks pace, not raw attainment - 40% of quota on day
// 4 is fine, the same 40% on day 18 is not - so `pacePct` carries that context
// and `markerPct` plants the tick you are racing.
function AttainmentDial({ earned, target, pacePct, expected, masked }) {
  const pct = target > 0 ? (earned / target) * 100 : 0;
  const level = pacePct == null ? "idle" : pacePct >= 100 ? "ok" : pacePct >= 80 ? "warn" : "risk";
  return (
    <Gauge
      pct={pct}
      level={level}
      size={212}
      thickness={15}
      markerPct={target > 0 ? (expected / target) * 100 : null}
    >
      <div style={{ font: `600 ${T.heroLg}px/1 ${FONT_SANS}`, color: SEMANTIC[level].fill, letterSpacing: TRACK.tightest, ...NUM }}>
        <CountUp value={pct} duration={1100} format={(v) => `${Math.round(v)}%`} />
      </div>
      <div style={{ font: `400 ${T.micro}px/1 ${FONT_MONO}`, color: C.textMuted, marginTop: 8, ...NUM }}>
        {earned} / {masked ? MASK : target} pts
      </div>
    </Gauge>
  );
}

// ---------------------------------------------------------------------------
// Present-mode toggle
// ---------------------------------------------------------------------------
function PresentToggle({ on, set }) {
  return (
    <button
      onClick={() => set(!on)}
      title={on ? "Commission and quota hidden - safe to screen-share" : "Commission and quota visible"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
        padding: "6px 11px", borderRadius: R.sm, cursor: "pointer",
        font: `500 ${T.micro}px/1 ${FONT_SANS}`,
        background: on ? C.amberBg : "transparent",
        border: `1px solid ${on ? C.amberBorder : C.border}`,
        color: on ? C.amber : C.textMuted,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {on ? (
          <>
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </>
        ) : (
          <>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
      Present mode
    </button>
  );
}

// ---------------------------------------------------------------------------
// Workday maths
// ---------------------------------------------------------------------------
const hoursSince = (iso, nowMs) => (nowMs - new Date(iso).getTime()) / 36e5;

// Workdays (Mon-Fri) elapsed and total for the month containing `todayIso`.
// Run-rate on calendar days flatters a Monday and punishes a Friday, so pace is
// always computed on workdays. UTC-anchored to dodge DST.
function deriveWorkdays(todayIso) {
  if (!todayIso) return null;
  const today = new Date(todayIso + "T00:00:00Z");
  if (isNaN(today)) return null;
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const dom = today.getUTCDate();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  let elapsed = 0, total = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(Date.UTC(y, m, d)).getUTCDay();
    if (dow < 1 || dow > 5) continue;
    total += 1;
    if (d <= dom) elapsed += 1;
  }
  return { elapsed, total };
}

// ---------------------------------------------------------------------------
// Stall row
// ---------------------------------------------------------------------------
const STALL_COLS = "16px minmax(150px, 1.4fr) 112px 1fr 150px 62px 64px";

function StallRow({ s, hsBase, now, last }) {
  const days = Math.floor(s.ageH / 24);
  // 96h is where a pending demo stops being slow and starts being forgotten -
  // that is the one to chase today, not the one to keep monitoring.
  const urgent = s.ageH >= 96;
  const demoD = s.demoDate ? new Date(s.demoDate) : null;
  const reschedD = s.rescheduledDate ? new Date(s.rescheduledDate) : null;
  const demoPast = demoD && demoD < now;
  const fmtDate = (d) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null);
  const fmtTime = (d) => (d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null);

  let status, statusLevel;
  if (s.noShow) {
    status = "no-show"; statusLevel = "risk";
  } else if (reschedD) {
    status = `reschedule ${fmtDate(reschedD)}`; statusLevel = "warn";
  } else if (!demoD) {
    // A pending SQL with no demo on the calendar at all is the worst of the
    // set - nothing is going to move it without a booking, so it reads as risk
    // rather than as a quiet "upcoming".
    status = "no demo booked"; statusLevel = "risk";
  } else if (!demoPast) {
    status = `demo ${fmtDate(demoD)} ${fmtTime(demoD)}`; statusLevel = "idle";
  } else {
    status = "demo done - pending"; statusLevel = "warn";
  }

  return (
    <DataRow
      last={last}
      onClick={() => window.open(hsBase + s.id, "_blank", "noreferrer")}
      style={{ display: "grid", gridTemplateColumns: STALL_COLS, gap: 12, alignItems: "center" }}
    >
      <StatusDot level={urgent ? "risk" : "warn"} />
      <span style={{
        font: `500 ${T.body}px/1.3 ${FONT_SANS}`, color: C.text,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {s.name}
      </span>
      <span style={{ font: `400 ${T.micro}px/1 ${FONT_MONO}`, color: demoPast ? C.textFaint : C.textMid, ...NUM }}>
        {demoD ? `${fmtDate(demoD)} ${fmtTime(demoD)}` : "-"}
      </span>
      <span style={{
        font: `400 ${T.micro}px/1 ${FONT_SANS}`, color: C.textMuted,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {s.owner}
      </span>
      <Badge level={statusLevel} mono>{status}</Badge>
      <span style={{ font: `400 ${T.micro}px/1 ${FONT_MONO}`, color: C.textMid, textAlign: "right", ...NUM }}>
        {s.points} pts
      </span>
      <span style={{
        font: `400 ${T.micro}px/1 ${FONT_MONO}`, textAlign: "right", ...NUM,
        color: urgent ? C.red : C.amber,
      }}>
        {days}d old
      </span>
    </DataRow>
  );
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------
export default function PerformanceModule() {
  const [present, setPresent] = useState(true);
  const p = PERFORMANCE;
  const masked = present;

  const {
    target, earned, pointValue, fullCommission,
    dayOfMonth, daysInMonth, today, workdaysElapsed, workdaysTotal,
  } = p.pacing;

  const now = Date.now();
  const commission = target > 0 ? (earned / target) * fullCommission : 0;

  const derived = deriveWorkdays(today);
  const wkElapsed = Math.max(workdaysElapsed ?? derived?.elapsed ?? dayOfMonth, 1);
  const wkTotal = workdaysTotal ?? derived?.total ?? daysInMonth;
  const perDay = earned / wkElapsed;
  const requiredPace = wkTotal > 0 ? target / wkTotal : 0;
  const projected = Math.round(perDay * wkTotal);
  const projectedComm = target > 0 ? (projected / target) * fullCommission : 0;
  const remaining = target - earned;
  const daysLeft = Math.max(wkTotal - wkElapsed, 0);
  const ahead = remaining <= 0;
  // Pace = earned vs what the month should have delivered by today. This is the
  // number that decides the gauge colour and the headline verdict.
  const expected = requiredPace * wkElapsed;
  const pacePct = expected > 0 ? (earned / expected) * 100 : null;
  const paceLevel = pacePct == null ? "idle" : pacePct >= 100 ? "ok" : pacePct >= 80 ? "warn" : "risk";

  const acc = p.acceptance;
  const accTotal = acc.accepted.count + acc.rejected.count + acc.pending.count;
  const accPts = acc.accepted.points + acc.rejected.points + acc.pending.points;
  const decided = acc.accepted.count + acc.rejected.count;
  const accRate = decided > 0 ? (acc.accepted.count / decided) * 100 : null;

  const stalls = p.stalls
    .map((s) => ({ ...s, ageH: hoursSince(s.createdate, now) }))
    .sort((a, b) => b.ageH - a.ageH)
    .filter((s) => s.ageH >= 24);
  const stalledPts = stalls.reduce((a, s) => a + s.points, 0);

  // Year-to-date funnel. Taken from the reconciled rollups rather than re-summed
  // from the per-seat blocks - two routes to the same number is two numbers.
  const fn = p.mqlToSql, sw = p.sqoToWonYtd;
  const funnelStages = fn && sw ? [
    { label: "MQL", value: fn.mqlContacts },
    { label: "SQL", value: fn.sqlContacts },
    { label: "SQO", value: sw.sqo },
    { label: "Won", value: sw.won },
  ] : null;
  // Monthly MQL volume behind the top of that funnel - the trend the ratios sit on.
  const mqlTrend = Object.entries(p.funnel?.mql || {})
    .filter(([k]) => k !== "ytd")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  const ytd = p.points.reduce((a, m) => a + m.points, 0);
  const series = p.points.map((m) => ({ x: m.label, y: m.points }));
  const targetLine = p.points.map((m) => ({ x: m.label, y: target }));

  return (
    <Page>
      <PageHeader
        num="04"
        title="Performance"
        sub={`${p.owner} · live from HubSpot · ${p.refreshedAt.split(" - ")[0]}`}
        right={<PresentToggle on={present} set={setPresent} />}
      />

      <StatRow cols={4}>
        <Stat
          label={`Points · ${p.monthLabel}`}
          value={earned}
          of={masked ? null : `of ${target}`}
          note={ahead ? `${Math.abs(remaining)} over target` : `${remaining} to go · ${daysLeft} workdays left`}
          noteLevel={paceLevel}
          size="sm"
        />
        <Stat
          label="Commission earned"
          value={masked ? MASK : eur(commission)}
          note={masked ? "hidden in present mode" : `${earned} pts × ${eur(pointValue)}`}
          size="sm"
        />
        <Stat
          label="Pts / workday"
          value={perDay.toFixed(1)}
          note={`need ${requiredPace.toFixed(1)}`}
          noteLevel={perDay >= requiredPace ? "ok" : "warn"}
          size="sm"
        />
        <Stat
          label="Projected month-end"
          value={projected}
          note={masked ? "at current pace" : `${eur(projectedComm)} at current pace`}
          noteLevel={projected >= target ? "ok" : "warn"}
          size="sm"
        />
      </StatRow>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(330px, 0.85fr) 1fr", gap: 18, marginTop: 22 }}>
        <Card title="Month attainment" right={<SectionLabel>vs pace</SectionLabel>}>
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 6 }}>
            <AttainmentDial earned={earned} target={target} pacePct={pacePct} expected={expected} masked={masked} />
          </div>
          <div style={{
            marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.divider}`,
            display: "flex", alignItems: "center", gap: 9,
          }}>
            <StatusDot level={paceLevel} />
            <span style={{ font: `400 ${T.body - 1}px/1.5 ${FONT_SANS}`, color: C.textMid }}>
              {pacePct == null
                ? "No target set for this month."
                : pacePct >= 100
                  ? `Running ${Math.round(pacePct - 100)}% ahead of where the month should be by now.`
                  : `Sitting at ${Math.round(pacePct)}% of the ${Math.round(expected)} pts this month should have delivered by today.`}
            </span>
          </div>
          <div style={{ font: `400 ${T.micro}px/1.6 ${FONT_SANS}`, color: C.textHint, marginTop: 8, paddingLeft: 15 }}>
            The tick on the dial marks pace. Fill past it means ahead.
          </div>
        </Card>

        <Card
          title={`SQL acceptance · ${acc.month}`}
          right={<SectionLabel>{accTotal} deals · {accPts} pts</SectionLabel>}
        >
          <StatRow cols={3}>
            <Stat label="Accepted" value={acc.accepted.count} note={`${acc.accepted.points} pts`} noteLevel="ok" size="sm" />
            <Stat label="Pending" value={acc.pending.count} note={`${acc.pending.points} pts riding`} noteLevel={acc.pending.count ? "warn" : "idle"} size="sm" />
            <Stat label="Rejected" value={acc.rejected.count} note={`${acc.rejected.points} pts lost`} noteLevel={acc.rejected.count ? "risk" : "idle"} size="sm" />
          </StatRow>
          <div style={{ marginTop: 18 }}>
            <SectionLabel>Acceptance rate</SectionLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
              <span style={{ font: `600 ${T.title}px/1 ${FONT_SANS}`, color: C.text, letterSpacing: TRACK.tight, ...NUM }}>
                {accRate == null ? "-" : `${Math.round(accRate)}%`}
              </span>
              <span style={{ font: `400 ${T.micro}px/1 ${FONT_SANS}`, color: C.textHint }}>
                {decided === 0
                  ? "nothing decided yet this month"
                  : `${acc.accepted.count} of ${decided} decided · ${acc.pending.count} still open`}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {funnelStages && (
        <Card
          title="Pipeline funnel · year to date"
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SectionLabel>MQL / month</SectionLabel>
              <Sparkline points={mqlTrend} color={C.bloom} width={88} height={22} delay={200} />
            </div>
          }
          style={{ marginTop: 18 }}
        >
          <FunnelFlow stages={funnelStages} height={170} format={(v) => Math.round(v).toLocaleString("en-US")} />
          <div style={{ font: `400 ${T.micro}px/1.6 ${FONT_SANS}`, color: C.textHint, marginTop: 12 }}>
            Band height is volume, so the taper is the loss. {fn.ratePct}% of MQLs reach SQL;{" "}
            {Math.round((sw.won / fn.mqlContacts) * 100)}% of them end up won.
          </div>
        </Card>
      )}

      <Card
        title="Stall alerts"
        label="pending SQLs older than 24h"
        right={
          <SectionLabel style={{ color: stalls.length ? C.amber : C.emerald }}>
            {stalls.length} stalled · {stalledPts} pts at risk
          </SectionLabel>
        }
        style={{ marginTop: 18 }}
      >
        {stalls.length === 0 ? (
          <Empty level="ok">Nothing stalled - every pending demo is fresh.</Empty>
        ) : (
          <DataList>
            {stalls.map((s, i) => (
              <StallRow key={s.id} s={s} hsBase={p.hsBase} now={now} last={i === stalls.length - 1} />
            ))}
          </DataList>
        )}
      </Card>

      <Card title="Points per month" right={<SectionLabel>{ytd} pts YTD</SectionLabel>} style={{ marginTop: 18 }}>
        <AreaChart
          series={series}
          reference={target > 0 ? [{ points: targetLine, color: C.amber, dash: "4 5", opacity: 0.55 }] : []}
          color={C.blue}
          height={186}
          yMax={Math.max(target, ...p.points.map((m) => m.points), 1) * 1.15}
          xLabels={p.points.map((m) => m.label)}
          format={(v) => `${v} pts`}
        />
        <div style={{ font: `400 ${T.micro}px/1 ${FONT_SANS}`, color: C.textHint, marginTop: 10 }}>
          Dashed line is the {masked ? "monthly" : `${target}-point`} target. Hover a month for the exact figure.
        </div>
      </Card>

      <div style={{
        font: `400 ${T.micro}px/1.7 ${FONT_MONO}`, color: C.textFaint,
        marginTop: 26, paddingTop: 14, borderTop: `1px solid ${C.divider}`,
      }}>
        SQL = deals where deal_creator = {p.owner} (ownerId {p.ownerId}), by create date. SQO = deal_accepted_by_ae = Yes.<br />
        Points = deal_sdr_points_number. {POINTS_QUOTA_PER_MONTH} pts/month = 100% = {masked ? MASK : eur(fullCommission)}. Source: HubSpot {PORTAL_ID}.
      </div>
    </Page>
  );
}
