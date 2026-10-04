import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { C, FONT_SANS, FONT_MONO, FONT_DISPLAY } from "../../lib/palette.js";
import { PACING, GENERATED_AT } from "./data.js";
import { PREVIOUS_MONTH } from "../../pacing.config.js";

// ─── Design tokens (orange family) ──────────────────────────────────────────
const accent = C.orange;
const accentBg = C.orangeBg;
const accentBorder = C.orangeBorder;

const ok    = { bg: "rgba(71,205,137,0.12)", fg: C.emerald, bar: C.emerald };
const mid   = { bg: "rgba(253,176,34,0.12)", fg: C.amber,   bar: C.amber };
const low   = { bg: "rgba(249,112,102,0.12)", fg: C.red,     bar: C.red };

const eur = (n) => "€" + Math.round(n).toLocaleString("en-US");

function status(pct) {
  if (pct == null) return { tier: "na", label: "Not enough days yet", colors: null };
  if (pct >= 100)  return { tier: "ok",  label: "On pace",          colors: ok };
  if (pct >= 80)   return { tier: "mid", label: "Slightly behind",  colors: mid };
  return { tier: "low", label: "Needs attention", colors: low };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function sumFor(members, actuals) {
  const f = {
    sqlMrr: 0, sqoMrr: 0, sqlDeals: 0, sqoDeals: 0, missing: 0,
    sqlTarget: 0, sqoTarget: 0, sqlExpected: 0, sqoExpected: 0,
    sqlNeed: 0, sqoNeed: 0,
  };
  for (const m of members) {
    const share = m.cal.total ? m.cal.elapsed / m.cal.total : 0;
    f.sqlTarget += m.sql;
    f.sqoTarget += m.sqo;
    f.sqlExpected += m.sql * share;
    f.sqoExpected += m.sqo * share;
    const a = actuals[m.id];
    const sa = a ? Number(a.sqlMrr) || 0 : 0;
    const oa = a ? Number(a.sqoMrr) || 0 : 0;
    if (m.cal.left > 0) {
      f.sqlNeed += Math.max(0, m.sql - sa) / m.cal.left;
      f.sqoNeed += Math.max(0, m.sqo - oa) / m.cal.left;
    }
    if (!a) { f.missing++; continue; }
    f.sqlMrr += sa;
    f.sqoMrr += oa;
    f.sqlDeals += Number(a.sqlDeals) || 0;
    f.sqoDeals += Number(a.sqoDeals) || 0;
  }
  f.hasData = f.missing < members.length;
  return f;
}

function daysLabel(members) {
  const lefts = [...new Set(members.map((m) => m.cal.left))];
  if (lefts.length === 1) return `${lefts[0]} working day${lefts[0] === 1 ? "" : "s"} left`;
  const bcn = members.find((m) => m.office === "BCN" && !m.off?.length);
  const tor = members.find((m) => m.office === "TOR" && !m.off?.length);
  return `${bcn?.cal.left ?? "?"} days left in Barcelona, ${tor?.cal.left ?? "?"} in Toronto`;
}

function needText(gap, perDay, dLabel, hasData) {
  if (hasData && gap <= 0) return "Monthly target already reached.";
  const lead = hasData ? "Still to book" : "To book this month";
  return `${lead}: ${eur(gap)} - ${dLabel} - ${eur(perDay)}/day needed`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });
}

// ─── ProgressBar ────────────────────────────────────────────────────────────
function ProgressBar({ actual, target, expected, colors, hasData }) {
  const fillPct = hasData ? Math.min(100, (actual / target) * 100) : 0;
  const tickPct = target > 0 ? (expected / target) * 100 : 0;
  const barColor = colors ? colors.bar : C.textHint;

  return (
    <div style={{ position: "relative", height: 6, borderRadius: 999, background: C.border }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${fillPct.toFixed(1)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          position: "absolute", inset: "0 auto 0 0",
          borderRadius: 999, background: barColor,
        }}
      />
      <div style={{
        position: "absolute", top: -3, bottom: -3, width: 2,
        left: `calc(${tickPct.toFixed(2)}% - 1px)`,
        background: C.textMuted, opacity: 0.55,
      }} />
    </div>
  );
}

// ─── MetricCard (team / office level) ───────────────────────────────────────
function MetricCard({ title, actual, target, deals, hasData, expected, gap, perDay, dLabel }) {
  const pct = (!hasData || expected <= 0) ? null : (actual / expected) * 100;
  const st = status(pct);

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "22px 22px 20px", display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{
          fontSize: 13, fontWeight: 600, letterSpacing: "0.06em",
          textTransform: "uppercase", color: C.textHint, fontFamily: FONT_MONO,
        }}>{title}</span>
        <span style={{ fontSize: 12, color: C.textHint }}>MRR, month to date</span>
      </div>

      <div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 34,
          lineHeight: 1, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums",
        }}>
          {hasData ? eur(actual) : "—"}
        </div>
        <div style={{ fontSize: 13, color: C.textHint, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
          of {eur(target)} target
        </div>
      </div>

      <ProgressBar actual={actual} target={target} expected={expected} colors={st.colors} hasData={hasData} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>
          Pacing <strong style={{ color: C.text, fontWeight: 600 }}>
            {pct == null ? "n/a" : `${Math.round(pct)}%`}
          </strong>
        </span>
        <StatusPill tier={st.tier} label={hasData ? st.label : "Not loaded yet"} />
      </div>

      <div style={{ fontSize: 12.5, color: C.textHint }}>
        {hasData
          ? `${deals} deal${deals === 1 ? "" : "s"} - expected by now ${eur(expected)}`
          : `Expected by now ${eur(expected)}`}
      </div>

      <div style={{
        fontSize: 12.5, color: C.textMuted,
        borderTop: `1px dashed ${C.border}`, paddingTop: 10,
      }}>
        {needText(hasData ? gap : target, perDay, dLabel, hasData)}
      </div>
    </div>
  );
}

// ─── StatusPill ─────────────────────────────────────────────────────────────
function StatusPill({ tier, label, small }) {
  const map = {
    ok:  { bg: ok.bg,  color: ok.fg },
    mid: { bg: mid.bg, color: mid.fg },
    low: { bg: low.bg, color: low.fg },
    na:  { bg: C.surfaceAlt, color: C.textHint },
  };
  const s = map[tier] || map.na;
  return (
    <span style={{
      fontSize: small ? 11.5 : 12.5, fontWeight: 600,
      padding: small ? "3px 8px" : "5px 10px",
      borderRadius: 999, whiteSpace: "nowrap",
      background: s.bg, color: s.color,
    }}>
      {label}
    </span>
  );
}

// ─── Per-SDR table ──────────────────────────────────────────────────────────
function SdrTable({ members, actuals }) {
  const thStyle = {
    textAlign: "left", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em",
    textTransform: "uppercase", color: C.textHint, fontFamily: FONT_MONO,
    padding: "12px 14px 8px", borderBottom: `1px solid ${C.border}`,
  };
  const thMetric = { ...thStyle, borderLeft: `1px solid ${C.border}` };

  return (
    <div style={{
      overflowX: "auto", border: `1px solid ${C.border}`,
      borderRadius: 14, background: C.surface,
    }}>
      <table style={{
        width: "100%", borderCollapse: "collapse", minWidth: 640,
        fontVariantNumeric: "tabular-nums", fontFamily: FONT_SANS,
      }}>
        <thead>
          <tr>
            <th style={thStyle}>SDR</th>
            <th style={thMetric}>SQL created</th>
            <th style={thMetric}>SQO accepted</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <SdrRow key={m.id} member={m} actuals={actuals} isLast={i === members.length - 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SdrRow({ member, actuals, isLast }) {
  const a = actuals[member.id];
  const has = !!a;
  const sub = [member.note, `${member.cal.total} working days`].filter(Boolean).join(" - ");
  const tdBase = {
    padding: "12px 14px", verticalAlign: "middle",
    borderBottom: isLast ? "none" : `1px solid ${C.border}`,
  };

  return (
    <tr>
      <td style={{ ...tdBase, fontWeight: 500, whiteSpace: "nowrap" }}>
        {member.name}
        <div style={{ fontWeight: 400, color: C.textHint, fontSize: 12 }}>{sub}</div>
      </td>
      <td style={{ ...tdBase, borderLeft: `1px solid ${C.border}`, width: "38%" }}>
        <InlineMetric
          actual={has ? Number(a.sqlMrr) || 0 : 0}
          target={member.sql}
          deals={has ? Number(a.sqlDeals) || 0 : 0}
          hasData={has}
          cal={member.cal}
        />
      </td>
      <td style={{ ...tdBase, borderLeft: `1px solid ${C.border}`, width: "38%" }}>
        <InlineMetric
          actual={has ? Number(a.sqoMrr) || 0 : 0}
          target={member.sqo}
          deals={has ? Number(a.sqoDeals) || 0 : 0}
          hasData={has}
          cal={member.cal}
        />
      </td>
    </tr>
  );
}

function InlineMetric({ actual, target, deals, hasData, cal }) {
  const share = cal.total ? cal.elapsed / cal.total : 0;
  const expected = target * share;
  const pct = (!hasData || expected <= 0) ? null : (actual / expected) * 100;
  const st = status(pct);
  const gap = target - actual;
  const perDay = cal.left > 0 ? Math.max(0, gap) / cal.left : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13.5 }}>
        <span style={{ fontWeight: 600, color: C.text }}>{hasData ? eur(actual) : "—"}</span>
        <span style={{ color: C.textHint, fontSize: 12 }}>
          of {eur(target)}{hasData ? ` - ${deals} deal${deals === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      <ProgressBar actual={actual} target={target} expected={expected} colors={st.colors} hasData={hasData} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: C.textMuted }}>
        <span>
          Pacing <strong style={{ color: C.text, fontWeight: 600 }}>
            {pct == null ? "n/a" : `${Math.round(pct)}%`}
          </strong>
        </span>
        <StatusPill tier={st.tier} label={hasData ? st.label : "Not loaded yet"} small />
      </div>
      <div style={{ fontSize: 12, color: C.textHint }}>
        {needText(
          hasData ? gap : target,
          hasData ? perDay : (cal.left > 0 ? target / cal.left : 0),
          `${cal.left} day${cal.left === 1 ? "" : "s"} left`,
          hasData,
        )}
      </div>
    </div>
  );
}

// ─── OfficeSection ──────────────────────────────────────────────────────────
function OfficeSection({ label, sub, members, actuals }) {
  const fig = sumFor(members, actuals);
  const dl = daysLabel(members);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{
          fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 20,
          margin: 0, letterSpacing: -0.2,
        }}>{label}</h2>
        <span style={{ fontSize: 13, color: C.textHint }}>{sub}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <MetricCard
          title="SQL created" actual={fig.sqlMrr} target={fig.sqlTarget}
          deals={fig.sqlDeals} hasData={fig.hasData} expected={fig.sqlExpected}
          gap={fig.sqlTarget - fig.sqlMrr} perDay={fig.sqlNeed} dLabel={dl}
        />
        <MetricCard
          title="SQO accepted" actual={fig.sqoMrr} target={fig.sqoTarget}
          deals={fig.sqoDeals} hasData={fig.hasData} expected={fig.sqoExpected}
          gap={fig.sqoTarget - fig.sqoMrr} perDay={fig.sqoNeed} dLabel={dl}
        />
      </div>
      <SdrTable members={members} actuals={actuals} />
    </section>
  );
}

// ─── September (frozen) ─────────────────────────────────────────────────────
function SeptemberView() {
  const prev = PREVIOUS_MONTH;
  if (!prev) return null;

  const groups = [
    { label: "Whole team", data: prev.team },
    { label: "Barcelona", data: prev.BCN },
    { label: "Toronto",   data: prev.TOR },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 20, margin: 0 }}>
            {prev.label}, final
          </h2>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
            color: C.textHint, background: C.surfaceAlt, border: `1px solid ${C.border}`,
            borderRadius: 999, padding: "3px 9px",
          }}>Closed</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {groups.map(({ label, data }) => {
            const sp = Math.round((data.sqlMrr / data.sqlTarget) * 100);
            const op = Math.round((data.sqoMrr / data.sqoTarget) * 100);
            const st = status(sp);
            return (
              <div key={label} style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
                padding: "16px 18px 14px", display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600, letterSpacing: "0.06em",
                    textTransform: "uppercase", color: C.textHint, fontFamily: FONT_MONO,
                  }}>{label}</span>
                  <span style={{ fontSize: 12, color: C.textHint }}>final</span>
                </div>
                <div>
                  <div style={{
                    fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 24,
                    lineHeight: 1, fontVariantNumeric: "tabular-nums",
                  }}>{sp}%</div>
                  <div style={{ fontSize: 13, color: C.textHint, marginTop: 4 }}>
                    SQL - {eur(data.sqlMrr)} of {eur(data.sqlTarget)}
                  </div>
                </div>
                <ProgressBar actual={data.sqlMrr} target={data.sqlTarget} expected={data.sqlTarget} colors={st.colors} hasData />
                <div style={{ fontSize: 12.5, color: C.textHint }}>
                  <strong style={{ color: C.text, fontWeight: 600 }}>{op}%</strong> SQO - {eur(data.sqoMrr)} of {eur(data.sqoTarget)}
                </div>
                <div style={{ fontSize: 12.5, color: C.textHint }}>
                  {data.sqlDeals} SQLs created - {data.sqoDeals} SQOs accepted
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {prev.people && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 20, margin: 0 }}>
              SDRs
            </h2>
            <span style={{ fontSize: 13, color: C.textHint }}>where the month finished</span>
          </div>
          <PrevTable people={prev.people} />
        </section>
      )}
    </div>
  );
}

function PrevTable({ people }) {
  const thStyle = {
    textAlign: "left", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em",
    textTransform: "uppercase", color: C.textHint, fontFamily: FONT_MONO,
    padding: "12px 14px 8px", borderBottom: `1px solid ${C.border}`,
  };

  return (
    <div style={{
      overflowX: "auto", border: `1px solid ${C.border}`,
      borderRadius: 14, background: C.surface,
    }}>
      <table style={{
        width: "100%", borderCollapse: "collapse", minWidth: 640,
        fontVariantNumeric: "tabular-nums", fontFamily: FONT_SANS,
      }}>
        <thead>
          <tr>
            <th style={thStyle}>SDR</th>
            <th style={{ ...thStyle, borderLeft: `1px solid ${C.border}` }}>SQL created</th>
            <th style={{ ...thStyle, borderLeft: `1px solid ${C.border}` }}>SQO accepted</th>
          </tr>
        </thead>
        <tbody>
          {people.map(([office, name, sa, st, oa, ot], i) => {
            const sp = Math.round((sa / st) * 100);
            const op = Math.round((oa / ot) * 100);
            const stSql = status(sp);
            const stSqo = status(op);
            const isLast = i === people.length - 1;
            const tdBase = {
              padding: "12px 14px", verticalAlign: "middle",
              borderBottom: isLast ? "none" : `1px solid ${C.border}`,
            };
            return (
              <tr key={name}>
                <td style={{ ...tdBase, fontWeight: 500, whiteSpace: "nowrap" }}>
                  {name}
                  <div style={{ fontWeight: 400, color: C.textHint, fontSize: 12 }}>
                    {office === "BCN" ? "Barcelona" : "Toronto"}
                  </div>
                </td>
                <td style={{ ...tdBase, borderLeft: `1px solid ${C.border}`, width: "38%" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                      <span style={{ fontWeight: 600 }}>{eur(sa)}</span>
                      <span style={{ color: C.textHint, fontSize: 12 }}>of {eur(st)}</span>
                    </div>
                    <ProgressBar actual={sa} target={st} expected={st} colors={stSql.colors} hasData />
                    <div style={{ fontSize: 12.5, color: C.textMuted }}>
                      Finished at <strong style={{ color: C.text }}>{sp}%</strong>
                    </div>
                  </div>
                </td>
                <td style={{ ...tdBase, borderLeft: `1px solid ${C.border}`, width: "38%" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                      <span style={{ fontWeight: 600 }}>{eur(oa)}</span>
                      <span style={{ color: C.textHint, fontSize: 12 }}>of {eur(ot)}</span>
                    </div>
                    <ProgressBar actual={oa} target={ot} expected={ot} colors={stSqo.colors} hasData />
                    <div style={{ fontSize: 12.5, color: C.textMuted }}>
                      Finished at <strong style={{ color: C.text }}>{op}%</strong>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main module ────────────────────────────────────────────────────────────
export default function PacingModule() {
  const [tab, setTab] = useState("current");

  const { roster, actuals, offices, pool, todayIso, monthLabel } = PACING;
  const bcnMembers = useMemo(() => roster.filter((r) => r.office === "BCN"), [roster]);
  const torMembers = useMemo(() => roster.filter((r) => r.office === "TOR"), [roster]);

  const bcnCal = bcnMembers.find((m) => !m.off?.length)?.cal;
  const torCal = torMembers.find((m) => !m.off?.length)?.cal;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FONT_SANS,
      padding: "36px 36px 64px",
    }}>
      <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Header */}
        <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, letterSpacing: "0.08em",
            textTransform: "uppercase", color: accent, fontFamily: FONT_MONO,
          }}>
            Inbound SDR - CloudTalk
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 30,
            lineHeight: 1.15, margin: 0, letterSpacing: -0.2,
          }}>
            {tab === "current" ? `${monthLabel} SDR Pacing` : `${PREVIOUS_MONTH?.label} SDR Pacing`}
          </h1>
          {tab === "current" ? (
            <div style={{
              color: C.textHint, fontSize: 14, display: "flex", flexWrap: "wrap",
              gap: "6px 14px", fontVariantNumeric: "tabular-nums",
            }}>
              <span>Today <strong style={{ color: C.textMuted, fontWeight: 500 }}>{fmtDate(todayIso)}</strong></span>
              <span>Barcelona <strong style={{ color: C.textMuted, fontWeight: 500 }}>
                {bcnCal ? `${bcnCal.elapsed} of ${bcnCal.total}` : "—"}
              </strong> - Toronto <strong style={{ color: C.textMuted, fontWeight: 500 }}>
                {torCal ? `${torCal.elapsed} of ${torCal.total}` : "—"}
              </strong> working days completed</span>
            </div>
          ) : (
            <div style={{ color: C.textHint, fontSize: 14 }}>
              Month closed - {PREVIOUS_MONTH?.sdrCount} SDRs
              {PREVIOUS_MONTH?.note ? `, ${PREVIOUS_MONTH.note}` : ""}
            </div>
          )}
        </header>

        {/* Tabs */}
        <div style={{
          display: "inline-flex", gap: 4, padding: 4,
          background: C.surfaceAlt, border: `1px solid ${C.border}`,
          borderRadius: 999, alignSelf: "flex-start",
        }}>
          {[
            { key: "current", label: monthLabel || "Current" },
            { key: "previous", label: PREVIOUS_MONTH?.label || "Previous" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                fontFamily: FONT_SANS, fontSize: 13.5, fontWeight: tab === t.key ? 600 : 500,
                color: tab === t.key ? C.text : C.textMuted,
                background: tab === t.key ? C.surface : "transparent",
                border: "none", borderRadius: 999, padding: "7px 16px", cursor: "pointer",
                boxShadow: tab === t.key ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "current" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Team */}
            <OfficeSection
              label="Whole team"
              sub={`${roster.length} SDRs - Barcelona ${bcnMembers.length} + Toronto ${torMembers.length}`}
              members={roster}
              actuals={actuals}
            />
            {/* Barcelona */}
            <OfficeSection
              label="Barcelona"
              sub={`EMEA - ${bcnMembers.length} SDRs - ${offices?.BCN?.workingDays || "?"} working days`}
              members={bcnMembers}
              actuals={actuals}
            />
            {/* Toronto */}
            <OfficeSection
              label="Toronto"
              sub={`NA - ${torMembers.length} SDRs - ${offices?.TOR?.workingDays || "?"} working days`}
              members={torMembers}
              actuals={actuals}
            />
          </div>
        ) : (
          <SeptemberView />
        )}

        {/* Footer */}
        <footer style={{
          borderTop: `1px solid ${C.border}`, paddingTop: 18,
          display: "flex", flexDirection: "column", gap: 8,
          fontSize: 13, color: C.textHint, maxWidth: "62ch",
        }}>
          <p style={{ margin: 0 }}>
            Target = each SDR's daily rate x their own working days this month.
            Pacing compares what's been booked to what's expected after the working days completed so far;
            the marker on each bar is where "expected today" sits. Today counts as a day still to be worked.
          </p>
          <p style={{ margin: 0 }}>
            <StatusPill tier="ok" label="On pace" small />{" "}100% or more of expected{" - "}
            <StatusPill tier="mid" label="Slightly behind" small />{" "}80-99%{" - "}
            <StatusPill tier="low" label="Needs attention" small />{" "}below 80%.
          </p>
        </footer>
      </div>
    </div>
  );
}
