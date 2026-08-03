import { useState, useEffect, useMemo, createContext, useContext } from "react";
import {
  motion, AnimatePresence, MotionConfig,
  useSpring, useTransform,
} from "framer-motion";
import { PERFORMANCE, GEO_MONTHLY, PROGRESSION_GEO } from "./data.js";

// ─── Present mode: mask contractual figures (€ commission, 80-pt quota) ──────
const MaskCtx = createContext(false);
const useMasked = () => useContext(MaskCtx);
const MASK = "•••";

// ─── Cult UI: AnimatedNumber (spring-based, ported inline) ─────────────────
function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("en-US") }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (c) => format(c));
  useEffect(() => { spring.set(value); }, [spring, value]);
  return <motion.span style={{ fontVariantNumeric: "tabular-nums" }}>{display}</motion.span>;
}

// ─── Inline sparkline ───────────────────────────────────────────────────────
function Sparkline({ data, color, w = 110, h = 26 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data), span = max - min || 1;
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * (w - 2) + 1,
    h - 2 - ((d - min) / span) * (h - 4),
  ]);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={`url(#sg-${color.replace("#", "")})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#060810",
  surf: "rgba(120,160,255,0.04)",
  surf2: "rgba(120,160,255,0.07)",
  line: "rgba(80,130,255,0.12)",
  line2: "rgba(80,130,255,0.28)",
  blue: "#4d82ff",
  blueDeep: "#1a56ff",
  blueBg: "rgba(26,86,255,0.12)",
  txt: "#dde6ff",
  mut: "rgba(180,205,255,0.55)",
  faint: "rgba(180,205,255,0.3)",
  green: "#47cd89",
  amber: "#f5a623",
  purple: "#3253DC",
  red: "#f97066",
  teal: "#2dd4bf",
};
const FONT = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";
const eur = (n) => "€" + Math.round(n).toLocaleString("en-US");

// ─── Month-over-month delta badge ───────────────────────────────────────────
function MomBadge({ curr, prev, small, invert }) {
  if (prev == null || prev === 0 || curr == null) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  const up = pct > 0;
  const flat = pct === 0;
  // invert: lower is better (rejections). down = green, up = red.
  const good = invert ? !up : up;
  return (
    <span style={{
      fontSize: small ? 8.5 : 9.5, fontWeight: 600, fontFamily: MONO,
      color: flat ? C.faint : good ? C.green : C.red,
      background: flat ? "transparent" : good ? "rgba(71,205,137,0.12)" : "rgba(249,112,102,0.12)",
      border: `1px solid ${flat ? "transparent" : good ? "rgba(71,205,137,0.28)" : "rgba(249,112,102,0.28)"}`,
      borderRadius: 4, padding: small ? "1px 3px" : "1px 5px", marginLeft: 5,
      verticalAlign: "middle", whiteSpace: "nowrap", display: "inline-block",
    }}>
      {flat ? "–" : up ? `+${pct}%` : `${pct}%`}
    </span>
  );
}

// Cult UI minimal-card dark shadow
const CARD_SHADOW = "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(0,0,0,0.18), 0 2px 2px rgba(0,0,0,0.12), 0 4px 4px rgba(0,0,0,0.1), 0 8px 8px rgba(0,0,0,0.08)";
const CARD_SHADOW_HOVER = "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(80,130,255,0.2), 0 4px 8px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.14), 0 16px 24px rgba(0,0,0,0.1)";

const card = {
  background: C.surf,
  border: `1px solid ${C.line}`,
  borderRadius: 18,
  padding: 24,
  boxShadow: CARD_SHADOW,
};
const label = {
  fontSize: 10,
  fontWeight: 600,
  color: C.faint,
  textTransform: "uppercase",
  letterSpacing: ".1em",
};

// ─── Direction-aware tab bar (Cult UI ported) ───────────────────────────────
const TABS = [
  { id: "pacing",      label: "Pacing" },
  { id: "funnel",      label: "Funnel" },
  { id: "period",      label: "This period" },
  { id: "progression", label: "Progression" },
  { id: "segments",    label: "Segments" },
  { id: "geo",         label: "By geo" },
];

function TabBar({ tab, setTab }) {
  return (
    <MotionConfig transition={{ type: "spring", bounce: 0.18, duration: 0.38 }}>
      <div style={{
        display: "inline-flex", gap: 2,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12, padding: "4px 4px", marginBottom: 28,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.2)",
        flexWrap: "wrap",
      }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                position: "relative", padding: "7px 16px", borderRadius: 9,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                fontFamily: FONT, border: "none", background: "transparent",
                color: on ? "#fff" : C.mut, zIndex: 1,
                transition: "color 0.2s",
              }}>
              {on && (
                <motion.span
                  layoutId="tab-pill"
                  style={{
                    position: "absolute", inset: 0, borderRadius: 9,
                    background: "rgba(77,130,255,0.18)",
                    border: "1px solid rgba(77,130,255,0.35)",
                    boxShadow: "0 0 12px rgba(26,86,255,0.2)",
                    zIndex: -1,
                  }}
                />
              )}
              {t.label}
            </button>
          );
        })}
      </div>
    </MotionConfig>
  );
}

// ─── Module root ────────────────────────────────────────────────────────────
export default function PerformanceModule({ intent }) {
  const VALID_TABS = ["pacing", "funnel", "period", "progression", "segments", "geo"];
  const [tab, setTab] = useState(
    intent?.tab && VALID_TABS.includes(intent.tab) ? intent.tab : "pacing"
  );
  const [present, setPresent] = useState(true);
  const p = PERFORMANCE;

  useEffect(() => {
    if (intent?.tab && VALID_TABS.includes(intent.tab)) setTab(intent.tab);
  }, [intent]);

  return (
    <MaskCtx.Provider value={present}>
    <div style={{ height: "100vh", overflowY: "auto", background: C.bg, color: C.txt, fontFamily: FONT }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 28px 80px" }}>

        {/* ── Header (minimal) ─────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: "-0.2px", color: C.txt }}>
              Performance
            </h1>
            <div style={{ fontSize: 11, color: C.faint, fontFamily: MONO, margin: "5px 0 0" }}>
              {p.owner} · live from HubSpot · {p.refreshedAt.split(" - ")[0]}
            </div>
          </div>
          <PresentToggle on={present} set={setPresent} />
        </div>
        <div style={{ height: 28 }} />

        {/* ── Tabs (direction-aware) ───────────────────────────────────── */}
        <TabBar tab={tab} setTab={setTab} />

        {/* ── Tab content (AnimatePresence slide) ─────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {tab === "pacing"      && <PacingView p={p} />}
            {tab === "funnel"      && <FunnelView p={p} />}
            {tab === "period"      && <PeriodView p={p} />}
            {tab === "progression" && <ProgressionView p={p} />}
            {tab === "segments"    && <SegmentsView p={p} />}
            {tab === "geo"         && <GeoView p={p} />}
          </motion.div>
        </AnimatePresence>

        {/* ── Source footnote ─────────────────────────────────────────── */}
        <div style={{ fontSize: 10.5, color: C.faint, fontFamily: MONO, marginTop: 28, lineHeight: 1.6, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
          SQL = deals where deal_creator = {p.owner} (ownerId {p.ownerId}), by create date. SQO = deal_accepted_by_ae = Yes.<br />
          Points = deal_sdr_points_number. 80 pts/month = 100% = {present ? MASK : eur(p.pacing.fullCommission)}. Source: HubSpot 6195055.
        </div>
      </div>
    </div>
    </MaskCtx.Provider>
  );
}

// ─── Present-mode toggle (hides contractual € + quota when screen-sharing) ───
function PresentToggle({ on, set }) {
  return (
    <button
      onClick={() => set(!on)}
      title={on ? "Showing safe view - commission & quota hidden" : "Hide commission & quota for screen-share"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
        padding: "7px 12px", borderRadius: 9, cursor: "pointer", fontFamily: FONT,
        fontSize: 12, fontWeight: 600,
        background: on ? "rgba(245,166,35,0.14)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${on ? "rgba(245,166,35,0.4)" : "rgba(255,255,255,0.08)"}`,
        color: on ? C.amber : C.mut,
        transition: "all 0.15s",
      }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      {on ? "Present mode" : "Present mode"}
    </button>
  );
}

// ═══ PACING VIEW (the speedometer) ═══════════════════════════════════════════

// Polar helper + arc path for the semicircle gauge.
function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}
function arc(cx, cy, r, startDeg, endDeg) {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg < startDeg ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function Gauge({ earned, target, masked }) {
  const pct = target > 0 ? earned / target : 0;
  const fill = Math.min(pct, 1);
  const over = pct > 1;
  const color = over ? C.green : pct >= 0.66 ? C.green : pct >= 0.33 ? C.amber : C.red;
  const W = 300, H = 172, cx = 150, cy = 150, r = 120;
  const track = arc(cx, cy, r, 180, 0);
  const value = arc(cx, cy, r, 180, 0); // full path, revealed via pathLength

  return (
    <div style={{ position: "relative", width: W, height: H, margin: "0 auto" }}>
      <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="gaugeFill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={track} fill="none" stroke="rgba(120,160,255,0.1)" strokeWidth="16" strokeLinecap="round" />
        <motion.path
          d={value} fill="none" stroke="url(#gaugeFill)" strokeWidth="16" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: fill }}
          transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.1 }}
          style={over ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}
        />
      </svg>
      {/* Center readout */}
      <div style={{ position: "absolute", top: 74, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 700, color, lineHeight: 1, letterSpacing: "-1.5px" }}>
          <AnimatedNumber value={Math.round(pct * 100)} format={(n) => `${Math.round(n)}%`} />
        </div>
        <div style={{ fontSize: 12, color: C.mut, marginTop: 6, fontFamily: MONO }}>
          {earned} / {masked ? MASK : target} pts
        </div>
      </div>
      {/* 0 / target end labels */}
      <div style={{ position: "absolute", bottom: 0, left: 6, fontSize: 10, color: C.faint, fontFamily: MONO }}>0</div>
      <div style={{ position: "absolute", bottom: 0, right: 6, fontSize: 10, color: C.faint, fontFamily: MONO }}>{masked ? MASK : target}</div>
    </div>
  );
}

function PacingStat({ value, caption, sub, color }) {
  return (
    <div style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || C.txt, letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ ...label, marginTop: 6 }}>{caption}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.faint, fontFamily: MONO, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function hoursSince(iso, nowMs) {
  return (nowMs - new Date(iso).getTime()) / 36e5;
}

// Derive workdays (Mon-Fri) elapsed + total for the month containing `todayIso`.
// Pure function so it stays cheap and predictable. UTC-anchored to dodge DST.
function deriveWorkdays(todayIso) {
  if (!todayIso) return null;
  const today = new Date(todayIso + "T00:00:00Z");
  if (isNaN(today)) return null;
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const todayDom = today.getUTCDate();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  let elapsed = 0, total = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(Date.UTC(y, m, d)).getUTCDay(); // 0 = Sun, 6 = Sat
    const isWeekday = dow >= 1 && dow <= 5;
    if (!isWeekday) continue;
    total += 1;
    if (d <= todayDom) elapsed += 1;
  }
  return { elapsed, total };
}

function PacingView({ p }) {
  const masked = useMasked();
  const { target, earned, pointValue, fullCommission, dayOfMonth, daysInMonth, today, workdaysElapsed, workdaysTotal } = p.pacing;
  const now = Date.now();
  const commission = (earned / target) * fullCommission;
  // Run-rate + projection use workdays (sales doesn't happen Sat/Sun).
  // Prefer derivation from `today` ISO; fall back to explicit overrides, then
  // to calendar days as a last resort if neither is provided.
  const derived = deriveWorkdays(today);
  const wkElapsed = Math.max(workdaysElapsed ?? derived?.elapsed ?? dayOfMonth, 1);
  const wkTotal = workdaysTotal ?? derived?.total ?? daysInMonth;
  const perDaySoFar = earned / wkElapsed;
  const requiredPace = target / wkTotal;
  const projected = Math.round(perDaySoFar * wkTotal);
  const projectedComm = (projected / target) * fullCommission;
  const remaining = target - earned;
  const daysLeft = Math.max(wkTotal - wkElapsed, 0);
  const ahead = remaining <= 0;
  const acc = p.acceptance;
  const pointSeries = p.points.map((m) => m.points);

  const stalls = p.stalls
    .map((s) => ({ ...s, ageH: hoursSince(s.createdate, now) }))
    .sort((a, b) => b.ageH - a.ageH);
  const stalled = stalls.filter((s) => s.ageH >= 24);
  const stalledPts = stalled.reduce((a, s) => a + s.points, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Gauge + commission + run-rate */}
      <div style={card}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center", justifyContent: "center" }}>
          <div style={{ flex: "0 0 auto" }}>
            <Gauge earned={earned} target={target} masked={masked} />
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <span style={{
                fontSize: 11.5, fontWeight: 600, fontFamily: MONO,
                color: ahead ? C.green : C.amber,
                background: ahead ? "rgba(71,205,137,0.12)" : "rgba(245,166,35,0.12)",
                border: `1px solid ${ahead ? "rgba(71,205,137,0.3)" : "rgba(245,166,35,0.3)"}`,
                borderRadius: 8, padding: "3px 10px",
              }}>
                {ahead ? `+${Math.abs(remaining)} pts over target` : `${remaining} pts to target · ${daysLeft} workdays left`}
              </span>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={label}>Commission earned · {p.monthLabel}</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: C.green, letterSpacing: "-1.5px", lineHeight: 1, marginTop: 6 }}>
                {masked ? MASK : <>€<AnimatedNumber value={Math.round(commission)} /></>}
              </div>
              <div style={{ fontSize: 11, color: C.faint, fontFamily: MONO, marginTop: 4 }}>
                {masked
                  ? `${earned} pts · commission hidden`
                  : `${earned} pts × ${eur(pointValue)} · full month (80 pts) = ${eur(fullCommission)}`}
              </div>
            </div>
            <div style={{ height: 1, background: C.line }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
              <PacingStat value={perDaySoFar.toFixed(1)} caption="Pts / workday" sub={`need ${requiredPace.toFixed(1)}/workday`} color={perDaySoFar >= requiredPace ? C.green : C.amber} />
              <PacingStat value={`${projected}`} caption="Projected EoM" sub={masked ? "of target" : `${Math.round((projected / target) * 100)}% of target`} color={C.blue} />
              <PacingStat value={masked ? MASK : eur(projectedComm)} caption="Proj. commission" sub={`at current pace`} color={C.txt} />
            </div>
          </div>
        </div>
      </div>

      {/* Acceptance status */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={label}>SQL acceptance · {acc.month}</div>
          <div style={{ fontSize: 11, color: C.faint, fontFamily: MONO }}>
            {acc.accepted.count + acc.rejected.count + acc.pending.count} deals · {acc.accepted.points + acc.rejected.points + acc.pending.points} pts
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {[
            { k: "accepted", l: "Accepted", c: C.green, d: acc.accepted },
            { k: "pending",  l: "Pending",  c: C.amber, d: acc.pending },
            { k: "rejected", l: "Rejected", c: C.red,   d: acc.rejected },
          ].map(({ k, l, c, d }) => (
            <div key={k} style={{ background: `${c}12`, border: `1px solid ${c}35`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: c, lineHeight: 1, letterSpacing: "-1px" }}>
                <AnimatedNumber value={d.count} />
              </div>
              <div style={{ fontSize: 11, color: C.mut, marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{l}</div>
              <div style={{ fontSize: 10.5, color: C.faint, fontFamily: MONO, marginTop: 2 }}>{d.points} pts riding</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stall alerts */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={label}>Stall alerts · pending SQLs</div>
          <div style={{ fontSize: 11, color: stalled.length ? C.amber : C.green, fontFamily: MONO }}>
            {stalled.length} stalled · {stalledPts} pts at risk
          </div>
        </div>
        {stalled.length === 0 ? (
          <div style={{ fontSize: 12.5, color: C.green }}>Nothing stalled - every pending demo is fresh.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {stalled.map((s, i) => {
              const days     = Math.floor(s.ageH / 24);
              const urgent   = s.ageH >= 96;
              const demoD    = s.demoDate ? new Date(s.demoDate) : null;
              const reschedD = s.rescheduledDate ? new Date(s.rescheduledDate) : null;
              const demoPast = demoD && demoD < now;
              const fmtDate  = (d) => d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
              const fmtTime  = (d) => d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null;

              // Status badge
              let statusLabel, statusColor, statusBg;
              if (s.noShow) {
                statusLabel = "no-show"; statusColor = C.red; statusBg = "rgba(249,112,102,0.12)";
              } else if (reschedD) {
                statusLabel = `reschedule ${fmtDate(reschedD)}`; statusColor = C.purple; statusBg = "rgba(50,83,220,0.14)";
              } else if (!demoPast) {
                statusLabel = `demo ${fmtDate(demoD)} ${fmtTime(demoD)}`; statusColor = C.blue; statusBg = C.blueBg;
              } else {
                statusLabel = "demo done - pending"; statusColor = C.amber; statusBg = "rgba(245,166,35,0.12)";
              }

              return (
                <motion.a
                  key={s.id} href={p.hsBase + s.id} target="_blank" rel="noreferrer"
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "8px 1fr auto auto auto auto auto",
                    alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 10, textDecoration: "none", color: C.txt,
                    background: i % 2 ? "transparent" : C.surf2,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.blueBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 ? "transparent" : C.surf2)}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: urgent ? C.red : C.amber,
                    boxShadow: `0 0 6px ${urgent ? C.red : C.amber}`,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name}
                  </span>
                  {/* Demo date */}
                  {demoD && (
                    <span style={{ fontSize: 10.5, color: demoPast ? C.faint : C.blue, fontFamily: MONO, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {fmtDate(demoD)} {fmtTime(demoD)}
                    </span>
                  )}
                  {/* Owner */}
                  <span style={{ fontSize: 11, color: C.mut, fontFamily: MONO, flexShrink: 0, whiteSpace: "nowrap" }}>
                    {s.owner}
                  </span>
                  {/* Status badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 600, fontFamily: MONO, flexShrink: 0,
                    color: statusColor, background: statusBg,
                    border: `1px solid ${statusColor}44`,
                    borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap",
                  }}>
                    {statusLabel}
                  </span>
                  <span style={{ fontSize: 11, color: C.blue, fontFamily: MONO, flexShrink: 0, width: 40, textAlign: "right" }}>{s.points} pts</span>
                  <span style={{ fontSize: 11, color: urgent ? C.red : C.amber, fontFamily: MONO, flexShrink: 0, width: 48, textAlign: "right" }}>{days}d old</span>
                </motion.a>
              );
            })}
          </div>
        )}
      </div>

      {/* Points MoM trend */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={label}>Points per month · vs {masked ? "" : "80 "}target</div>
          <div style={{ fontSize: 11, color: C.faint, fontFamily: MONO }}>{p.points.reduce((a, m) => a + m.points, 0)} pts YTD</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 130, padding: "16px 4px 0", position: "relative" }}>
          {/* target line */}
          {(() => {
            const maxP = Math.max(target, ...pointSeries);
            const targetY = 100 - (target / maxP) * 100;
            return (
              <div style={{ position: "absolute", left: 0, right: 0, top: 16 + targetY, borderTop: `1px dashed ${C.amber}`, opacity: 0.5 }}>
                <span style={{ position: "absolute", right: 0, top: -14, fontSize: 9, color: C.amber, fontFamily: MONO }}>{masked ? "target" : "target 80"}</span>
              </div>
            );
          })()}
          {p.points.map((m, ri) => {
            const maxP = Math.max(target, ...pointSeries);
            const h = (m.points / maxP) * 100;
            const hit = m.points >= target;
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "flex-end", height: 100, width: "100%", justifyContent: "center" }}>
                  <motion.div
                    initial={{ scaleY: 0, originY: "100%" }} animate={{ scaleY: 1 }}
                    transition={{ delay: ri * 0.05, type: "spring", stiffness: 280, damping: 26 }}
                    style={{
                      width: 26, height: Math.max(h, 2), borderRadius: "4px 4px 0 0",
                      background: hit ? C.green : C.blue, opacity: 0.9, position: "relative",
                    }}>
                    <span style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9.5, color: C.faint, fontFamily: MONO }}>
                      {m.points}
                    </span>
                  </motion.div>
                </div>
                <div style={{ fontSize: 11, color: C.mut, fontFamily: MONO }}>{m.label}</div>
                {ri > 0 && p.points[ri - 1].points > 0 && (
                  <MomBadge curr={m.points} prev={p.points[ri - 1].points} small />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══ FUNNEL VIEW (MQL → SQL → SQO, segmented by seats tier or AI) ════════════

const SEAT_SEGS = [
  { id: "micro",        label: "Micro",        sub: "1-10 seats",   color: "#60a5fa" },
  { id: "senior_micro", label: "Senior Micro", sub: "11-20 seats",  color: "#93c5fd" },
  { id: "smb",          label: "SMB",          sub: "21-50 seats",  color: C.blue },
  { id: "mm",           label: "Mid-market",   sub: "51-100 seats", color: C.green },
  { id: "enterprise",   label: "Enterprise",   sub: "101+ seats",   color: C.purple },
];
const AI_SEGS = [
  { id: "ai",   label: "AI / Voice Agent", sub: "va_point ≥ 1",   color: C.purple },
  { id: "core", label: "Core telephony",   sub: "no Voice Agent",  color: C.blue },
];

const MONTH_LABELS = {
  "2026-01": "Jan", "2026-02": "Feb", "2026-03": "Mar",
  "2026-04": "Apr", "2026-05": "May", "2026-06": "Jun",
};

function FunnelView({ p }) {
  const months = p.funnelMonths ?? Object.keys(MONTH_LABELS);
  const current = months[months.length - 1];
  const [range, setRange] = useState(current); // ytd | 2026-MM
  const [dim, setDim]     = useState("seats");  // seats | ai
  const segs   = dim === "seats" ? SEAT_SEGS : AI_SEGS;
  const data   = p.funnel[dim][range];
  const mql    = p.funnel.mql[range];
  const sqlTot    = segs.reduce((a, s) => a + data[s.id].sql, 0);
  const sqoTot    = segs.reduce((a, s) => a + data[s.id].sqo, 0);
  const rejTot    = segs.reduce((a, s) => a + data[s.id].rejected, 0);
  const penTot    = segs.reduce((a, s) => a + data[s.id].pending, 0);
  const maxSql    = Math.max(1, ...segs.map((s) => data[s.id].sql));
  const hasValue  = dim === "seats"; // AI segs don't carry value yet
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const rangeLabel = range === "ytd" ? "YTD 2026" : `${MONTH_LABELS[range]} 2026`;

  const Toggle = ({ options, val, set }) => (
    <div style={{ display: "flex", border: `1px solid ${C.line2}`, borderRadius: 9, overflow: "hidden" }}>
      {options.map(({ k, l }) => {
        const on = val === k;
        return (
          <button key={k} onClick={() => set(k)}
            style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: FONT, border: "none", background: on ? C.blueBg : "transparent", color: on ? C.blue : C.mut }}>
            {l}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Controls: month picker + dimension */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {[{ k: "ytd", l: "YTD" }, ...months.map((k) => ({ k, l: MONTH_LABELS[k] }))].map(({ k, l }) => {
            const on = range === k;
            return (
              <motion.button key={k} onClick={() => setRange(k)} whileTap={{ scale: 0.96 }}
                style={{
                  padding: "5px 13px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", fontFamily: FONT,
                  background: on ? C.blueBg : "transparent",
                  border: `1px solid ${on ? C.line2 : C.line}`,
                  color: on ? C.blue : C.mut,
                }}>
                {l}
              </motion.button>
            );
          })}
        </div>
        <Toggle options={[{ k: "seats", l: "By seats" }, { k: "ai", l: "By AI type" }]} val={dim} set={setDim} />
      </div>

      {/* Top funnel: MQL → SQL → SQO */}
      <div style={card}>
        <div style={{ ...label, marginBottom: 18 }}>Conversion funnel · {rangeLabel}</div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
          {[
            { l: "MQL", v: mql, c: C.purple, sub: "leads assigned" },
            { l: "SQL", v: sqlTot, c: C.blue, sub: "deals created", conv: pct(sqlTot, mql), from: "MQL" },
            { l: "SQO", v: sqoTot, c: C.green, sub: "accepted by AE", conv: pct(sqoTot, sqlTot), from: "SQL" },
          ].map((st, i) => (
            <div key={st.l} style={{ flex: 1, display: "flex", alignItems: "center" }}>
              {i > 0 && (
                <div style={{ flexShrink: 0, textAlign: "center", padding: "0 8px" }}>
                  <div style={{ fontSize: 16, color: C.faint }}>→</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: st.c, fontFamily: MONO }}>{st.conv}%</div>
                </div>
              )}
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 34, fontWeight: 700, color: st.c, letterSpacing: "-1px", lineHeight: 1 }}>
                  <AnimatedNumber value={st.v} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.txt, marginTop: 6 }}>{st.l}</div>
                <div style={{ fontSize: 10, color: C.faint, fontFamily: MONO, marginTop: 1 }}>{st.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Segmented breakdown */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={label}>SQL → SQO by {dim === "seats" ? "seats tier" : "AI product type"}</div>
          <div style={{ fontSize: 11, color: C.faint, fontFamily: MONO }}>{sqlTot} SQL · {sqoTot} accepted · {rejTot} rejected · {penTot} pending</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {segs.map((s, si) => {
            const d = data[s.id];
            const barW = (d.sql / maxSql) * 100;
            const acceptRate = pct(d.sqo, d.sql);
            return (
              <div key={s.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.label}</span>
                    <span style={{ fontSize: 11, color: C.faint, marginLeft: 7 }}>{s.sub}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "baseline", fontFamily: MONO }}>
                    {hasValue && d.sqlValue > 0 && (
                      <span style={{ fontSize: 10.5, color: C.blue }}>{eur(d.sqlValue)} SQL</span>
                    )}
                    {hasValue && d.sqoValue > 0 && (
                      <span style={{ fontSize: 10.5, color: C.green }}>{eur(d.sqoValue)} SQO</span>
                    )}
                    <span style={{ fontSize: 12, color: C.txt }}>
                      {d.sql} SQL · <span style={{ color: C.green }}>{acceptRate}% accepted</span>
                    </span>
                  </div>
                </div>
                {/* Stacked acceptance bar (within this segment's SQL width) */}
                <div style={{ height: 16, background: C.surf2, borderRadius: 5, overflow: "hidden", position: "relative" }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${barW}%` }}
                    transition={{ delay: si * 0.05 + 0.1, type: "spring", stiffness: 120, damping: 22 }}
                    style={{ height: "100%", display: "flex" }}
                  >
                    {[
                      { v: d.sqo, c: C.green },
                      { v: d.rejected, c: C.red },
                      { v: d.pending, c: C.amber },
                    ].map((seg, j) => (
                      <div key={j} title={`${["accepted","rejected","pending"][j]}: ${seg.v}`}
                        style={{ width: d.sql ? `${(seg.v / d.sql) * 100}%` : 0, background: seg.c, opacity: 0.85 }} />
                    ))}
                  </motion.div>
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 5, fontSize: 10.5, color: C.faint, fontFamily: MONO }}>
                  <span style={{ color: C.green }}>{d.sqo} accepted</span>
                  <span style={{ color: C.red }}>{d.rejected} rejected</span>
                  <span style={{ color: C.amber }}>{d.pending} pending</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 10.5, color: C.faint, fontFamily: MONO, lineHeight: 1.6 }}>
        MQL = contact total (no seat/AI dimension at lead stage). SQL/SQO/rejected/pending bucketed by deal create date.
        Seats tiers: micro 1-10 · senior micro 11-20 · smb 21-50 · mid-market 51-100 · enterprise 101+. AI = deal carries a Voice Agent / AIVA line item (va_point ≥ 1).
      </div>
    </div>
  );
}

// ─── Metric definitions ─────────────────────────────────────────────────────
const METRICS = {
  mql:      { label: "MQL",      sub: "Marketing-qualified leads",  color: C.purple, hasValue: false, seriesKey: "mqlCount" },
  sql:      { label: "SQL",      sub: "Deals created",              color: C.blue,   hasValue: true,  seriesKey: "sqlCount",      valueKey: "sqlValue" },
  sqo:      { label: "SQO",      sub: "Accepted by AE",             color: C.green,  hasValue: true,  seriesKey: "sqoCount",      valueKey: "sqoValue" },
  rejected: { label: "Rejected", sub: "Rejected by AE",             color: C.red,    hasValue: true,  seriesKey: "rejectedCount" },
  closed:   { label: "Closed",   sub: "Won / implementation · MRR",  color: C.teal,   hasValue: true,  seriesKey: "closedCount",   valueKey: "closedValue" },
};

// ─── Stat cell inside a metric tile ────────────────────────────────────────
function Stat({ count, value, mode, hasValue, caption, sub, accent, color, momCount, momValue, momInvert, unknown }) {
  const showValue = mode === "value" && hasValue;
  const displayVal = showValue ? value : count;
  const secondaryVal = showValue ? count : value;
  const mom = showValue ? momValue : momCount;

  return (
    <div style={{
      background: accent ? `${color}14` : C.surf2,
      border: `1px solid ${accent ? `${color}35` : C.line}`,
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent ? "#cdd9ff" : C.txt, lineHeight: 1, letterSpacing: "-1px" }}>
        {unknown
          ? <span style={{ color: C.faint }}>—</span>
          : showValue
            ? <>€<AnimatedNumber value={Math.round(displayVal)} format={(n) => Math.round(n).toLocaleString("en-US")} /></>
            : <AnimatedNumber value={Math.round(displayVal)} />
        }
        {!unknown && mom && <MomBadge curr={mom.curr} prev={mom.prev} invert={momInvert} />}
      </div>
      {hasValue && !unknown && (
        <div style={{ fontSize: 12, color: showValue ? C.mut : C.green, fontWeight: 600, marginTop: 5 }}>
          {showValue
            ? <><AnimatedNumber value={secondaryVal} /> deals</>
            : <>€<AnimatedNumber value={Math.round(secondaryVal)} format={(n) => Math.round(n).toLocaleString("en-US")} /></>
          }
        </div>
      )}
      {unknown && (
        <div style={{ fontSize: 11, color: C.amber, fontFamily: MONO, marginTop: 5 }}>per-deal export pending</div>
      )}
      <div style={{ fontSize: 10.5, color: C.mut, marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{caption}</div>
      <div style={{ fontSize: 10, color: C.faint, marginTop: 2, fontFamily: MONO }}>{sub}</div>
    </div>
  );
}

// ─── Metric tile — Cult UI Shift Card inspired ──────────────────────────────
function MetricTile({ id, p, mode, index }) {
  const def = METRICS[id];
  const m = p.metrics[id];
  const series = p.progression.map((r) => r[def.seriesKey] || 0);
  const lastRow = p.progression[p.progression.length - 1];
  const prevRow = p.progression[p.progression.length - 2];
  const momCount = { curr: lastRow?.[def.seriesKey] ?? 0, prev: prevRow?.[def.seriesKey] ?? 0 };
  const momValue = def.valueKey ? { curr: lastRow?.[def.valueKey] ?? 0, prev: prevRow?.[def.valueKey] ?? 0 } : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ y: -3, boxShadow: CARD_SHADOW_HOVER }}
      style={{ ...card, display: "flex", flexDirection: "column", gap: 14, cursor: "default" }}
    >
      {/* Tile header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: def.color,
            textTransform: "uppercase", letterSpacing: ".06em",
          }}>{def.label}</div>
          <div style={{ fontSize: 11.5, color: C.mut, marginTop: 2 }}>{def.sub}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Sparkline data={series} color={def.color} />
          <div style={{ fontSize: 9, color: C.faint, fontFamily: MONO, marginTop: 3 }}>6-mo trend</div>
        </div>
      </div>

      {/* Color accent strip */}
      <div style={{ height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${def.color}80, transparent)` }} />

      {/* Week / Month stats — rejections: month only, lower-is-better MoM */}
      <div style={{ display: "grid", gridTemplateColumns: id === "rejected" ? "1fr" : "1fr 1fr", gap: 10 }}>
        {id !== "rejected" && (
          <Stat count={m.week.count} value={m.week.value} unknown={m.week.unknown} mode={mode} hasValue={def.hasValue} caption="this week" sub={p.weekLabel} accent color={def.color} />
        )}
        <Stat count={m.month.count} value={m.month.value} mode={mode} hasValue={def.hasValue} caption="this month" sub={p.monthLabel} color={def.color} momCount={momCount} momValue={momValue} momInvert={id === "rejected"} />
      </div>

      {/* Acceptance rate — rejected tile only. Rate = accepted / (accepted +
          rejected); only deals with a Yes/No decision count. Pending (deals
          still awaiting AE action) flagged separately so they don't dilute the
          denominator. Source: deal_accepted_by_ae on the SDR's deals. */}
      {id === "rejected" && p.acceptanceByMonth && (() => {
        const cur = p.acceptanceByMonth[p.acceptanceByMonth.length - 1];
        const prev = p.acceptanceByMonth[p.acceptanceByMonth.length - 2];
        const decided = (r) => (r ? (r.accepted || 0) + (r.rejected || 0) : 0);
        const curPct = decided(cur) ? (cur.accepted / decided(cur)) * 100 : 0;
        const prevPct = decided(prev) ? (prev.accepted / decided(prev)) * 100 : 0;
        const delta = curPct - prevPct;
        const ytd = p.acceptanceYtd;
        const ytdDecided = ytd ? (ytd.accepted + ytd.rejected) : 0;
        const ytdPct = ytdDecided ? (ytd.accepted / ytdDecided) * 100 : 0;
        return (
          <div style={{
            background: `${C.green}10`,
            border: `1px solid ${C.green}30`,
            borderRadius: 10, padding: "10px 14px",
            display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 10.5, color: C.mut, textTransform: "uppercase", letterSpacing: ".06em" }}>Acceptance rate</div>
              <div style={{ fontSize: 10, color: C.faint, fontFamily: MONO, marginTop: 2 }}>
                {cur ? `${cur.accepted}/${decided(cur)} this month` : ""}{ytd ? ` · ${ytd.accepted}/${ytdDecided} YTD (${ytdPct.toFixed(1)}%)` : ""}
              </div>
              {cur && cur.pending > 0 && (
                <div style={{ fontSize: 10, color: C.amber, fontFamily: MONO, marginTop: 3 }}>
                  {cur.pending} pending action this month
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.green, lineHeight: 1, fontFamily: MONO }}>
                {curPct.toFixed(1)}%
              </div>
              {prev && (
                <div style={{ fontSize: 10, color: delta >= 0 ? C.green : C.red, fontFamily: MONO, marginTop: 3 }}>
                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)} pts vs {prev.label}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
}

// Derive closed-deal headline metrics + monthly progression series from the
// raw closed.rows array (Progression > Closed source). Returns a new `p` with
// `closed` injected into metrics and `closedCount` / `closedValue` (MRR) added
// to every progression row. The week window is inferred from the current data
// snapshot - we treat the latest funnelMonth as "this month" and the 7 days
// ending on `pacing.today` as "this week".
function deriveClosedMetrics(p) {
  const rows = p.closed?.rows || [];
  const monthly = p.closed?.monthly || [];
  const todayIso = p.pacing?.today || null;
  const currentMonthKey = p.funnelMonths?.[p.funnelMonths.length - 1] || null;

  // Prefer per-deal rows when present (richer breakdowns). Fall back to monthly
  // aggregates from HubSpot when rows are empty - in that case by-AE and by-
  // country are not available and the UI degrades.
  const useRows = rows.length > 0;

  // --- Per-month aggregation (used for chart + monthly table) ---
  const perMonth = {};
  if (useRows) {
    for (const r of rows) {
      const key = (r.closedDate || "").slice(0, 7);
      if (!key) continue;
      if (!perMonth[key]) perMonth[key] = { count: 0, mrr: 0 };
      perMonth[key].count += 1;
      perMonth[key].mrr += (r.value || 0) * ARR_TO_MRR;
    }
  } else {
    for (const m of monthly) {
      perMonth[m.month] = { count: m.count || 0, mrr: (m.arr || 0) * ARR_TO_MRR };
    }
  }

  // --- Week + current-month totals for "This period" tile ---
  let weekCount = 0, weekMrr = 0, monthCount = 0, monthMrr = 0;
  let weekUnknown = false;
  if (useRows) {
    let weekStart = null, weekEnd = null;
    if (todayIso) {
      const end = new Date(todayIso + "T23:59:59Z");
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 6);
      start.setUTCHours(0, 0, 0, 0);
      weekStart = start; weekEnd = end;
    }
    const inWeek = (iso) => {
      if (!weekStart || !weekEnd || !iso) return false;
      const d = new Date(iso);
      return d >= weekStart && d <= weekEnd;
    };
    const inMonth = (iso) => !!(currentMonthKey && iso && iso.startsWith(currentMonthKey));
    for (const r of rows) {
      const mrr = (r.value || 0) * ARR_TO_MRR;
      if (inWeek(r.closedDate))  { weekCount  += 1; weekMrr  += mrr; }
      if (inMonth(r.closedDate)) { monthCount += 1; monthMrr += mrr; }
    }
  } else {
    // Monthly-aggregate fallback: this-week not knowable, current-month exact.
    weekUnknown = true;
    const cm = monthly.find((m) => m.month === currentMonthKey);
    if (cm) {
      monthCount = cm.count || 0;
      monthMrr   = (cm.arr || 0) * ARR_TO_MRR;
    }
  }

  const progression = (p.progression || []).map((row) => {
    const bucket = perMonth[row.month] || { count: 0, mrr: 0 };
    return { ...row, closedCount: bucket.count, closedValue: bucket.mrr };
  });

  // --- Per-country & per-owner breakdowns: only when per-deal rows exist ---
  let closedByCountry = null;
  let closedByOwner   = null;
  if (useRows) {
    closedByCountry = {};
    for (const r of rows) {
      const c = r.country;
      const key = (r.closedDate || "").slice(0, 7);
      if (!c || !key) continue;
      if (!closedByCountry[c]) closedByCountry[c] = {};
      if (!closedByCountry[c][key]) closedByCountry[c][key] = { count: 0, mrr: 0 };
      closedByCountry[c][key].count += 1;
      closedByCountry[c][key].mrr += (r.value || 0) * ARR_TO_MRR;
    }
    const ownerByMonth = {};
    for (const r of rows) {
      const key = (r.closedDate || "").slice(0, 7);
      if (!key) continue;
      if (!ownerByMonth[key]) ownerByMonth[key] = {};
      const oname = r.owner || "Unassigned";
      if (!ownerByMonth[key][oname]) ownerByMonth[key][oname] = { count: 0, mrr: 0, deals: [] };
      ownerByMonth[key][oname].count += 1;
      ownerByMonth[key][oname].mrr += (r.value || 0) * ARR_TO_MRR;
      ownerByMonth[key][oname].deals.push(r);
    }
    closedByOwner = Object.keys(ownerByMonth)
      .sort()
      .map((month) => ({
        month,
        label: MONTH_LABELS[month] || month,
        owners: Object.entries(ownerByMonth[month]).map(([name, v]) => ({
          name, count: v.count, mrr: v.mrr, deals: v.deals,
        })),
      }));
  }

  return {
    ...p,
    progression,
    closedByCountry,
    closedByOwner,
    closedSourceIsMonthly: !useRows,
    metrics: {
      ...p.metrics,
      closed: {
        week:  { count: weekCount,  value: weekMrr, unknown: weekUnknown },
        month: { count: monthCount, value: monthMrr },
      },
    },
  };
}

// ─── Period view ─────────────────────────────────────────────────────────────
function PeriodView({ p }) {
  // Derive closed metrics from the same row source the Progression > Closed view
  // uses. closedValue is expressed as MRR (ARR/12) so this tile reconciles 1:1
  // with the Closed sub-view. Week range = data's weekLabel; for the seeded
  // snapshot that's Mon 15 - Sun 21 Jun.
  const enrichedP = useMemo(() => deriveClosedMetrics(p), [p]);
  const m = enrichedP.metrics;
  const [selected, setSelected] = useState("all");
  const [mode, setMode]         = useState("count");
  const conv = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;
  const order = ["mql", "sql", "sqo", "rejected", "closed"];
  const shown = selected === "all" ? order : [selected];
  const showValueToggle = shown.some((id) => METRICS[id].hasValue);
  p = enrichedP;

  return (
    <>
      {/* Selector row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {[{ k: "all", l: "All" }, ...order.map((k) => ({ k, l: METRICS[k].label }))].map(({ k, l }) => {
            const on = selected === k;
            const col = k === "all" ? C.blue : METRICS[k].color;
            return (
              <motion.button key={k} onClick={() => setSelected(k)} whileTap={{ scale: 0.96 }}
                style={{
                  padding: "6px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 500,
                  cursor: "pointer", fontFamily: FONT,
                  background: on ? `${col}22` : "transparent",
                  border: `1px solid ${on ? col : C.line}`,
                  color: on ? col : C.mut,
                  transition: "background 0.15s, border-color 0.15s, color 0.15s",
                }}>
                {l}
              </motion.button>
            );
          })}
        </div>
        {showValueToggle && (
          <div style={{
            display: "flex", marginLeft: "auto",
            border: `1px solid ${C.line2}`, borderRadius: 9, overflow: "hidden",
          }}>
            {[{ k: "count", l: "# Count" }, { k: "value", l: "€ Value" }].map(({ k, l }) => {
              const on = mode === k;
              return (
                <button key={k} onClick={() => setMode(k)}
                  style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                    fontFamily: FONT, border: "none",
                    background: on ? C.blueBg : "transparent",
                    color: on ? C.blue : C.mut,
                    transition: "background 0.15s, color 0.15s",
                  }}>
                  {l}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tiles grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {shown.map((id, i) => <MetricTile key={id} id={id} p={p} mode={mode} index={i} />)}
      </div>

      {/* Conversions bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        style={{ ...card, marginTop: 14, display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-start" }}
      >
        {[
          { l: "MQL → SQL · all-time", v: p.mqlToSql.ratePct, c: C.purple, sub: `${p.mqlToSql.sqlContacts}/${p.mqlToSql.mqlContacts} contacts` },
          { l: "SQL → SQO · week",     v: conv(m.sqo.week.count, m.sql.week.count),   c: C.green },
          { l: "SQL → SQO · month",    v: conv(m.sqo.month.count, m.sql.month.count), c: C.green },
          { l: "SQO → Won · YTD",      v: conv(p.sqoToWonYtd.won, p.sqoToWonYtd.sqo), c: C.teal, sub: `${p.sqoToWonYtd.won}/${p.sqoToWonYtd.sqo} deals` },
        ].map(({ l, v, c, sub }) => (
          <div key={l}>
            <div style={label}>{l}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: c, marginTop: 6, letterSpacing: "-0.5px" }}>
              <AnimatedNumber value={v} format={(n) => `${n.toFixed(1)}%`} />
            </div>
            {sub && <div style={{ fontSize: 10, color: C.faint, fontFamily: MONO, marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center" }}>
          <p style={{ fontSize: 11, color: C.faint, margin: 0, lineHeight: 1.55 }}>
            MQL by owner-assigned date; SQL by create date; SQO by acceptance date. Weekly SQO can exceed SQL when an earlier deal is accepted this week.
          </p>
        </div>
      </motion.div>
    </>
  );
}

// ─── Progression view ────────────────────────────────────────────────────────
const PROG_SERIES = [
  { id: "mql",      label: "MQL",      color: C.purple, countKey: "mqlCount" },
  { id: "sql",      label: "SQL",      color: C.blue,   countKey: "sqlCount", valueKey: "sqlValue" },
  { id: "sqo",      label: "SQO",      color: C.green,  countKey: "sqoCount", valueKey: "sqoValue" },
  { id: "rejected", label: "Rejected", color: C.red,    countKey: "rejectedCount" },
  { id: "closed",   label: "Closed",   color: C.teal,   countKey: "closedCount", valueKey: "closedValue", valueIsMrr: true },
];

// Series used when a country geo-filter is active (no € value, but MQL + Closed included)
const GEO_SERIES = [
  { id: "mql",      label: "MQL",      color: C.purple, countKey: "mql"      },
  { id: "sql",      label: "SQL",      color: C.blue,   countKey: "sql"      },
  { id: "sqo",      label: "SQO",      color: C.green,  countKey: "sqo"      },
  { id: "rejected", label: "Rejected", color: C.red,    countKey: "rejected" },
  { id: "closed",   label: "Closed",   color: C.teal,   countKey: "closed"   },
];

function ProgressionView({ p: rawP }) {
  const p = useMemo(() => deriveClosedMetrics(rawP), [rawP]);
  const [active,       setActive]       = useState(["sql", "sqo"]);
  const [geoFilter,    setGeoFilter]    = useState(null);
  const [monthFocus,   setMonthFocus]   = useState(null);
  const [compareVs,    setCompareVs]    = useState(null); // null = auto prev month
  const [openRegions,  setOpenRegions]  = useState(() => new Set(["europe"]));

  const toggle       = (id) => setActive((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  const toggleRegion = (id) => setOpenRegions((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const isGeo      = geoFilter != null;
  const seriesSet  = isGeo ? GEO_SERIES : PROG_SERIES;
  const geoRows    = isGeo ? (PROGRESSION_GEO.byCountry[geoFilter] ?? []) : null;
  // When a country filter is active, overlay closed counts from p.closedByCountry
  // so the Closed series renders against the same monthly grid as MQL/SQL/SQO.
  const allRows    = isGeo
    ? geoRows.map((r) => {
        // When per-deal closed data exists, overlay closed counts onto the
        // geo row. When it doesn't (monthly-aggregate source), closed = 0
        // here - the Closed series renders empty in geo mode, which is honest.
        const bucket = p.closedByCountry?.[geoFilter]?.[r.month] || { count: 0 };
        return { ...r, closed: bucket.count };
      })
    : p.progression;
  const rows       = monthFocus ? allRows.filter((r) => r.month === monthFocus) : allRows;
  const sel        = seriesSet.filter((s) => active.includes(s.id));
  const maxCount   = Math.max(1, ...rows.flatMap((r) => sel.map((s) => r[s.countKey] || 0)));
  const valueSeries = sel.filter((s) => s.valueKey);

  const getCompareRow = (row) => {
    if (compareVs) return allRows.find((r) => r.month === compareVs) ?? null;
    const ri = allRows.findIndex((r) => r.month === row.month);
    return ri > 0 ? allRows[ri - 1] : null;
  };

  const getDeltas = (row) => {
    const prev = getCompareRow(row);
    return [null, ...sel.flatMap((s) => {
      const curr      = row[s.countKey] || 0;
      const prevCount = prev != null ? (prev[s.countKey] || 0) : null;
      const invert    = s.id === "rejected";
      if (!isGeo && s.valueKey) {
        return [
          { curr, prev: prevCount, invert },
          { curr: row[s.valueKey] || 0, prev: prev != null ? (prev[s.valueKey] || 0) : null, invert },
        ];
      }
      return [{ curr, prev: prevCount, invert }];
    })];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={card}>
      {/* Header + metric toggles */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={label}>Pipeline progression since January 2026</div>
        <div style={{ display: "flex", gap: 5 }}>
          {seriesSet.map((s) => {
            const on = active.includes(s.id);
            return (
              <motion.button key={s.id} onClick={() => toggle(s.id)} whileTap={{ scale: 0.95 }}
                style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                  cursor: "pointer", fontFamily: FONT,
                  background: on ? `${s.color}22` : "transparent",
                  border: `1px solid ${on ? s.color : C.line}`,
                  color: on ? s.color : C.mut,
                }}>
                {s.label}
              </motion.button>
            );
          })}
        </div>
      </div>


      {/* Geo accordion */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
        {PROGRESSION_GEO.regions.map((region, ri) => {
          const isOpen  = openRegions.has(region.id);
          const hasData = region.countries.length > 0;
          const activeCountry = region.countries.includes(geoFilter ?? "") ? geoFilter : null;
          return (
            <div key={region.id} style={{ borderTop: ri > 0 ? `1px solid ${C.line}` : "none" }}>
              <button
                onClick={() => hasData && toggleRegion(region.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", background: isOpen ? C.surf : "transparent",
                  border: "none", cursor: hasData ? "pointer" : "default", fontFamily: FONT,
                  transition: "background 0.15s",
                }}
              >
                <span style={{
                  fontSize: 9, color: hasData ? (isOpen ? C.blue : C.mut) : C.faint,
                  display: "inline-block", transition: "transform 0.18s",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                }}>▶</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: hasData ? C.txt : C.faint }}>
                  {region.label}
                </span>
                {!hasData && (
                  <span style={{ fontSize: 10, color: C.faint, fontFamily: MONO }}>· no data yet</span>
                )}
                {activeCountry && (
                  <span style={{ fontSize: 10.5, color: C.blue, fontFamily: MONO, fontWeight: 600 }}>· {activeCountry}</span>
                )}
              </button>
              <AnimatePresence initial={false}>
                {isOpen && hasData && (
                  <motion.div key="geo-content"
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "6px 14px 12px 30px" }}>
                      {region.countries.map((c) => {
                        const on = geoFilter === c;
                        return (
                          <motion.button key={c} whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setGeoFilter(on ? null : c);
                            }}
                            style={{
                              padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: on ? 600 : 400,
                              cursor: "pointer", fontFamily: FONT,
                              background: on ? C.blueBg : "transparent",
                              border: `1px solid ${on ? C.blue : C.line}`,
                              color: on ? C.blue : C.mut,
                            }}>
                            {c}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Period + Compare-vs selectors */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.faint, fontFamily: MONO, minWidth: 70 }}>Period</span>
          {[null, ...p.funnelMonths].map((m) => {
            const on = monthFocus === m;
            return (
              <motion.button key={m ?? "all"} whileTap={{ scale: 0.95 }}
                onClick={() => { setMonthFocus(m); if (!m) setCompareVs(null); }}
                style={{
                  padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                  cursor: "pointer", fontFamily: FONT,
                  background: on ? "rgba(50,83,220,0.16)" : "transparent",
                  border: `1px solid ${on ? C.purple : C.line}`,
                  color: on ? C.purple : C.mut,
                }}>
                {m ? MONTH_LABELS[m] : "All"}
              </motion.button>
            );
          })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.faint, fontFamily: MONO, minWidth: 70 }}>Compare vs</span>
          {[null, ...p.funnelMonths.filter((m) => m !== monthFocus)].map((m) => {
            const on = compareVs === m;
            return (
              <motion.button key={m ?? "prev"} whileTap={{ scale: 0.95 }}
                onClick={() => setCompareVs(m)}
                style={{
                  padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                  cursor: "pointer", fontFamily: FONT,
                  background: on ? "rgba(71,205,137,0.12)" : "transparent",
                  border: `1px solid ${on ? C.green : C.line}`,
                  color: on ? C.green : C.mut,
                }}>
                {m ? MONTH_LABELS[m] : "prev"}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 150, padding: "0 4px", marginBottom: 8 }}>
        {rows.map((r, ri) => (
          <div key={r.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120, width: "100%", justifyContent: "center" }}>
              {sel.map((s) => {
                const h = ((r[s.countKey] || 0) / maxCount) * 120;
                return (
                  <motion.div key={s.id} title={`${s.label} ${r[s.countKey] || 0}`}
                    initial={{ scaleY: 0, originY: "100%" }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: ri * 0.04 + 0.05, type: "spring", stiffness: 300, damping: 28 }}
                    style={{
                      width: 18, height: Math.max(h, 2), background: s.color,
                      borderRadius: "3px 3px 0 0", position: "relative", opacity: 0.88,
                    }}>
                    <span style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: C.faint, fontFamily: MONO }}>
                      {r[s.countKey] || 0}
                    </span>
                  </motion.div>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: C.mut, fontFamily: MONO }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.mut, marginBottom: 20, flexWrap: "wrap" }}>
        {sel.map((s) => (
          <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />{s.label} (count)
          </span>
        ))}
        {sel.length === 0 && <span style={{ color: C.faint }}>Select at least one metric above.</span>}
      </div>

      {/* Monthly table */}
      <div style={{ ...label, marginBottom: 10 }}>
        Monthly detail{!isGeo && valueSeries.length ? " (value in EUR)" : ""}
        {!isGeo && valueSeries.some((s) => s.valueIsMrr) && (
          <span style={{ fontWeight: 400, color: C.teal, fontSize: 11, marginLeft: 6, fontFamily: MONO }}>· Closed € = MRR</span>
        )}
        {geoFilter && <span style={{ fontWeight: 400, color: C.faint, fontSize: 11, marginLeft: 6 }}>· {geoFilter}</span>}
        {compareVs && <span style={{ fontWeight: 400, color: C.green, fontSize: 11, marginLeft: 6 }}>· vs {MONTH_LABELS[compareVs]}</span>}
      </div>
      <div style={{ overflowX: "auto" }}>
        <ProgRow head cells={["Month", ...sel.flatMap((s) => (!isGeo && s.valueKey) ? [`${s.label} #`, `${s.label} €`] : [`${s.label} #`])]} />
        {rows.map((r) => (
          <ProgRow key={r.month}
            cells={[r.label, ...sel.flatMap((s) => (!isGeo && s.valueKey) ? [r[s.countKey] || 0, eur(r[s.valueKey] || 0)] : [r[s.countKey] || 0])]}
            deltas={getDeltas(r)} />
        ))}
        {rows.length > 1 && (
          <ProgRow total
            cells={["Total", ...sel.flatMap((s) => (!isGeo && s.valueKey)
              ? [rows.reduce((a, r) => a + (r[s.countKey] || 0), 0), eur(rows.reduce((a, r) => a + (r[s.valueKey] || 0), 0))]
              : [rows.reduce((a, r) => a + (r[s.countKey] || 0), 0)])]} />
        )}
      </div>

      {/* Rejections by AE (only when Rejected series is selected) */}
      {active.includes("rejected") && (
        <RejectedByOwnerCard rejectedByOwner={p.rejectedByOwner} monthFilter={monthFocus} />
      )}

      {/* Closed by AE (only when Closed series is selected) */}
      {active.includes("closed") && (
        <ClosedByOwnerCard
          closedByOwner={p.closedByOwner}
          monthFilter={monthFocus}
          geoFilter={geoFilter}
          closedRows={p.closed?.rows || []}
          sourceIsMonthly={p.closedSourceIsMonthly}
        />
      )}
    </div>
    </div>
  );
}

// Closed deal `value` is ARR (HubSpot amount_in_home_currency). All Closed
// surfaces convert to MRR for direct comparability with CT's per-seat per-month
// pricing model. Single source of truth - change here if accounting flips.
const ARR_TO_MRR = 1 / 12;

// Closed-by-AE breakdown, mirrors RejectedByOwnerCard's shape. Filters by month
// (from Progression's month selector) and country (from the geo accordion), so
// the card stays in lockstep with whatever the rest of the view is showing.
function ClosedByOwnerCard({ closedByOwner, monthFilter, geoFilter, closedRows, sourceIsMonthly }) {
  // When source is monthly aggregates, per-deal owner/country isn't available.
  if (sourceIsMonthly || closedByOwner == null) {
    return (
      <div style={{ marginTop: 26 }}>
        <div style={{ ...label, marginBottom: 10 }}>
          Closed deals by AE
          <span style={{ fontWeight: 400, color: C.faint, fontSize: 11, marginLeft: 6 }}>
            <span style={{ color: C.teal }}>· MRR</span>
          </span>
        </div>
        <div style={{
          padding: "14px 16px",
          background: "rgba(245,166,35,0.05)",
          border: `1px dashed ${C.amber}55`,
          borderRadius: 8,
          fontSize: 12.5,
          color: C.mut,
          lineHeight: 1.5,
        }}>
          <span style={{ color: C.amber, fontWeight: 600 }}>Per-deal export pending</span>
          {" - "}HubSpot report currently provides monthly aggregates only. Export the deal list with{" "}
          <span style={{ color: C.txt, fontFamily: MONO, fontSize: 11.5 }}>Deal owner</span>{" "}+{" "}
          <span style={{ color: C.txt, fontFamily: MONO, fontSize: 11.5 }}>Country</span>{" "}
          columns to enable the by-AE and by-country breakdowns. Totals and monthly progression are still accurate.
        </div>
      </div>
    );
  }

  // If a geo filter is active we re-aggregate from raw rows; otherwise we use
  // the pre-aggregated `closedByOwner` (already grouped by month).
  let data = closedByOwner || [];
  if (geoFilter) {
    const filtered = (closedRows || []).filter((r) => r.country === geoFilter);
    const perMonth = {};
    for (const r of filtered) {
      const key = (r.closedDate || "").slice(0, 7);
      if (!key) continue;
      if (!perMonth[key]) perMonth[key] = {};
      const oname = r.owner || "Unassigned";
      if (!perMonth[key][oname]) perMonth[key][oname] = { name: oname, count: 0, mrr: 0 };
      perMonth[key][oname].count += 1;
      perMonth[key][oname].mrr += (r.value || 0) * ARR_TO_MRR;
    }
    data = Object.keys(perMonth).sort().map((m) => ({
      month: m, label: MONTH_LABELS[m] || m,
      owners: Object.values(perMonth[m]),
    }));
  }
  if (monthFilter) data = data.filter((r) => r.month === monthFilter);

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ ...label, marginBottom: 10 }}>
        Closed deals by AE
        <span style={{ fontWeight: 400, color: C.faint, fontSize: 11, marginLeft: 6 }}>
          {monthFilter ? `· ${MONTH_LABELS[monthFilter]}` : "· all months"}
          {geoFilter && <span style={{ color: C.blue }}> · {geoFilter}</span>}
          <span style={{ color: C.teal }}> · MRR</span>
        </span>
      </div>
      {data.length === 0 && (
        <div style={{ fontSize: 12, color: C.faint }}>No closed deals in this period.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: monthFilter ? 5 : 14 }}>
        {data.map((row) => (
          <div key={row.month}>
            {!monthFilter && (
              <div style={{ fontSize: 10, color: C.faint, fontFamily: MONO, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>{row.label}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[...row.owners].sort((a, b) => b.mrr - a.mrr).map((o) => (
                <div key={o.name} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 10px", background: C.surf, borderRadius: 7, border: `1px solid ${C.line}`,
                }}>
                  <span style={{ fontSize: 12.5, color: o.name === "Santiago Subra" ? C.blue : C.txt, fontWeight: o.name === "Santiago Subra" ? 600 : 400 }}>
                    {o.name}
                  </span>
                  <div style={{ display: "flex", gap: 14, fontFamily: MONO, fontSize: 11 }}>
                    <span style={{ color: C.teal }}>{o.count} closed</span>
                    <span style={{ color: C.txt }}>{eur(o.mrr)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const OWNER_IDS = {
  "Santiago Subra":          87191703,
  "Jody Barrett":            83328722,
  "Laurent Bélanger-Lowe":   760537593,
  "Nicholas Agafitei":       78465113,
  "Emma Orozco":             792312489,
  "Federico Mambelli":       84123102,
  "Konstantin Vasilopoulos": 687799059,
  "Chris Hoang":             41215078,
  "Ludwig Engel":            631363412,
  "Bradford Ord-Hume":       1223800630,
  "Louis Lebegue":           90353641,
};

// Build a HubSpot deal-list URL filtered to a given AE's rejected deals.
// HubSpot stores deal_accepted_by_ae as 'true'/'false' (Yes/No labels).
// URL filter UI doesn't reliably support date-range operators, so the link
// opens the AE's all-time rejected deals; user filters by date inside HubSpot.
function hubspotRejectedUrl(name) {
  const ownerId = OWNER_IDS[name];
  if (!ownerId) return null;
  const filters = [
    { property: "deal_creator__sdr_only_", operator: "EQ", value: String(ownerId) },
    { property: "deal_accepted_by_ae",     operator: "EQ", value: "false" },
  ];
  return `https://app.hubspot.com/contacts/6195055/objects/0-3/views/all/list?filters=${encodeURIComponent(JSON.stringify(filters))}`;
}

function RejectedByOwnerCard({ rejectedByOwner, monthFilter }) {
  const data = monthFilter
    ? rejectedByOwner.filter((r) => r.month === monthFilter)
    : rejectedByOwner;

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ ...label, marginBottom: 10 }}>
        Rejections by AE
        <span style={{ fontWeight: 400, color: C.faint, fontSize: 11, marginLeft: 6 }}>
          {monthFilter ? `· ${MONTH_LABELS[monthFilter]}` : "· all months"}
        </span>
      </div>
      {data.length === 0 && <div style={{ fontSize: 12, color: C.faint }}>No rejections in this period.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: monthFilter ? 5 : 14 }}>
        {data.map((row) => (
          <div key={row.month}>
            {!monthFilter && (
              <div style={{ fontSize: 10, color: C.faint, fontFamily: MONO, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>{row.label}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[...row.owners].sort((a, b) => b.count - a.count).map((o) => {
                const url = hubspotRejectedUrl(o.name);
                const inner = (
                  <>
                    <span style={{ fontSize: 12.5, color: o.name === "Santiago Subra" ? C.blue : C.txt, fontWeight: o.name === "Santiago Subra" ? 600 : 400 }}>
                      {o.name}
                    </span>
                    <div style={{ display: "flex", gap: 14, fontFamily: MONO, fontSize: 11 }}>
                      <span style={{ color: C.red }}>{o.count} rejected</span>
                      <span style={{ color: C.faint }}>{o.pts} pts</span>
                    </div>
                  </>
                );
                const rowStyle = {
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 10px", background: C.surf, borderRadius: 7, border: `1px solid ${C.line}`,
                  textDecoration: "none", color: "inherit",
                  cursor: url ? "pointer" : "default",
                  transition: "border-color 0.15s",
                };
                return url ? (
                  <a key={o.name} href={url} target="_blank" rel="noreferrer"
                    style={rowStyle}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.red; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; }}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={o.name} style={rowStyle}>{inner}</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgRow({ cells, head, total, deltas }) {
  return (
    <div style={{
      display: "flex", padding: "7px 0", borderBottom: `1px solid ${C.line}`,
      fontSize: head ? 10 : 12.5, color: head ? C.faint : C.txt,
      fontWeight: head || total ? 600 : 400,
      textTransform: head ? "uppercase" : "none",
      letterSpacing: head ? ".06em" : 0,
    }}>
      {cells.map((c, i) => (
        <span key={i} style={{
          flex: i === 0 ? "0 0 64px" : 1,
          textAlign: i === 0 ? "left" : "right",
          color: total && i > 0 ? C.green : undefined,
          whiteSpace: "nowrap",
        }}>
          {c}
          {!head && !total && deltas?.[i] != null && (
            <MomBadge curr={deltas[i].curr} prev={deltas[i].prev} invert={deltas[i].invert} small />
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Segments view ───────────────────────────────────────────────────────────
const SEGS = [
  { id: "micro",     label: "Micro",      sub: "≤ €500 MRR",       color: "#60a5fa" },
  { id: "smb",       label: "SMB",        sub: "€500 – €1,499 MRR", color: C.blue },
  { id: "midmarket", label: "Mid-market", sub: "≥ €1,500 MRR",      color: C.green },
];

function SegmentsView({ p }) {
  const [mode, setMode] = useState("count");
  const split   = p.segmentSplit;
  const monthly = p.segmentMonthly;
  const sqlTotal = { count: Object.values(split.sql).reduce((s, v) => s + v.count, 0), value: Object.values(split.sql).reduce((s, v) => s + v.value, 0) };
  const sqoTotal = { count: Object.values(split.sqo).reduce((s, v) => s + v.count, 0), value: Object.values(split.sqo).reduce((s, v) => s + v.value, 0) };
  const pct = (n, t) => t > 0 ? Math.round((n / t) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", border: `1px solid ${C.line2}`, borderRadius: 9, overflow: "hidden" }}>
          {[{ k: "count", l: "# Count" }, { k: "value", l: "€ Value" }].map(({ k, l }) => {
            const on = mode === k;
            return (
              <button key={k} onClick={() => setMode(k)}
                style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: FONT, border: "none", background: on ? C.blueBg : "transparent", color: on ? C.blue : C.mut }}>
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {/* SQL + SQO side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[
          { key: "sql", kl: "SQL",  color: C.blue,  total: sqlTotal },
          { key: "sqo", kl: "SQO",  color: C.green, total: sqoTotal },
        ].map(({ key, kl, color, total }, ci) => {
          const data = split[key];
          const maxBar = Math.max(1, ...SEGS.map((s) => mode === "value" ? data[s.id].value : data[s.id].count));
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.07 }} style={card}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color }}>{kl} by segment</div>
                <div style={{ fontSize: 11, color: C.faint, fontFamily: MONO }}>
                  {mode === "value" ? eur(total.value) : `${total.count} deals`} total
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {SEGS.map((s) => {
                  const v     = mode === "value" ? data[s.id].value : data[s.id].count;
                  const pctV  = pct(v, mode === "value" ? total.value : total.count);
                  const barW  = (v / maxBar) * 100;
                  return (
                    <div key={s.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                        <div>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: s.color }}>{s.label}</span>
                          <span style={{ fontSize: 11, color: C.faint, marginLeft: 6 }}>{s.sub}</span>
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.txt }}>
                          {mode === "value" ? eur(v) : v}
                          <span style={{ fontSize: 10, color: C.faint, marginLeft: 5 }}>{pctV}%</span>
                        </div>
                      </div>
                      <div style={{ height: 8, background: C.surf2, borderRadius: 4, overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${barW}%` }}
                          transition={{ delay: ci * 0.05 + 0.1, type: "spring", stiffness: 120, damping: 20 }}
                          style={{ height: "100%", background: s.color, borderRadius: 4, opacity: 0.85 }}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: C.faint, marginTop: 3, fontFamily: MONO }}>
                        {mode === "value" ? `${data[s.id].count} deals` : eur(data[s.id].value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Monthly segment charts */}
      {["sql", "sqo"].map((key) => {
        const maxVal = Math.max(1, ...monthly.flatMap((r) => SEGS.map((s) => mode === "value" ? r[key][s.id].value : r[key][s.id].count)));
        return (
          <div key={key} style={card}>
            <div style={{ ...label, marginBottom: 14 }}>{key.toUpperCase()} by segment · monthly</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 130, padding: "16px 4px 0", marginBottom: 8 }}>
              {monthly.map((r, ri) => (
                <div key={r.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100, width: "100%", justifyContent: "center" }}>
                    {SEGS.map((s) => {
                      const v = mode === "value" ? r[key][s.id].value : r[key][s.id].count;
                      const h = (v / maxVal) * 100;
                      return (
                        <motion.div key={s.id} title={`${s.label} ${v}`}
                          initial={{ scaleY: 0, originY: "100%" }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: ri * 0.04, type: "spring", stiffness: 280, damping: 26 }}
                          style={{ width: 18, height: Math.max(h, 2), background: s.color, borderRadius: "3px 3px 0 0", opacity: 0.88 }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: C.mut, fontFamily: MONO }}>{r.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 11, color: C.mut, marginBottom: 16, flexWrap: "wrap" }}>
              {SEGS.map((s) => (
                <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />{s.label}
                </span>
              ))}
            </div>
            <div style={{ overflowX: "auto" }}>
              <ProgRow head cells={["Month", ...SEGS.map((s) => mode === "value" ? `${s.label} €` : `${s.label} #`)]} />
              {monthly.map((r) => (
                <ProgRow key={r.month} cells={[r.label, ...SEGS.map((s) => mode === "value" ? eur(r[key][s.id].value) : r[key][s.id].count)]} />
              ))}
              <ProgRow total cells={["Total", ...SEGS.map((s) => {
                const tot = monthly.reduce((acc, r) => acc + (mode === "value" ? r[key][s.id].value : r[key][s.id].count), 0);
                return mode === "value" ? eur(tot) : tot;
              })]} />
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: 10.5, color: C.faint, fontFamily: MONO }}>
        MRR tiers: Micro ≤ €500/mo · SMB €500-€1,499/mo · Mid-market ≥ €1,500/mo. MRR = amount__products_recurring. Value sums = monthly recurring (EUR).
      </div>
    </div>
  );
}

// ─── Geo view ────────────────────────────────────────────────────────────────
function GeoView({ p }) {
  const [period, setPeriod] = useState("all");
  const MONTH_KEYS = Object.keys(GEO_MONTHLY).sort();
  const source      = period === "all" ? p.geo : (GEO_MONTHLY[period]?.rows ?? []);
  const geo         = source.filter((g) => g.country !== "(Unknown)");
  const unknown     = source.find((g) => g.country === "(Unknown)");
  const maxV        = geo.length ? Math.max(...geo.map((g) => g.value)) : 1;
  const totCount    = source.reduce((s, g) => s + g.count, 0);
  const totValue    = source.reduce((s, g) => s + g.value, 0);
  const periodLabel = period === "all" ? "since Jan 2026" : `${GEO_MONTHLY[period]?.label} 2026`;
  const prevMonthKey = period !== "all" ? (MONTH_KEYS[MONTH_KEYS.indexOf(period) - 1] ?? null) : null;
  const prevRows    = prevMonthKey ? (GEO_MONTHLY[prevMonthKey]?.rows ?? []) : [];
  const prevByCtry  = Object.fromEntries(prevRows.map((r) => [r.country, r]));

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={label}>SQO value by country · {periodLabel}</div>
        <div style={{ fontSize: 11, color: C.mut, fontFamily: MONO }}>
          <AnimatedNumber value={totCount} /> SQO · €<AnimatedNumber value={Math.round(totValue)} format={(n) => Math.round(n).toLocaleString("en-US")} />
        </div>
      </div>

      {/* Month selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 18 }}>
        {[{ k: "all", l: "All" }, ...MONTH_KEYS.map((k) => ({ k, l: GEO_MONTHLY[k]?.label }))].map(({ k, l }) => {
          const on = period === k;
          return (
            <motion.button key={k} onClick={() => setPeriod(k)} whileTap={{ scale: 0.96 }}
              style={{
                padding: "5px 13px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                cursor: "pointer", fontFamily: FONT,
                background: on ? C.blueBg : "transparent",
                border: `1px solid ${on ? C.line2 : C.line}`,
                color: on ? C.blue : C.mut,
              }}>
              {l}
            </motion.button>
          );
        })}
      </div>

      {/* Animated geo bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <AnimatePresence mode="wait">
          <motion.div key={period} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {geo.map((g, i) => {
              const prev = prevByCtry[g.country];
              return (
              <motion.div key={g.country}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.018, duration: 0.2 }}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div style={{ width: 130, flexShrink: 0, fontSize: 12.5, color: C.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {g.country}
                </div>
                <div style={{ flex: 1, height: 18, background: C.surf2, borderRadius: 4, position: "relative", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(g.value / maxV) * 100}%` }}
                    transition={{ delay: i * 0.018 + 0.05, type: "spring", stiffness: 120, damping: 22 }}
                    style={{
                      height: "100%",
                      background: `linear-gradient(90deg, ${C.blueDeep}, ${C.blue})`,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 12.5, color: C.green, fontWeight: 600 }}>
                    {eur(g.value)}
                    {prev && <MomBadge curr={g.value} prev={prev.value} small />}
                  </div>
                </div>
                <div style={{ width: 30, flexShrink: 0, textAlign: "right", fontSize: 11, color: C.faint, fontFamily: MONO }}>
                  {g.count}
                </div>
              </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {unknown && (
        <p style={{ fontSize: 10.5, color: C.faint, fontFamily: MONO, marginTop: 14 }}>
          + {unknown.count} SQO ({eur(unknown.value)}) with no country set on the deal.
        </p>
      )}
    </div>
  );
}
