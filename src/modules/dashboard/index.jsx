// Dashboard - module 01.
//
// The landing slot has to earn itself. A grid of pretty tiles is a menu, and a
// menu does not tell you what to do, so the top of this page is an action ladder:
// every module contributes alerts through a rule, the rules are scored by
// severity, and the three loudest win the top of the page. The rest stay visible
// but quiet underneath.
//
// The rules are deliberately NOT an LLM call. They are plain arithmetic over the
// data.js files already on disk - the dashboard must render identically on every
// refresh with no network, no key and no latency, and a rule that can be read in
// ten lines can also be argued with.
//
// Every alert carries the module it belongs to, so acting on it is one click.

import { useMemo } from "react";
import { TODAY_ISO, WEEK_PROSPECTS, WEEK_OTHER_EVENTS } from "../briefing/data.js";
import { PERFORMANCE } from "../performance/data.js";
import { SELFSERVED, onboardingAlertCount } from "../selfserved/data.js";
import { PACING } from "../pacing/data.js";
import { DEALS } from "../deals/data.js";
import { TILE_MODULES } from "../../lib/modules.js";
import { OWNER } from "../../config.js";
import {
  Page, SectionLabel, Stat, StatRow, StatusDot, DataList, DataRow, Empty,
} from "../../design/ui.jsx";
import { Gauge, CountUp, Sparkline } from "../../design/viz.jsx";
import { C, R, T, TRACK, NUM, SEMANTIC, LEVEL_ORDER, FONT_SANS, FONT_MONO } from "../../lib/tokens.js";
import { ModuleIcon } from "../../design/icons.jsx";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const eur = (n) => `€${Math.round(n ?? 0).toLocaleString("en-GB")}`;
const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// rules
// ---------------------------------------------------------------------------
// One function per module. Each returns zero or more alerts, or null. An alert
// is { id, level, title, detail, module }. Rules never invent a number - if the
// underlying field is missing they return nothing, because a dashboard that
// guesses is worse than a dashboard that is quiet.

function dealAlerts() {
  const out = [];
  const sla = DEALS?.slaHours;
  const deals = DEALS?.deals ?? [];
  if (!sla) return out;

  const breaching = deals.filter((d) => d.outcome === "pending" && d.ageH > sla);
  if (breaching.length) {
    out.push({
      id: "deals-breach",
      level: "risk",
      title: `${plural(breaching.length, "deal")} past the ${sla}h AE SLA`,
      detail: `${eur(sum(breaching, (d) => d.amt))} MRR sitting undecided. Chase the AE.`,
      module: "deals",
    });
  }

  // A demo inside the next 24h is the only "upcoming" that is actionable today.
  const now = Date.now();
  const soon = deals.filter((d) => {
    if (d.outcome !== "upcoming" || !d.demoAt) return false;
    const h = (new Date(d.demoAt) - now) / 3600000;
    return h >= 0 && h <= 24;
  });
  if (soon.length) {
    out.push({
      id: "deals-demo-soon",
      level: "warn",
      title: `${plural(soon.length, "demo")} in the next 24h`,
      detail: `${eur(sum(soon, (d) => d.amt))} MRR riding on ${soon.length === 1 ? "it" : "them"}.`,
      module: "deals",
    });
  }
  return out;
}

function briefingAlerts() {
  const calls = WEEK_PROSPECTS?.[TODAY_ISO]?.length ?? 0;
  const other = WEEK_OTHER_EVENTS?.[TODAY_ISO]?.length ?? 0;
  if (!calls && !other) return [];
  const parts = [];
  if (calls) parts.push(plural(calls, "discovery call"));
  if (other) parts.push(plural(other, "other block"));
  return [{
    id: "briefing-today",
    level: calls ? "warn" : "idle",
    title: calls ? `${plural(calls, "discovery call")} today` : "Calendar is booked today",
    detail: `${parts.join(" and ")} on the calendar. Briefs are written.`,
    module: "briefing",
  }];
}

// Points pace. The quota is a month-long line; being behind on day 4 of 31 is
// noise, so this only fires once enough of the month has elapsed for the gap to
// mean something.
function pacePctAlerts() {
  const p = PERFORMANCE?.pacing;
  if (!p?.target || !p?.daysInMonth) return [];
  const elapsed = p.dayOfMonth / p.daysInMonth;
  if (elapsed < 0.2) return [];
  const expected = p.target * elapsed;
  if (!expected) return [];
  const ratio = (p.earned ?? 0) / expected;
  if (ratio >= 0.85) return [];
  const short = Math.ceil(expected - (p.earned ?? 0));
  return [{
    id: "perf-pace",
    level: ratio < 0.6 ? "risk" : "warn",
    title: `${short} point${short === 1 ? "" : "s"} behind quota pace`,
    detail: `${p.earned} of ${p.target} earned on day ${p.dayOfMonth} of ${p.daysInMonth}.`,
    module: "performance",
  }];
}

// Deals still pending from before this month. The Deals board only covers the
// current month by design, so without this rule an August deal could sit
// undecided forever with nothing on screen saying so.
function olderPendingAlerts() {
  const stalls = PERFORMANCE?.stalls ?? [];
  const monthStart = DEALS?.monthStart ? new Date(DEALS.monthStart) : null;
  if (!monthStart || isNaN(monthStart)) return [];
  const old = stalls.filter((s) => s.createdate && new Date(s.createdate) < monthStart);
  if (!old.length) return [];
  return [{
    id: "perf-old-pending",
    level: "warn",
    title: `${plural(old.length, "deal")} still pending from before ${DEALS.monthLabel}`,
    detail: `${eur(sum(old, (d) => d.value))} MRR outside this month's board.`,
    module: "performance",
  }];
}

function selfServedAlerts() {
  const n = typeof onboardingAlertCount === "function" ? onboardingAlertCount() : 0;
  const eligible = SELFSERVED?.funnel?.eligible ?? 0;
  const out = [];
  if (n) {
    out.push({
      id: "ss-onboarding",
      level: "warn",
      title: `${plural(n, "self-served account")} inside the onboarding window`,
      detail: "Active, paying, no deal attached. Reach out while they are still new.",
      module: "selfserved",
    });
  } else if (eligible) {
    out.push({
      id: "ss-eligible",
      level: "idle",
      title: `${plural(eligible, "re-engage candidate")} queued`,
      detail: "Qualified, untouched, no open deal.",
      module: "selfserved",
    });
  }
  return out;
}

// Own row on the team board. Team-wide numbers are the Pacing module's business;
// the dashboard only cares when it is your own line that is behind.
function pacingAlerts() {
  const me = (PACING?.roster ?? []).find((r) => r.id === PERFORMANCE?.ownerId);
  const act = PACING?.actuals?.[PERFORMANCE?.ownerId];
  if (!me || !act || !me.sqo || !me.cal?.total) return [];
  const elapsed = me.cal.elapsed / me.cal.total;
  if (elapsed < 0.2) return [];
  const ratio = (act.sqoMrr ?? 0) / (me.sqo * elapsed);
  if (ratio >= 0.85) return [];
  return [{
    id: "pacing-self",
    level: ratio < 0.6 ? "risk" : "warn",
    title: `SQO pacing at ${Math.round(ratio * 100)}% of where it should be`,
    detail: `${eur(act.sqoMrr)} of a ${eur(me.sqo)} month, ${me.cal.left} working day${me.cal.left === 1 ? "" : "s"} left.`,
    module: "pacing",
  }];
}

function buildAlerts() {
  return [
    ...dealAlerts(),
    ...pacePctAlerts(),
    ...olderPendingAlerts(),
    ...pacingAlerts(),
    ...briefingAlerts(),
    ...selfServedAlerts(),
  ].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

// ---------------------------------------------------------------------------
// pieces
// ---------------------------------------------------------------------------

function LadderItem({ alert, rank, onNavigate }) {
  const s = SEMANTIC[alert.level];
  const mod = TILE_MODULES.find((m) => m.id === alert.module);
  return (
    <button
      onClick={() => onNavigate?.(alert.module)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        width: "100%", textAlign: "left", cursor: "pointer",
        background: `linear-gradient(135deg, ${s.bg}, transparent 70%)`,
        border: `1px solid ${s.border}`,
        borderRadius: R.lg,
        padding: "15px 16px",
        color: C.text, font: `400 ${T.body}px/1.4 ${FONT_SANS}`,
        transition: "border-color 120ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = s.fill; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = s.border; }}
    >
      <span style={{
        font: `500 ${T.label}px/1 ${FONT_MONO}`, color: s.fill,
        paddingTop: 3, letterSpacing: TRACK.label, flex: "none",
      }}>
        {String(rank).padStart(2, "0")}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{
          display: "block",
          font: `500 ${T.bodyLg}px/1.3 ${FONT_SANS}`,
          letterSpacing: TRACK.tight, color: C.text,
        }}>
          {alert.title}
        </span>
        <span style={{ display: "block", color: C.textMuted, marginTop: 5, font: `400 ${T.micro + 1}px/1.45 ${FONT_SANS}` }}>
          {alert.detail}
        </span>
      </span>
      <span style={{
        font: `400 ${T.label}px/1 ${FONT_SANS}`, color: C.textFaint,
        letterSpacing: TRACK.label, textTransform: "uppercase",
        paddingTop: 4, whiteSpace: "nowrap", flex: "none",
      }}>
        {mod ? `${mod.num} ${mod.label}` : alert.module} →
      </span>
    </button>
  );
}

function Tile({ tile, onNavigate }) {
  const accent = C[tile.accent] || C.blue;
  return (
    <button
      onClick={() => onNavigate?.(tile.id)}
      style={{
        textAlign: "left", cursor: "pointer",
        background: C.cardBg,
        border: `1px solid ${C.border}`,
        borderRadius: R.lg,
        padding: 16,
        color: C.text, fontFamily: FONT_SANS,
        display: "flex", flexDirection: "column", gap: 12,
        transition: "background 120ms ease, border-color 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = C.cardBgHover;
        e.currentTarget.style.borderColor = `${accent}4D`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = C.cardBg;
        e.currentTarget.style.borderColor = C.border;
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 32, height: 32, borderRadius: R.md,
          background: `linear-gradient(135deg, ${accent}2E, ${accent}12)`,
          border: `1px solid ${accent}3D`,
          color: accent,
          display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
        }}>
          {ModuleIcon[tile.id]}
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{
            display: "block", font: `500 ${T.body}px/1.2 ${FONT_SANS}`,
            letterSpacing: TRACK.tight, color: C.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {tile.label}
          </span>
          <span style={{
            display: "block", font: `400 ${T.label}px/1 ${FONT_SANS}`,
            letterSpacing: TRACK.label, textTransform: "uppercase",
            color: C.textFaint, marginTop: 5,
          }}>
            {tile.sub}
          </span>
        </span>
        <span style={{ font: `400 ${T.label}px/1 ${FONT_MONO}`, color: C.textFaint, flex: "none" }}>
          {tile.num}
        </span>
      </div>
      {tile.signal && (
        <div style={{
          font: `400 ${T.micro}px/1.4 ${FONT_SANS}`, color: C.textMuted,
          borderTop: `1px solid ${C.divider}`, paddingTop: 11,
        }}>
          {tile.signal}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export default function DashboardModule({ onNavigate }) {
  const alerts = useMemo(buildAlerts, []);
  const top = alerts.slice(0, 3);
  const rest = alerts.slice(3);

  const today = useMemo(
    () => new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }),
    [],
  );

  const callsToday = WEEK_PROSPECTS?.[TODAY_ISO]?.length ?? 0;
  const pacing = PERFORMANCE?.pacing ?? {};
  const acceptedAmt = sum((DEALS?.deals ?? []).filter((d) => d.outcome === "accepted"), (d) => d.amt);

  // The hero dial. Level tracks pace rather than raw attainment - the same
  // discipline as module 04, and for the same reason: 40% on day 4 is fine.
  const month = useMemo(() => {
    const { target = 0, earned = 0, dayOfMonth = 0, daysInMonth = 0 } = pacing;
    const pct = target > 0 ? (earned / target) * 100 : 0;
    const elapsed = daysInMonth > 0 ? dayOfMonth / daysInMonth : 0;
    const expectedPct = elapsed * 100;
    const ratio = expectedPct > 0 ? pct / expectedPct : null;
    const level = ratio == null ? "idle" : ratio >= 1 ? "ok" : ratio >= 0.8 ? "warn" : "risk";
    const short = Math.max(0, Math.ceil(target * elapsed - earned));
    return { pct, expectedPct, level, short, target, earned, dayOfMonth, daysInMonth, ratio };
  }, [pacing]);

  const monthTrend = useMemo(() => (PERFORMANCE?.points ?? []).map((m) => m.points), []);

  // The Today tile's signal is derived live rather than carried in the registry,
  // so it can never disagree with what module 02 actually shows.
  const tiles = useMemo(() => TILE_MODULES.map((m) => {
    if (m.id !== "briefing") return m;
    const other = WEEK_OTHER_EVENTS?.[TODAY_ISO]?.length ?? 0;
    const bits = [];
    if (callsToday) bits.push(plural(callsToday, "discovery call"));
    if (other) bits.push(plural(other, "other event"));
    return { ...m, signal: bits.length ? `${bits.join(" · ")} today` : "Nothing on the calendar today" };
  }), [callsToday]);

  return (
    <Page>
      {/* The landing slot opens on the one number the month is judged by, not on
          a menu. The dial carries the verdict, the sparkline carries the shape
          of the year it sits in, and the sentence underneath says it in words so
          nobody has to read a dial to get the answer. */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 28, marginBottom: 28,
      }}>
        <div style={{ minWidth: 0 }}>
          <SectionLabel>{today}</SectionLabel>
          <h1 style={{
            font: `600 34px/1.1 ${FONT_SANS}`,
            letterSpacing: TRACK.tightest, color: C.text,
            margin: "12px 0 0",
          }}>
            {greeting()}, {OWNER.name.split(" ")[0]}.
          </h1>
          <div style={{ font: `400 ${T.bodyLg}px/1.5 ${FONT_SANS}`, color: C.textMuted, marginTop: 12, maxWidth: 560 }}>
            {/* Behind-pace months get the deficit as a colored chip so the one
                number that matters doesn't hide inside a grey sentence. */}
            {month.target === 0 ? (
              "No quota set for this month."
            ) : month.ratio >= 1 ? (
              `${month.earned} of ${month.target} points with ${month.daysInMonth - month.dayOfMonth} days left - ahead of pace.`
            ) : (
              <>
                {month.earned} of {month.target} points on day {month.dayOfMonth} of {month.daysInMonth}.{" "}
                <span style={{
                  display: "inline-block",
                  font: `600 ${T.micro + 1}px/1.4 ${FONT_SANS}`,
                  color: SEMANTIC[month.level].fill,
                  background: SEMANTIC[month.level].bg,
                  border: `1px solid ${SEMANTIC[month.level].border}`,
                  borderRadius: R.sm,
                  padding: "1px 7px",
                }}>
                  {month.short} points behind
                </span>
                {" "}where the month should be.
              </>
            )}
          </div>
          {monthTrend.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <Sparkline points={monthTrend} color={C.bloom} width={170} height={30} delay={260} />
              <span style={{ font: `400 ${T.label}px/1 ${FONT_MONO}`, color: C.textFaint, letterSpacing: TRACK.label }}>
                POINTS / MONTH
              </span>
            </div>
          )}
        </div>
        <Gauge pct={month.pct} level={month.level} size={184} thickness={14} markerPct={month.expectedPct}>
          <div style={{ font: `600 ${T.hero}px/1 ${FONT_SANS}`, color: SEMANTIC[month.level].fill, letterSpacing: TRACK.tightest, ...NUM }}>
            <CountUp value={month.pct} duration={1100} format={(v) => `${Math.round(v)}%`} />
          </div>
          <div style={{ font: `400 ${T.label}px/1 ${FONT_MONO}`, color: C.textFaint, letterSpacing: TRACK.label, marginTop: 9 }}>
            OF QUOTA
          </div>
        </Gauge>
      </div>

      <StatRow>
        <Stat label="Calls today" value={callsToday} size="sm" note={callsToday ? "briefs written" : "clear calendar"} />
        <Stat label="Points MTD" value={pacing.earned ?? 0} of={pacing.target ?? "-"} size="sm" valueColor={C.cyan}
              note={`day ${pacing.dayOfMonth ?? "-"} of ${pacing.daysInMonth ?? "-"}`} />
        <Stat label="Accepted MRR" value={eur(acceptedAmt)} size="sm" valueColor={C.emerald} note={DEALS?.monthLabel ?? ""} />
        <Stat label="Re-engage queue" value={SELFSERVED?.funnel?.eligible ?? 0} size="sm"
              valueColor={(SELFSERVED?.funnel?.eligible ?? 0) > 0 ? C.amber : undefined}
              note="qualified, untouched" />
      </StatRow>

      <div style={{ marginTop: 30 }}>
        <SectionLabel>Needs you</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {top.length === 0 ? (
            <Empty>Nothing is breaching, behind or unanswered. Go sell.</Empty>
          ) : (
            top.map((a, i) => (
              <LadderItem key={a.id} alert={a} rank={i + 1} onNavigate={onNavigate} />
            ))
          )}
        </div>

        {rest.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <SectionLabel>Also running</SectionLabel>
            <DataList style={{ marginTop: 8 }}>
              {rest.map((a, i) => {
                const mod = TILE_MODULES.find((m) => m.id === a.module);
                return (
                  <DataRow key={a.id} last={i === rest.length - 1} onClick={() => onNavigate?.(a.module)}>
                    <StatusDot level={a.level} />
                    <span style={{
                      flex: 1, minWidth: 0,
                      font: `400 ${T.body}px/1.3 ${FONT_SANS}`, color: C.textMid,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {a.title}
                    </span>
                    <span style={{
                      font: `400 ${T.label}px/1 ${FONT_SANS}`, color: C.textFaint,
                      letterSpacing: TRACK.label, textTransform: "uppercase", whiteSpace: "nowrap",
                    }}>
                      {mod ? `${mod.num} ${mod.label}` : a.module}
                    </span>
                  </DataRow>
                );
              })}
            </DataList>
          </div>
        )}
      </div>

      <div style={{ marginTop: 34 }}>
        <SectionLabel>Modules</SectionLabel>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(216px, 1fr))",
          gap: 12, marginTop: 12,
        }}>
          {tiles.map((t) => <Tile key={t.id} tile={t} onNavigate={onNavigate} />)}
        </div>
      </div>

      <div style={{
        marginTop: 40, paddingTop: 16, borderTop: `1px solid ${C.divider}`,
        display: "flex", justifyContent: "space-between",
        font: `400 ${T.label}px/1 ${FONT_MONO}`, color: C.textFaint,
        letterSpacing: TRACK.label,
      }}>
        <span>CLOUDTALK · SE EMEA</span>
        <span>⌘K PALETTE · ⌘B RAIL</span>
      </div>
    </Page>
  );
}
