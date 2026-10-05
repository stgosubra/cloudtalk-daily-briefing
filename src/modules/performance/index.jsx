import { useState } from "react";
import { PERFORMANCE } from "./data.js";
import { PORTAL_ID, POINTS_QUOTA_PER_MONTH } from "../../config.js";
import {
  Page, PageHeader, Card, SectionLabel, Stat, StatRow, StatusDot,
  Badge, DataList, DataRow, AreaChart, Empty,
} from "../../design/ui.jsx";
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
// Gauge - semicircular attainment dial
// ---------------------------------------------------------------------------
// Drawn with pathLength="1" so the fill fraction is the dash length directly -
// no arc-length trigonometry, and it stays correct if the radius ever changes.
function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}
function arcPath(cx, cy, r, startDeg, endDeg) {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg < startDeg ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function Gauge({ earned, target, pacePct, masked }) {
  const pct = target > 0 ? earned / target : 0;
  const fill = Math.min(Math.max(pct, 0), 1);
  // Colour tracks pace, not raw attainment: 40% of quota on day 4 is fine, the
  // same 40% on day 18 is not. `pacePct` carries that context.
  const level = pacePct == null ? "idle" : pacePct >= 100 ? "ok" : pacePct >= 80 ? "warn" : "risk";
  const tone = SEMANTIC[level];

  const W = 290, H = 162, cx = 145, cy = 145, r = 116;
  const track = arcPath(cx, cy, r, 180, 0);
  // Where the month *should* be by now - the tick you are racing.
  const expectedFrac = pacePct != null && pacePct > 0 ? Math.min(fill / (pacePct / 100), 1) : null;
  const tickDeg = expectedFrac == null ? null : 180 - expectedFrac * 180;
  const tickIn = tickDeg == null ? null : polar(cx, cy, r - 13, tickDeg);
  const tickOut = tickDeg == null ? null : polar(cx, cy, r + 13, tickDeg);

  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="gaugeFill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={tone.fill} stopOpacity="0.45" />
            <stop offset="100%" stopColor={tone.fill} stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* The empty track has to read against the card gradient, so it is a
            light overlay rather than a surface token - a dark-on-dark track
            disappears and leaves the fill floating with nothing to measure
            it against. */}
        <path d={track} fill="none" stroke="rgba(255,255,255,0.065)" strokeWidth="15" strokeLinecap="round" />
        <path d={track} pathLength="1" fill="none" stroke="url(#gaugeFill)"
              strokeWidth="15" strokeLinecap="round" strokeDasharray={`${fill.toFixed(4)} 1`} />
        {tickIn && (
          <line x1={tickIn[0]} y1={tickIn[1]} x2={tickOut[0]} y2={tickOut[1]}
                stroke={C.textHint} strokeWidth="1.5" strokeLinecap="round" />
        )}
      </svg>

      <div style={{ position: "absolute", top: 66, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ font: `600 42px/1 ${FONT_SANS}`, color: tone.fill, letterSpacing: TRACK.tightest, ...NUM }}>
          {Math.round(pct * 100)}%
        </div>
        <div style={{ font: `400 ${T.micro}px/1 ${FONT_MONO}`, color: C.textMuted, marginTop: 8, ...NUM }}>
          {earned} / {masked ? MASK : target} pts
        </div>
      </div>

      <div style={{ position: "absolute", bottom: -2, left: 2, font: `400 ${T.label}px/1 ${FONT_MONO}`, color: C.textFaint }}>0</div>
      <div style={{ position: "absolute", bottom: -2, right: 2, font: `400 ${T.label}px/1 ${FONT_MONO}`, color: C.textFaint }}>
        {masked ? MASK : target}
      </div>
    </div>
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
            <Gauge earned={earned} target={target} pacePct={pacePct} masked={masked} />
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
