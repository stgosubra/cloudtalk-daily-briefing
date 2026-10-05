import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { C, FONT_SANS, FONT_MONO, FONT_DISPLAY } from "../../lib/palette.js";
import { DEMOS, GENERATED_AT } from "./data.js";
import { SEG_LABEL } from "../../demos.config.js";

// ─── Design tokens (amber family) ──────────────────────────────────────────
const accent = C.amber;
const accentBg = C.amberBg;
const accentBorder = C.amberBorder;

const segColor = { micro: "#8495ff", smb: "#4d82ff", mm: "#1a56ff", none: C.border };
const statusColor = { ok: C.emerald, noshow: C.red, rescheduled: C.amber, won: C.emerald, lost: C.textHint };

const eur = (n) => "€" + Math.round(n || 0).toLocaleString("en-US");

// ─── Date helpers ───────────────────────────────────────────────────────────
function keyToDate(k) { const [y, m, d] = k.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function addDays(k, n) { const d = keyToDate(k); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function dow(k) { return keyToDate(k).getUTCDay(); }
function mondayOf(k) { return addDays(k, -((dow(k) + 6) % 7)); }
function fmtDay(k) {
  const d = keyToDate(k);
  return d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }) + " " +
    d.getUTCDate() + " " + d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
}
function fmtRange(k) {
  const a = keyToDate(k), b = keyToDate(addDays(k, 6));
  return a.getUTCDate() + " " + a.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) +
    " - " + b.getUTCDate() + " " + b.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
}
function inWeek(r, mon) { return r.key >= mon && r.key <= addDays(mon, 6); }
function pastWorkingDays(today, n) {
  let k = addDays(today, -1); const out = [];
  while (out.length < n) { const d = dow(k); if (d !== 0 && d !== 6) out.unshift(k); k = addDays(k, -1); }
  return out;
}
function futureWorkingDays(today, n) {
  let k = today; const out = []; let shown = 0;
  const mon = mondayOf(today);
  while (shown < n) { const d = dow(k); if (d !== 0 && d !== 6) { out.push(k); shown++; } k = addDays(k, 1); }
  return out;
}

// ─── Compute helpers ────────────────────────────────────────────────────────
function sum(rows, f) { return rows.reduce((s, r) => s + (f(r) || 0), 0); }
function segRows(rows) {
  const by = { micro: [], smb: [], mm: [], none: [] };
  rows.forEach((r) => by[r.seg].push(r));
  return by;
}

// ─── SegmentStack ───────────────────────────────────────────────────────────
function SegmentStack({ rows, height = 14 }) {
  const total = rows.length || 1;
  const by = segRows(rows);
  return (
    <div style={{ display: "flex", height, borderRadius: height / 2, overflow: "hidden", gap: 2, background: C.surfaceAlt }}>
      {["micro", "smb", "mm", "none"].map((k) =>
        by[k].length ? (
          <span key={k} style={{ display: "block", height: "100%", width: `${(by[k].length / total) * 100}%`, background: segColor[k] }} />
        ) : null,
      )}
    </div>
  );
}

function SegmentLegend() {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: C.textMuted }}>
      {[["micro", "Micro < €500"], ["smb", "SMB €500-1,500"], ["mm", "Mid-Market > €1,500"]].map(([k, l]) => (
        <span key={k}><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 6, verticalAlign: -1, background: segColor[k] }} />{l}</span>
      ))}
    </div>
  );
}

// ─── Pill ───────────────────────────────────────────────────────────────────
function Pill({ type, children }) {
  const styles = {
    seg: { bg: C.surfaceAlt, color: C.textMuted, border: C.border },
    ns: { bg: C.redBg, color: C.red, border: C.redBorder },
    rs: { bg: C.amberBg, color: C.amber, border: C.amberBorder },
    slow: { bg: C.amberBg, color: C.amber, border: C.amberBorder },
    fast: { bg: C.surfaceAlt, color: C.textMuted, border: C.border },
    lost: { bg: C.surfaceAlt, color: C.textMuted, border: C.border },
    won: { bg: C.emeraldBg || "rgba(71,205,137,0.12)", color: C.emerald, border: "transparent" },
  };
  const s = styles[type] || styles.seg;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600,
      padding: "2px 8px", borderRadius: 999, border: `1px solid ${s.border}`,
      background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// ─── HeroTile ───────────────────────────────────────────────────────────────
function HeroTile({ label, count, suffix, children, lead }) {
  return (
    <div style={{
      background: lead ? `linear-gradient(180deg, ${accentBg}, ${C.surface} 70%)` : C.surface,
      border: `1px solid ${lead ? accentBorder : C.border}`, borderRadius: 14,
      padding: "18px 20px", minWidth: 0,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textHint, fontFamily: FONT_MONO, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 44, lineHeight: 1, fontWeight: 600, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums" }}>
        {count}{suffix && <small style={{ fontSize: 18, fontWeight: 500, color: C.textMuted, letterSpacing: 0, marginLeft: 6 }}>{suffix}</small>}
      </div>
      {children}
    </div>
  );
}

function KV({ label, value, warn, title }) {
  return (
    <div style={{ minWidth: 0 }} title={title}>
      <div style={{ fontSize: 11.5, color: C.textHint }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: warn ? C.amber : C.text }}>{value}</div>
    </div>
  );
}


// ─── HorizonDay ─────────────────────────────────────────────────────────────
function HorizonDay({ k, rows, isToday, isPast, isSelected, onClick }) {
  const dd = keyToDate(k);
  const m = sum(rows, (r) => r.amt);
  return (
    <button
      type="button"
      onClick={() => onClick(k)}
      style={{
        border: `1px solid ${isSelected ? accent : C.border}`, background: C.surface, borderRadius: 10,
        padding: "10px 10px 8px", textAlign: "left", display: "flex", flexDirection: "column", gap: 6,
        minWidth: 92, cursor: "pointer", opacity: isPast ? 0.6 : 1, fontFamily: FONT_SANS, color: C.text,
        boxShadow: isSelected ? `inset 0 0 0 1px ${accent}` : "none",
      }}
    >
      <span style={{ fontSize: 11.5, color: C.textHint, fontWeight: 600, whiteSpace: "nowrap" }}>
        <b style={{ fontWeight: 600, color: isToday ? accent : C.textMuted, marginRight: 4 }}>
          {dd.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}
        </b>
        {dd.getUTCDate()} {dd.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}
      </span>
      <span style={{ fontSize: 24, fontWeight: 600, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: rows.length ? C.text : C.textHint }}>{rows.length}</span>
      <span style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>{rows.length ? eur(m) : "—"}</span>
      <SegmentStack rows={rows} height={5} />
    </button>
  );
}

// ─── SegmentBreakdown ───────────────────────────────────────────────────────
function SegmentBreakdown({ rows, label }) {
  const by = segRows(rows);
  const max = Math.max(...["micro", "smb", "mm", "none"].map((k) => by[k].length), 1);
  const segs = ["micro", "smb", "mm"].concat(by.none.length ? ["none"] : []);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textHint, fontFamily: FONT_MONO, marginBottom: 8 }}>
        By segment - {label}
      </div>
      <SegmentStack rows={rows} />
      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        {segs.map((k) => (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "96px 1fr auto auto", gap: 10, alignItems: "center", fontSize: 13 }}>
            <span>{SEG_LABEL[k]}</span>
            <div style={{ height: 8, borderRadius: 4, background: C.surfaceAlt, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${(by[k].length / max) * 100}%`, borderRadius: 4, background: segColor[k] }} />
            </div>
            <span style={{ fontWeight: 600, minWidth: "2ch", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{by[k].length}</span>
            <span style={{ color: C.textMuted, minWidth: "7ch", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{eur(sum(by[k], (r) => r.amt))}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}><SegmentLegend /></div>
    </div>
  );
}


// ─── WeekByWeek ─────────────────────────────────────────────────────────────
function WeekByWeek({ allRows, today, selected, onSelect }) {
  const mon = mondayOf(today);
  const PAST = 4, AHEAD = 5;
  const weeks = [];
  for (let i = PAST + 1; i >= 1; i--) weeks.push({ mon: addDays(mon, -7 * i), past: true });
  for (let i = 0; i < AHEAD; i++) weeks.push({ mon: addDays(mon, i * 7), past: false });

  const stats = weeks.map((w) => {
    const rows = allRows.filter((r) => inWeek(r, w.mon));
    const held = rows.filter((r) => r.ns !== "noshow");
    return { ...w, rows, n: rows.length, held: held.length, m: sum(rows, (r) => r.amt), mHeld: sum(held, (r) => r.amt) };
  });

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", minWidth: 0 }}>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        Week by week <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 12.5 }}>Mon-Sun - past weeks show held demos</span>
      </h3>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textHint, padding: "6px 2px 0" }}>Past weeks</div>
        {stats.filter((w) => w.past).slice(1).map((w, i, arr) => {
          const prev = i === 0 ? stats.find((s) => s.mon === weeks[0].mon) : arr[i - 1];
          const isCur = w.mon === mon;
          const sel = `week:${w.mon}`;
          const label = i === arr.length - 1 ? "Last week" : `${arr.length - i} weeks ago`;
          return (
            <button
              key={w.mon}
              onClick={() => onSelect(sel)}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center",
                padding: "10px 12px", border: `1px solid ${selected === sel ? accent : C.border}`, borderRadius: 10,
                background: selected === sel ? accentBg : C.surface, cursor: "pointer", textAlign: "left",
                fontFamily: FONT_SANS, color: C.text, opacity: 0.85,
              }}
            >
              <span style={{ fontWeight: 500 }}>
                {label}<small style={{ display: "block", color: C.textMuted, fontWeight: 400, fontSize: 12 }}>{fmtRange(w.mon)}</small>
              </span>
              <span style={{ fontSize: 20, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {w.n}<small style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, display: "block" }}>demos</small>
              </span>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {eur(w.m)}<br /><small style={{ color: C.textMuted }}>{eur(w.mHeld)} held</small>
              </span>
            </button>
          );
        })}
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textHint, padding: "6px 2px 0" }}>This week & ahead</div>
        {stats.filter((w) => !w.past).map((w, i) => {
          const isCur = i === 0;
          const sel = `week:${w.mon}`;
          const label = i === 0 ? "This week" : i === 1 ? "Next week" : `In ${i} weeks`;
          return (
            <button
              key={w.mon}
              onClick={() => onSelect(sel)}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center",
                padding: "10px 12px", border: `1px solid ${selected === sel ? accent : isCur ? accentBorder : C.border}`,
                borderRadius: 10, background: isCur ? accentBg : (selected === sel ? accentBg : C.surface),
                cursor: "pointer", textAlign: "left", fontFamily: FONT_SANS, color: C.text,
              }}
            >
              <span style={{ fontWeight: 500 }}>
                {label}<small style={{ display: "block", color: C.textMuted, fontWeight: 400, fontSize: 12 }}>{fmtRange(w.mon)}</small>
              </span>
              <span style={{ fontSize: 20, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {w.n}<small style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, display: "block" }}>demos</small>
              </span>
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{eur(w.m)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── HistoryChart ───────────────────────────────────────────────────────────
function HistoryChart({ allRows, today, selected, onSelect }) {
  const [mode, setMode] = useState("days");
  const days = useMemo(() => {
    if (mode === "weeks") {
      const mon = mondayOf(today);
      const out = [];
      for (let i = 8; i >= 1; i--) out.push(addDays(mon, -7 * i));
      return out;
    }
    return pastWorkingDays(today, 20);
  }, [today, mode]);

  const per = useMemo(() => days.map((k) => {
    const rows = mode === "weeks"
      ? allRows.filter((r) => inWeek(r, k))
      : allRows.filter((r) => r.key === k);
    return {
      k, sel: mode === "weeks" ? `week:${k}` : k, rows, n: rows.length,
      ns: rows.filter((r) => r.ns === "noshow").length,
      lost: rows.filter((r) => r.ns !== "noshow" && r.closed === "lost").length,
      won: rows.filter((r) => r.ns !== "noshow" && r.closed === "won").length,
      m: sum(rows, (r) => r.amt),
    };
  }), [days, allRows, mode]);

  const all = per.flatMap((d) => d.rows);
  const tot = all.length;
  const nsCount = all.filter((r) => r.ns === "noshow").length;
  const accCount = all.filter((r) => r.acc === "true").length;
  const max = Math.max(...per.map((d) => d.n), 1);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, margin: 0 }}>
          {mode === "days" ? "Last twenty working days" : "Last eight weeks"}
        </h2>
        <div style={{ display: "inline-flex", gap: 4, padding: 4, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 999 }}>
          {[["days", "20 days"], ["weeks", "8 weeks"]].map(([v, l]) => (
            <button key={v} onClick={() => setMode(v)} style={{
              fontFamily: FONT_SANS, fontSize: 13, fontWeight: mode === v ? 600 : 500,
              color: mode === v ? C.text : C.textMuted, background: mode === v ? C.surface : "transparent",
              border: "none", borderRadius: 999, padding: "5px 11px", cursor: "pointer",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 14 }}>
        <KV label="Demos booked" value={<>{tot}<small style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, marginLeft: 4 }}>{(tot / (days.length || 1)).toFixed(1)} / {mode === "weeks" ? "week" : "day"}</small></>} />
        <KV label="MRR booked" value={eur(sum(all, (r) => r.amt))} />
        <KV label="Flagged no-show" value={<>{nsCount}<small style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, marginLeft: 4 }}>{tot ? Math.round((nsCount / tot) * 100) : 0}%</small></>} />
      </div>

      {/* Bar chart */}
      <div style={{
        display: "grid", gridAutoFlow: "column", gridTemplateRows: "100%",
        gridAutoColumns: "minmax(0, 1fr)", gap: 6, alignItems: "end", height: 170,
        paddingTop: 18, borderBottom: `1px solid ${C.border}`, overflowX: "auto",
      }}>
        {per.map((d) => {
          const held = d.n - d.ns - d.lost - d.won;
          const isSel = d.sel === selected;
          return (
            <button
              key={d.k}
              onClick={() => onSelect(d.sel)}
              style={{
                display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "stretch",
                height: "100%", border: "none", background: "none", padding: 0, cursor: "pointer",
                position: "relative", borderRadius: 4, fontFamily: FONT_SANS, color: C.text,
                outline: isSel ? `1px solid ${accent}` : "none", outlineOffset: isSel ? -1 : 0,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center", marginBottom: 3, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {d.n || ""}<small style={{ display: "block", fontWeight: 500, color: C.textMuted, fontSize: 10, marginTop: 2 }}>{d.n ? eur(d.m) : ""}</small>
              </span>
              <span style={{
                display: "flex", flexDirection: "column", gap: 2, borderRadius: "4px 4px 0 0", overflow: "hidden",
                height: `${(d.n / max) * 100}%`, minHeight: d.n ? 4 : 0,
              }}>
                {d.lost > 0 && <span style={{ flex: d.lost, background: C.textHint }} />}
                {d.ns > 0 && <span style={{ flex: d.ns, background: C.amber }} />}
                {held > 0 && <span style={{ flex: held, background: C.blue }} />}
                {d.won > 0 && <span style={{ flex: d.won, background: C.emerald }} />}
              </span>
            </button>
          );
        })}
      </div>

      {/* X-axis */}
      <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(0, 1fr)", gap: 6, marginTop: 6, overflow: "hidden" }}>
        {per.map((d) => {
          const dd = keyToDate(d.k);
          return (
            <span key={d.k} style={{ fontSize: 10.5, color: C.textMuted, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {mode === "weeks" ? (
                <><b style={{ display: "block", fontWeight: 600, color: C.textMuted }}>{dd.getUTCDate()} {dd.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</b></>
              ) : (
                <><b style={{ display: "block", fontWeight: 600, color: C.textMuted }}>{dd.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).slice(0, 2)}</b>{dd.getUTCDate()}</>
              )}
            </span>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 12.5, color: C.textMuted }}>
        {[["Won", C.emerald], ["Held", C.blue], ["No-show", C.amber], ["Lost", C.textHint]].map(([l, c]) => (
          <span key={l}><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 6, verticalAlign: -1, background: c }} />{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── DemoTable ──────────────────────────────────────────────────────────────
function DemoTable({ rows, label }) {
  const thStyle = {
    fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: C.textHint,
    textAlign: "left", padding: "10px 10px", borderBottom: `1px solid ${C.border}`, fontWeight: 600,
    whiteSpace: "nowrap", fontFamily: FONT_MONO,
  };
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 14, background: C.surface }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontVariantNumeric: "tabular-nums", fontFamily: FONT_SANS }}>
        <thead>
          <tr>
            <th style={thStyle}>Time</th>
            <th style={thStyle}>Deal</th>
            <th style={thStyle}>Segment</th>
            <th style={{ ...thStyle, textAlign: "right" }}>MRR</th>
            <th style={thStyle}>Country</th>
            <th style={thStyle}>Speed</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr><td colSpan={7} style={{ padding: 26, color: C.textMuted, textAlign: "center", borderBottom: "none" }}>No demos for this period.</td></tr>
          )}
          {rows.map((r, i) => {
            const tdBase = { padding: "8px 10px", borderBottom: i === rows.length - 1 ? "none" : `1px solid ${C.border}`, verticalAlign: "middle", whiteSpace: "nowrap", color: r.inPlay ? C.text : C.textMuted };
            return (
              <tr key={r.id}>
                <td style={{ ...tdBase, fontWeight: 600 }}>{r.time}</td>
                <td style={{ ...tdBase, whiteSpace: "normal", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.url ? <a href={r.url} target="_blank" rel="noopener" style={{ color: r.inPlay ? C.text : C.textMuted, textDecoration: r.inPlay ? "none" : "line-through" }}>{r.name}</a> : r.name}
                </td>
                <td style={tdBase}><Pill type="seg"><i style={{ width: 8, height: 8, borderRadius: 2, display: "inline-block", background: segColor[r.seg] }} />{SEG_LABEL[r.seg]}</Pill></td>
                <td style={{ ...tdBase, textAlign: "right" }}>{r.amt != null ? eur(r.amt) : "—"}</td>
                <td style={tdBase}>{r.country || "—"}</td>
                <td style={tdBase}>
                  {r.speedH == null ? <Pill type="fast">n/a</Pill> : r.slow ? <Pill type="slow">Slow - {Math.round(r.speedH)}h</Pill> : <Pill type="fast">Fast - {Math.round(r.speedH)}h</Pill>}
                </td>
                <td style={tdBase}>
                  {r.ns === "noshow" && <Pill type="ns">No-show</Pill>}
                  {r.ns === "rescheduled" && <Pill type="rs">Rescheduled</Pill>}
                  {r.closed === "lost" && <> <Pill type="lost">Lost</Pill></>}
                  {r.closed === "won" && <> <Pill type="won">Won</Pill></>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── SegButton ─────────────────────────────────────────────────────────────
function SegButton({ label, value, active, onClick, dotColor }) {
  return (
    <button
      onClick={() => onClick(value)}
      style={{
        border: "none", background: active ? accent : "transparent", borderRadius: 4,
        padding: "5px 11px", fontSize: 13, fontWeight: 500, cursor: "pointer",
        color: active ? "#fff" : C.textMuted, fontFamily: FONT_SANS,
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {dotColor && <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: dotColor, outline: active ? "1px solid rgba(255,255,255,0.6)" : "none" }} />}
      {label}
    </button>
  );
}


// ─── Main module ────────────────────────────────────────────────────────────
export default function DemosModule() {
  const { todayIso, demos } = DEMOS;
  const [selected, setSelected] = useState(todayIso);
  const [filt, setFilt] = useState({ seg: "ALL" });

  const filtered = useMemo(() => demos.filter((r) =>
    (filt.seg === "ALL" || r.seg === filt.seg),
  ), [demos, filt]);

  const scopeRows = useMemo(() => {
    if (!selected) return [];
    if (selected.startsWith("week:")) {
      const mon = selected.slice(5);
      return filtered.filter((r) => inWeek(r, mon));
    }
    return filtered.filter((r) => r.key === selected);
  }, [filtered, selected]);

  const scopeLabel = useMemo(() => {
    if (!selected) return "";
    if (selected.startsWith("week:")) return "week of " + fmtRange(selected.slice(5));
    return selected === todayIso ? "today" : fmtDay(selected);
  }, [selected, todayIso]);

  const todayRows = useMemo(() => filtered.filter((r) => r.key === todayIso), [filtered, todayIso]);
  const mon = mondayOf(todayIso);
  const weekRows = useMemo(() => filtered.filter((r) => inWeek(r, mon)), [filtered, mon]);
  const nextWeekRows = useMemo(() => filtered.filter((r) => inWeek(r, addDays(mon, 7))), [filtered, mon]);

  const horizonDays = useMemo(() => futureWorkingDays(todayIso, 15), [todayIso]);

  const nsToday = todayRows.filter((r) => r.ns === "noshow");
  const slowToday = todayRows.filter((r) => r.slow && r.inPlay);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FONT_SANS, padding: "24px 24px 64px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textHint, fontFamily: FONT_MONO }}>
              Santiago Subra{filt.seg !== "ALL" ? ` - ${SEG_LABEL[filt.seg]} only` : ""}
            </div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: -0.2 }}>My Demos</h1>
            <div style={{ color: C.textHint, marginTop: 4 }}>Demos booked on my deals, and the MRR riding on them.</div>
          </div>
        </header>

        {/* Segment filter */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textHint }}>Segment</span>
            <div style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: 6, background: C.surface, padding: 2, gap: 2 }}>
              <SegButton label="All" value="ALL" active={filt.seg === "ALL"} onClick={(v) => setFilt({ ...filt, seg: v })} />
              <SegButton label="Micro" value="micro" active={filt.seg === "micro"} onClick={(v) => setFilt({ ...filt, seg: v })} dotColor={segColor.micro} />
              <SegButton label="SMB" value="smb" active={filt.seg === "smb"} onClick={(v) => setFilt({ ...filt, seg: v })} dotColor={segColor.smb} />
              <SegButton label="MM" value="mm" active={filt.seg === "mm"} onClick={(v) => setFilt({ ...filt, seg: v })} dotColor={segColor.mm} />
            </div>
          </div>
          {filt.seg !== "ALL" && (
            <button onClick={() => setFilt({ ...filt, seg: "ALL" })} style={{
              border: "none", background: "none", color: C.textMuted, fontSize: 12.5,
              textDecoration: "underline", padding: "4px 2px", cursor: "pointer", fontFamily: FONT_SANS,
            }}>Reset</button>
          )}
        </div>

        {/* Hero grid */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 16, marginBottom: 18 }}>
          <HeroTile label={`Today - ${fmtDay(todayIso)}`} count={todayRows.length} suffix="demos" lead>
            <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
              <KV label="MRR booked" value={eur(sum(todayRows, (r) => r.amt))} />
              <KV label="Still in play" value={eur(sum(todayRows.filter((r) => r.inPlay), (r) => r.amt))} />
              <KV label="Flagged no-show" value={nsToday.length} warn={nsToday.length > 0} />
              <KV label="Slow-booked >= 48h" value={slowToday.length} warn={slowToday.length > 0} title="Demo booked 48h or more after deal creation - higher no-show risk" />
            </div>
            <div style={{ marginTop: 10 }}><SegmentStack rows={todayRows} /></div>
          </HeroTile>

          <SegmentBreakdown rows={scopeRows} label={scopeLabel} />

          <HeroTile label="This week so far" count={weekRows.length} suffix="demos">
            <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
              <KV label="MRR booked" value={eur(sum(weekRows, (r) => r.amt))} />
              <KV label="Still in play" value={eur(sum(weekRows.filter((r) => r.inPlay), (r) => r.amt))} />
              {(() => {
                let wd = 0;
                for (let i = 0; i < 5; i++) { if (addDays(mon, i) <= todayIso) wd++; }
                return <KV label="Avg / working day" value={wd ? (weekRows.filter((r) => r.key <= todayIso).length / wd).toFixed(1) : "—"} />;
              })()}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 16, flexWrap: "wrap" }}>
              <KV label="Next week booked" value={nextWeekRows.length} />
              <KV label="Next week MRR" value={eur(sum(nextWeekRows, (r) => r.amt))} />
            </div>
          </HeroTile>
        </div>

        {/* Horizon */}
        <section style={{ marginTop: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, margin: 0 }}>Next fifteen working days</h2>
            <span style={{ color: C.textMuted, fontSize: 12.5 }}>Click a day to see who is booked.</span>
          </div>
          <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(104px, 1fr)", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {horizonDays.map((k) => (
              <HorizonDay
                key={k} k={k}
                rows={filtered.filter((r) => r.key === k)}
                isToday={k === todayIso} isPast={k < todayIso}
                isSelected={k === selected} onClick={setSelected}
              />
            ))}
          </div>
        </section>

        {/* Weeks */}
        <section style={{ marginTop: 26, maxWidth: 560 }}>
          <WeekByWeek allRows={filtered} today={todayIso} selected={selected} onSelect={setSelected} />
        </section>

        {/* History */}
        <section style={{ marginTop: 26 }}>
          <HistoryChart allRows={filtered} today={todayIso} selected={selected} onSelect={setSelected} />
        </section>

        {/* Table */}
        <section style={{ marginTop: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, margin: 0 }}>Demos - {scopeLabel}</h2>
            <span style={{ color: C.textMuted, fontSize: 12.5 }}>
              {scopeRows.length ? `${scopeRows.length} demos - ${eur(sum(scopeRows, (r) => r.amt))} MRR booked` : ""}
            </span>
          </div>
          <DemoTable rows={scopeRows} label={scopeLabel} />
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 28, color: C.textHint, fontSize: 12, lineHeight: 1.6, maxWidth: "72ch" }}>
          <p style={{ margin: 0 }}>
            Source: HubSpot deals where deal_creator_team = IB SDR, dated by demo_call__date_time_,
            credited to deal_creator__sdr_only_. Segment brackets on amount_in_home_currency (EUR MRR):
            Micro &lt; €500 - SMB €500-1,500 - Mid-Market &gt; €1,500.
          </p>
          <p style={{ margin: "6px 0 0" }}>
            "Still in play" excludes demos flagged Demo No Show or Demo Not Rescheduled.
            Speed to demo = demo slot minus deal creation, counted in working hours (weekends skipped);
            Slow is 48h or more, Fast under 48h.
          </p>
        </footer>
      </div>
    </div>
  );
}
