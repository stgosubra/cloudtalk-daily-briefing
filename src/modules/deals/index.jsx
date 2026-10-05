// Deals - module 07.
//
// Every deal created this calendar month where Santiago is the deal creator, laid
// out by what the AE did with it. Left to right the four columns are the deal's
// actual journey - Upcoming, Awaiting decision, Accepted, Rejected - so a column
// that is filling up says where the month is stuck before you read a number.
//
// The one number this module exists to surface is the breach count: an AE has 48h
// from the demo to accept or reject, and past that the deal is sitting. Breach is
// derived here from ageH vs slaHours, never read off a stored flag.
//
// Data comes from data.js (machine-generated). Everything else - segment labels,
// the SLA, the column order - comes from deals.config.js.

import { useMemo, useState } from "react";
import { DEALS } from "./data.js";
import {
  COLUMNS, OUTCOME_LEVEL, SEG_LABEL, SLA_HOURS, MONTHLY_TARGET_EUR,
} from "../../deals.config.js";
import {
  Page, PageHeader, Card, SectionLabel, Stat, StatRow, StatusDot, Badge, Glyph,
  DataList, DataRow, TabBar, ProgressBar, Empty,
} from "../../design/ui.jsx";
import { C, R, T, TRACK, NUM, SEMANTIC, FONT_SANS, FONT_MONO } from "../../lib/tokens.js";

// --------------------------------------------------------------------------
// formatting
// --------------------------------------------------------------------------

const eur = (n) => (n == null ? "-" : `€${Math.round(n).toLocaleString("en-GB")}`);

// Cents matter on these - a €269.50 MRR total printed as "€269.5" reads like a
// rounding artefact rather than a figure, so a fractional amount always shows
// both decimal places and a whole one shows none.
const eurPrecise = (n) =>
  n == null
    ? "-"
    : `€${n.toLocaleString("en-GB", {
        minimumFractionDigits: n % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      })}`;

const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);

// Hours as a human duration. Under two days reads in hours because that is the
// unit the SLA is written in; past that, days are easier to hold in your head.
function dur(h) {
  if (h == null) return "-";
  const a = Math.abs(h);
  if (a < 1) return `${Math.round(a * 60)}m`;
  if (a < 48) return `${a < 10 ? String(+a.toFixed(1)) : Math.round(a)}h`;
  return `${Math.round(a / 24)}d`;
}

function dayLabel(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function timeLabel(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid",
  });
}

const initials = (name) =>
  (name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// --------------------------------------------------------------------------
// derivation
// --------------------------------------------------------------------------

// Breaching is computed, not stored. A `breaching` flag on the payload would be a
// second source of truth that goes wrong the moment the clock moves past it.
const isBreaching = (d, slaHours) => d.outcome === "pending" && d.ageH > slaHours;

// The clock line under each card. Each column is racing a different clock, so one
// shared field would be a lie in three of the four.
function clockFor(d, slaHours, now) {
  switch (d.outcome) {
    case "upcoming": {
      const h = d.demoAt ? (new Date(d.demoAt) - now) / 3600000 : null;
      if (h == null) return { text: "No demo booked", level: "warn" };
      if (h < 0) return { text: "Demo time passed, not yet held", level: "warn" };
      return { text: `Demo in ${dur(h)}`, level: "idle" };
    }
    case "pending": {
      const over = d.ageH - slaHours;
      if (over > 0) return { text: `${dur(over)} past the ${slaHours}h SLA`, level: "risk" };
      return { text: `${dur(d.ageH)} of ${slaHours}h`, level: "warn" };
    }
    case "accepted":
      return { text: `Accepted in ${dur(d.ageH)}`, level: "ok" };
    case "rejected":
      return { text: `Rejected after ${dur(d.ageH)}`, level: "risk" };
    default:
      return { text: "", level: "idle" };
  }
}

// --------------------------------------------------------------------------
// DealCard
// --------------------------------------------------------------------------

function DealCard({ d, slaHours, now }) {
  const [hover, setHover] = useState(false);
  const breach = isBreaching(d, slaHours);
  const clock = clockFor(d, slaHours, now);
  const level = breach ? "risk" : OUTCOME_LEVEL[d.outcome];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.022)",
        border: `1px solid ${breach ? SEMANTIC.risk.border : C.border}`,
        borderRadius: R.lg,
        padding: 13,
        transition: "background 120ms ease, border-color 120ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Glyph level={level} size={28}>{initials(d.name)}</Glyph>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            font: `500 ${T.body}px/1.3 ${FONT_SANS}`,
            color: C.text, letterSpacing: TRACK.tight,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {d.name}
          </div>
          <div style={{
            font: `400 ${T.micro}px/1.3 ${FONT_SANS}`, color: C.textHint, marginTop: 3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {d.ae}
          </div>
        </div>
        <div style={{
          font: `600 ${T.bodyLg}px/1 ${FONT_SANS}`, color: C.text,
          letterSpacing: TRACK.tight, ...NUM,
        }}>
          {eur(d.amt)}
        </div>
      </div>

      {d.demoAt && (
        <div style={{
          font: `400 ${T.micro}px/1 ${FONT_MONO}`, color: C.textFaint, marginTop: 11,
        }}>
          {dayLabel(d.demoAt)} · {timeLabel(d.demoAt)}
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginTop: d.demoAt ? 9 : 11,
      }}>
        <StatusDot level={clock.level} />
        <span style={{ font: `400 ${T.micro}px/1 ${FONT_SANS}`, color: SEMANTIC[clock.level].fill }}>
          {clock.text}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ font: `400 ${T.label}px/1 ${FONT_SANS}`, color: C.textFaint }}>
          {SEG_LABEL[d.seg]}
        </span>
      </div>

      {d.outcome === "pending" && (
        <ProgressBar
          pct={(d.ageH / slaHours) * 100}
          level={breach ? "risk" : "warn"}
          height={3}
          style={{ marginTop: 10 }}
        />
      )}

      {d.ns !== "ok" && (
        <div style={{ marginTop: 10 }}>
          <Badge level={d.ns === "noshow" ? "risk" : "warn"}>
            {d.ns === "noshow" ? "No show" : "Rescheduled"}
          </Badge>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Column
// --------------------------------------------------------------------------

function Column({ col, deals, slaHours, now }) {
  const level = OUTCOME_LEVEL[col.id];
  const amt = sum(deals, (d) => d.amt);
  const breaches = deals.filter((d) => isBreaching(d, slaHours)).length;

  return (
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        paddingBottom: 10,
        borderBottom: `1px solid ${breaches ? SEMANTIC.risk.border : C.border}`,
      }}>
        <StatusDot level={breaches ? "risk" : level} />
        <span style={{
          font: `500 ${T.micro}px/1 ${FONT_SANS}`,
          letterSpacing: TRACK.label, textTransform: "uppercase",
          color: C.textMid,
        }}>
          {col.label}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ font: `600 ${T.body}px/1 ${FONT_SANS}`, color: C.text, ...NUM }}>
          {deals.length}
        </span>
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8,
        padding: "9px 0 14px",
      }}>
        <span style={{ font: `400 ${T.label}px/1.4 ${FONT_SANS}`, color: C.textFaint }}>
          {col.hint}
        </span>
        <span style={{
          font: `500 ${T.micro}px/1 ${FONT_SANS}`, color: C.textMuted, ...NUM,
          whiteSpace: "nowrap",
        }}>
          {eur(amt)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {deals.length === 0 ? (
          <div style={{
            border: `1px dashed ${C.border}`, borderRadius: R.lg,
            padding: "22px 13px", textAlign: "center",
            font: `400 ${T.micro}px/1 ${FONT_SANS}`, color: C.textFaint,
          }}>
            Nothing here
          </div>
        ) : (
          deals.map((d) => <DealCard key={d.id} d={d} slaHours={slaHours} now={now} />)
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// By AE
// --------------------------------------------------------------------------
// Acceptance rate counts only deals the AE has actually ruled on. Deals still
// upcoming or pending stay outside the denominator, because an undecided deal is
// not a rejection - folding them in would make a fast AE with a full queue look
// worse than a slow one with an empty one.

const AE_COLS = "1fr 64px 64px 96px 92px 118px";

function byAe(deals, slaHours) {
  const map = new Map();
  for (const d of deals) {
    if (!map.has(d.ae)) {
      map.set(d.ae, { ae: d.ae, all: [], accepted: [], rejected: [], open: [], breaching: [] });
    }
    const r = map.get(d.ae);
    r.all.push(d);
    if (d.outcome === "accepted") r.accepted.push(d);
    else if (d.outcome === "rejected") r.rejected.push(d);
    else r.open.push(d);
    if (isBreaching(d, slaHours)) r.breaching.push(d);
  }
  return [...map.values()]
    .map((r) => {
      const decided = [...r.accepted, ...r.rejected];
      return {
        ...r,
        rate: decided.length ? r.accepted.length / decided.length : null,
        medianH: decided.length
          ? decided.map((d) => d.ageH).sort((a, b) => a - b)[Math.floor(decided.length / 2)]
          : null,
        accAmt: sum(r.accepted, (d) => d.amt),
      };
    })
    .sort((a, b) => b.all.length - a.all.length || a.ae.localeCompare(b.ae));
}

function AeTab({ deals, slaHours }) {
  const rows = useMemo(() => byAe(deals, slaHours), [deals, slaHours]);

  if (!rows.length) return <Empty level="idle">No deals created this month yet.</Empty>;

  return (
    <Card label="Acceptance by AE" pad={18}>
      <div style={{
        display: "grid", gridTemplateColumns: AE_COLS, gap: 12,
        padding: "0 8px 9px", margin: "0 -8px",
        borderBottom: `1px solid ${C.border}`,
        font: `500 ${T.label}px/1 ${FONT_SANS}`,
        letterSpacing: TRACK.label, textTransform: "uppercase", color: C.textFaint,
      }}>
        <span>AE</span>
        <span style={{ textAlign: "right" }}>Deals</span>
        <span style={{ textAlign: "right" }}>Open</span>
        <span style={{ textAlign: "right" }}>Accepted</span>
        <span style={{ textAlign: "right" }}>Median call</span>
        <span style={{ textAlign: "right" }}>Acceptance</span>
      </div>

      <DataList style={{ borderTop: "none" }}>
        {rows.map((r, i) => (
          <DataRow
            key={r.ae}
            last={i === rows.length - 1}
            style={{ display: "grid", gridTemplateColumns: AE_COLS, gap: 12 }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Glyph level={r.breaching.length ? "risk" : "idle"} size={26}>{initials(r.ae)}</Glyph>
              <span style={{
                font: `400 ${T.body}px/1 ${FONT_SANS}`, color: C.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {r.ae}
              </span>
            </span>
            <span style={{ textAlign: "right", font: `400 ${T.body}px/1 ${FONT_SANS}`, color: C.textMid, ...NUM }}>
              {r.all.length}
            </span>
            <span style={{
              textAlign: "right", font: `400 ${T.body}px/1 ${FONT_SANS}`, ...NUM,
              color: r.breaching.length ? SEMANTIC.risk.fill : C.textMuted,
            }}>
              {r.open.length}
            </span>
            <span style={{ textAlign: "right", font: `400 ${T.body}px/1 ${FONT_SANS}`, color: C.textMid, ...NUM }}>
              {eur(r.accAmt)}
            </span>
            <span style={{ textAlign: "right", font: `400 ${T.body}px/1 ${FONT_MONO}`, color: C.textMuted, ...NUM }}>
              {dur(r.medianH)}
            </span>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 9 }}>
              {r.rate == null ? (
                <span style={{ font: `400 ${T.micro}px/1 ${FONT_SANS}`, color: C.textFaint }}>
                  no ruling yet
                </span>
              ) : (
                <>
                  <ProgressBar
                    pct={r.rate * 100}
                    level={r.rate >= 0.7 ? "ok" : r.rate >= 0.4 ? "warn" : "risk"}
                    height={3}
                    style={{ width: 46 }}
                  />
                  <span style={{ font: `500 ${T.body}px/1 ${FONT_SANS}`, color: C.text, ...NUM }}>
                    {Math.round(r.rate * 100)}%
                  </span>
                </>
              )}
            </span>
          </DataRow>
        ))}
      </DataList>

      <div style={{
        font: `400 ${T.label}px/1.5 ${FONT_SANS}`, color: C.textFaint,
        marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.divider}`,
      }}>
        Acceptance counts only deals the AE has ruled on; open deals sit outside the
        denominator. Median call is the time from demo to ruling.
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------
// Module
// --------------------------------------------------------------------------

export default function DealsModule() {
  const [tab, setTab] = useState("board");
  const now = useMemo(() => new Date(), []);

  const slaHours = DEALS.slaHours || SLA_HOURS;
  const target = DEALS.target || MONTHLY_TARGET_EUR;
  const deals = DEALS.deals || [];

  const grouped = useMemo(() => {
    const g = Object.fromEntries(COLUMNS.map((c) => [c.id, []]));
    for (const d of deals) (g[d.outcome] ||= []).push(d);
    // Within a column, the most urgent clock goes first.
    for (const id of Object.keys(g)) {
      g[id].sort((a, b) =>
        id === "upcoming"
          ? new Date(a.demoAt || 0) - new Date(b.demoAt || 0)
          : b.ageH - a.ageH);
    }
    return g;
  }, [deals]);

  const accepted = grouped.accepted || [];
  const acceptedAmt = sum(accepted, (d) => d.amt);
  const acceptedPts = sum(accepted, (d) => d.pts);
  const breaching = deals.filter((d) => isBreaching(d, slaHours));
  const breachAmt = sum(breaching, (d) => d.amt);
  const pct = target ? (acceptedAmt / target) * 100 : 0;

  // Where the month should be by now, so the bar has something to be behind of.
  const monthPace = useMemo(() => {
    const start = new Date(DEALS.monthStart);
    const today = new Date(DEALS.todayIso);
    if (isNaN(start) || isNaN(today)) return null;
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    return Math.min(100, (today.getDate() / daysInMonth) * 100);
  }, []);

  const behind = monthPace != null && pct < monthPace * 0.75;

  return (
    <Page>
      <PageHeader
        num="07 · Deals"
        title={DEALS.monthLabel || "This month"}
        sub="Every deal I created this month, and what the AE did with it. The clock starts at the demo."
        right={
          <TabBar
            value={tab}
            onChange={setTab}
            tabs={[{ id: "board", label: "Board" }, { id: "ae", label: "By AE" }]}
          />
        }
      />

      <StatRow>
        <Stat
          label="Created"
          value={deals.length}
          note={`${acceptedPts} of ${DEALS.pointsQuota} points accepted`}
        />
        <Stat
          label="Accepted MRR"
          value={eurPrecise(acceptedAmt)}
          note={`${Math.round(pct)}% of the ${eur(target)} run-rate line`}
          noteLevel={behind ? "warn" : undefined}
          right={
            <span style={{ font: `400 ${T.label}px/1 ${FONT_SANS}`, color: C.textFaint, ...NUM }}>
              {accepted.length} deal{accepted.length === 1 ? "" : "s"}
            </span>
          }
        />
        <Stat
          label={`Breaching ${slaHours}h`}
          value={breaching.length}
          note={breaching.length ? "AE has not ruled past the SLA" : "every ruling inside the SLA"}
          noteLevel={breaching.length ? "risk" : "ok"}
        />
        <Stat
          label="MRR in breach"
          value={eur(breachAmt)}
          note={breaching.length ? `across ${breaching.length} deal${breaching.length === 1 ? "" : "s"}` : "nothing stuck"}
          noteLevel={breachAmt ? "risk" : undefined}
        />
      </StatRow>

      <div style={{ marginTop: 16 }}>
        <ProgressBar pct={pct} level={behind ? "warn" : "ok"} marker={monthPace} />
        <div style={{
          display: "flex", justifyContent: "space-between", marginTop: 7,
          font: `400 ${T.label}px/1 ${FONT_SANS}`, color: C.textFaint,
        }}>
          <span>{DEALS.monthStart}</span>
          <span>marker shows where the month should be today</span>
          <span>{eur(target)}</span>
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        {tab === "board" ? (
          deals.length === 0 ? (
            <Empty level="idle">No deals created this month yet.</Empty>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(0, 1fr))`,
              gap: 18,
              alignItems: "start",
            }}>
              {COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  col={col}
                  deals={grouped[col.id] || []}
                  slaHours={slaHours}
                  now={now}
                />
              ))}
            </div>
          )
        ) : (
          <AeTab deals={deals} slaHours={slaHours} />
        )}
      </div>

      {(DEALS.dataGaps || []).length > 0 && (
        <div style={{ marginTop: 26 }}>
          <SectionLabel>Declared gaps</SectionLabel>
          <ul style={{
            margin: "9px 0 0", padding: "0 0 0 16px",
            font: `400 ${T.micro}px/1.6 ${FONT_SANS}`, color: C.textMuted,
          }}>
            {DEALS.dataGaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}
    </Page>
  );
}
