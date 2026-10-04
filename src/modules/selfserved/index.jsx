import { useState, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SELFSERVED, isOnboardingAlert, ONBOARD_MIN_DAYS, ONBOARD_MAX_DAYS } from "./data.js";

// ─── Present mode: mask PII (email / phone) for screen-share ──────────────────
const MaskCtx = createContext(false);
const useMasked = () => useContext(MaskCtx);
const MASK = "•••••••";

// ─── Design tokens (mirrors performance module family) ───────────────────────
const C = {
  bg: "#060810",
  surf: "rgba(120,160,255,0.04)",
  surf2: "rgba(120,160,255,0.07)",
  line: "rgba(80,130,255,0.12)",
  line2: "rgba(80,130,255,0.28)",
  blue: "#4d82ff",
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

const CARD_SHADOW = "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(0,0,0,0.18), 0 2px 2px rgba(0,0,0,0.12), 0 4px 4px rgba(0,0,0,0.1), 0 8px 8px rgba(0,0,0,0.08)";

const TIER_COLOR = { T1: C.green, T2: C.amber, T3: C.faint };
const FLAG = {
  australia: "🇦🇺", sweden: "🇸🇪", spain: "🇪🇸", france: "🇫🇷", germany: "🇩🇪",
  netherlands: "🇳🇱", norway: "🇳🇴", romania: "🇷🇴", portugal: "🇵🇹", pakistan: "🇵🇰",
  cameroon: "🇨🇲", cyprus: "🇨🇾", italy: "🇮🇹", nigeria: "🇳🇬", "united kingdom": "🇬🇧",
  poland: "🇵🇱", ireland: "🇮🇪",
};

// days between an ISO date and the snapshot "today"
function daysAgo(iso, today) {
  if (!iso) return null;
  const a = new Date(iso.includes("T") ? iso : iso + "T00:00:00Z");
  const b = new Date(today + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

// Onboarding alert: a self-served account whose activation is fresh but past first-touch
// (older than 3 days, younger than 30) is a churn risk and an upsell opening - flag it.
// Rule lives in data.js so the shell nav badge fires off the exact same predicate.
function needsOnboarding(item, today) {
  return isOnboardingAlert(item, today);
}

function TierChip({ label, tier }) {
  const c = TIER_COLOR[tier] || C.faint;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: MONO, fontSize: 10, color: c,
      background: "rgba(255,255,255,0.03)", border: `1px solid ${c}33`,
      borderRadius: 6, padding: "3px 8px",
    }}>
      <span style={{ color: C.faint }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{tier}</span>
    </span>
  );
}

// ─── Funnel strip - how 20 active narrowed to the eligible cohort ────────────
function FunnelStrip({ f }) {
  const steps = [
    { n: f.activeInWindow, label: "active in window", c: C.blue },
    { n: f.qualified, label: "already qualified", c: C.faint },
    { n: f.nonQualified, label: "non-qualified", c: C.amber },
    { n: f.disqualifiedByDeal, label: "won deal", c: C.red },
    { n: f.eligible, label: "eligible", c: C.green },
  ];
  return (
    <div style={{
      display: "flex", alignItems: "stretch", gap: 0, flexWrap: "wrap",
      background: C.surf, border: `1px solid ${C.line}`, borderRadius: 14,
      padding: "4px", marginBottom: 24, boxShadow: CARD_SHADOW,
    }}>
      {steps.map((s, i) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", flex: "1 1 auto" }}>
          <div style={{ padding: "12px 18px", textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.c, fontFamily: FONT, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {s.n}
            </div>
            <div style={{ fontSize: 9.5, color: C.faint, fontFamily: MONO, marginTop: 5, letterSpacing: 0.3 }}>
              {s.label}
            </div>
          </div>
          {i < steps.length - 1 && (
            <span style={{ color: C.faint, fontSize: 14, opacity: 0.5 }}>→</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Lead card ────────────────────────────────────────────────────────────
function LeadCard({ item, today, rank }) {
  const masked = useMasked();
  const active = daysAgo(item.account_became_active, today);
  const lastTouch = daysAgo(item.engagement.notes_last_contacted, today);
  const flag = FLAG[(item.country || "").toLowerCase()] || "🏳";
  const seatLabel = item.seats.seat_range || item.seats.seats_indicated__aggregated_ || "?";
  const name = `${item.firstname} ${item.lastname}`.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.04 }}
      style={{
        background: C.surf, border: `1px solid ${C.line}`, borderRadius: 16,
        padding: 20, boxShadow: CARD_SHADOW, marginBottom: 14,
      }}
    >
      {/* header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {/* rank score badge */}
          <div style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(77,130,255,0.1)", border: `1px solid ${C.line2}`,
          }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: C.blue, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{item.rank_score}</span>
            <span style={{ fontSize: 7.5, color: C.faint, fontFamily: MONO, letterSpacing: 0.5, marginTop: 2 }}>SCORE</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: C.txt }}>{flag} {name}</span>
              {item.closedLostFlag && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.amber, background: "rgba(245,166,35,0.12)", border: `1px solid ${C.amber}44`, borderRadius: 4, padding: "1px 6px" }}>
                  RE-ENGAGE
                </span>
              )}
              {needsOnboarding(item, today) && (
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.red, background: "rgba(249,112,102,0.12)", border: `1px solid ${C.red}55`, borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap" }}>
                  {active}D · ONBOARD + UPSELL
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.mut, marginTop: 3 }}>
              {item.company?.name || "-"}
              {item.jobtitle ? ` · ${item.jobtitle}` : ""}
              {item.company?.domain ? ` · ${item.company.domain}` : ""}
            </div>
          </div>
        </div>
        <a href={item.hsLink} target="_blank" rel="noreferrer" style={{
          flexShrink: 0, fontFamily: MONO, fontSize: 10.5, color: C.blue, textDecoration: "none",
          border: `1px solid ${C.line2}`, borderRadius: 7, padding: "6px 10px", background: "rgba(77,130,255,0.06)",
        }}>
          open in HubSpot →
        </a>
      </div>

      {/* tier chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <TierChip label={`seats ${seatLabel}`} tier={item.seat_tier} />
        <TierChip label={item.country} tier={item.geo_tier} />
        <TierChip label={item.lead_source} tier={item.source_tier} />
      </div>

      {/* signal grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12,
        marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.line}`,
      }}>
        <Signal label="ACTIVATED" value={active != null ? `${active}d ago` : "-"} sub={item.account_became_active} accent={active != null && active <= 7 ? C.green : null} />
        <Signal label="TRIAL" value={item.active_trial ? "Active" : "-"} sub={item.ct_account_status} />
        <Signal label="LAST TOUCH" value={lastTouch != null ? `${lastTouch}d ago` : "never"} sub={`${item.engagement.num_contacted_notes} touches`} />
        <Signal label="STATUS" value={item.hs_lead_status_label || item.hs_lead_status} sub={item.lifecyclestage} />
      </div>

      {/* contact line (PII-masked under present mode) */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, fontSize: 11.5, color: C.mut, fontFamily: MONO }}>
        <span>✉ {masked ? MASK : item.email}</span>
        <span>☎ {masked ? MASK : item.phone}</span>
      </div>

      {/* hygiene flag */}
      {item.hygieneFlag && (
        <div style={{ marginTop: 12, fontSize: 11, color: C.amber, background: "rgba(245,166,35,0.08)", border: `1px solid ${C.amber}33`, borderRadius: 8, padding: "8px 12px", lineHeight: 1.4 }}>
          ⚠ {item.hygieneFlag}
        </div>
      )}
    </motion.div>
  );
}

function Signal({ label, value, sub, accent }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: C.faint, fontFamily: MONO, letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: accent || C.txt, marginTop: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.faint, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function PresentToggle({ on, set }) {
  return (
    <button
      onClick={() => set(!on)}
      title={on ? "PII hidden for screen-share" : "Hide email & phone for screen-share"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0,
        padding: "7px 12px", borderRadius: 9, cursor: "pointer", fontFamily: FONT,
        fontSize: 12, fontWeight: 600,
        background: on ? "rgba(245,166,35,0.14)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${on ? "rgba(245,166,35,0.4)" : "rgba(255,255,255,0.08)"}`,
        color: on ? C.amber : C.mut, transition: "all 0.15s",
      }}
    >
      {on ? "PII hidden" : "Present mode"}
    </button>
  );
}

// ─── Not-eligible audit - won-deal contacts + qualified count ────────────────
function NotEligible({ ne, today, maxDays = 90 }) {
  const flagOf = (c) => FLAG[(c || "").toLowerCase()] || "🏳";
  const wonDeal = ne.wonDeal.filter((x) => {
    const a = daysAgo(x.account_became_active, today);
    return a != null && a <= maxDays;
  });
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 10, color: C.faint, fontFamily: MONO, letterSpacing: 0.8 }}>
          NOT ELIGIBLE{maxDays < 90 ? ` · ACTIVATED ≤${maxDays}D` : " THIS WINDOW"}
        </span>
        <span style={{ flex: 1, height: 1, background: C.line }} />
        <span style={{ fontSize: 10, color: C.faint, fontFamily: MONO }}>
          {maxDays < 90 ? `${wonDeal.length} won-deal` : `${ne.qualifiedCount + ne.wonDeal.length} contacts`}
        </span>
      </div>

      {/* qualified - summarised, not listed (no per-contact activation date stored, so hidden when recency-filtered) */}
      {maxDays >= 90 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          background: C.surf, border: `1px solid ${C.line}`, borderRadius: 12,
          padding: "14px 18px", marginBottom: 14,
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.faint, fontFamily: FONT, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {ne.qualifiedCount}
          </div>
          <div style={{ fontSize: 12, color: C.mut, lineHeight: 1.5 }}>
            <span style={{ color: C.txt, fontWeight: 600 }}>already Qualified</span> — actively worked, out of the self-serve play. Not self-serve actionable by definition.
          </div>
        </div>
      )}

      {/* won-deal contacts - itemised so the filter is auditable */}
      {wonDeal.length === 0 ? (
        <div style={{ fontSize: 12, color: C.faint, fontFamily: MONO, padding: "4px 2px" }}>
          No won-deal contacts activated within {maxDays} days.
        </div>
      ) : (
      <div style={{ background: C.surf, border: `1px solid ${C.line}`, borderRadius: 12, padding: "6px 18px" }}>
        {wonDeal.map((x, i) => {
          const active = daysAgo(x.account_became_active, today);
          return (
            <div key={x.hsObjectId} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "11px 0", borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
            }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>
                  {flagOf(x.country)} {x.firstname} {x.lastname}
                </span>
                <span style={{ fontSize: 11, color: C.faint, marginLeft: 8, fontFamily: MONO }}>
                  active {active != null ? `${active}d ago` : "-"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.green, background: "rgba(71,205,137,0.1)", border: `1px solid ${C.green}33`, borderRadius: 5, padding: "2px 7px" }}>
                  WON
                </span>
                <span style={{ fontSize: 12, color: C.mut, fontVariantNumeric: "tabular-nums" }}>
                  {x.deal.name} · €{x.deal.amount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ─── Recency filter - narrow the cohort by activation date ───────────────────
const RECENCY_OPTS = [14, 30, 60, 90];

function RecencyFilter({ value, set, counts }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, color: C.faint, fontFamily: MONO, letterSpacing: 0.6 }}>ACTIVATED WITHIN</span>
      <div style={{ display: "inline-flex", gap: 6 }}>
        {RECENCY_OPTS.map((opt) => {
          const on = value === opt;
          return (
            <button key={opt} onClick={() => set(opt)} style={{
              fontFamily: MONO, fontSize: 11, cursor: "pointer", transition: "all 0.15s",
              padding: "5px 11px", borderRadius: 8,
              background: on ? "rgba(77,130,255,0.14)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${on ? C.line2 : C.line}`,
              color: on ? C.blue : C.mut, fontWeight: on ? 600 : 400,
            }}>
              {opt === 90 ? "all 90d" : `${opt}d`}
              <span style={{ color: on ? C.blue : C.faint, marginLeft: 6, opacity: 0.7 }}>{counts[opt]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Module root ─────────────────────────────────────────────────────────
export default function SelfServedModule() {
  const [present, setPresent] = useState(false);
  const [maxDays, setMaxDays] = useState(90);
  const d = SELFSERVED;

  const within = (iso) => {
    const a = daysAgo(iso, d.today);
    return a != null && a <= maxDays;
  };
  // Recency-first: newest activation on top, composite score only breaks ties.
  const items = d.items
    .filter((it) => within(it.account_became_active))
    .sort((a, b) => {
      if (a.account_became_active !== b.account_became_active) {
        return a.account_became_active < b.account_became_active ? 1 : -1;
      }
      return b.rank_score - a.rank_score;
    });
  const counts = RECENCY_OPTS.reduce((m, opt) => {
    m[opt] = d.items.filter((it) => {
      const a = daysAgo(it.account_became_active, d.today);
      return a != null && a <= opt;
    }).length;
    return m;
  }, {});
  const onboardItems = items.filter((it) => needsOnboarding(it, d.today));

  return (
    <MaskCtx.Provider value={present}>
      <div style={{ height: "100vh", overflowY: "auto", background: C.bg, color: C.txt, fontFamily: FONT }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 28px 80px" }}>

          {/* header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: "-0.2px", color: C.txt }}>
                Self-Served Tracker
              </h1>
              <div style={{ fontSize: 11, color: C.faint, fontFamily: MONO, margin: "5px 0 0" }}>
                {d.owner} · live from HubSpot · {d.refreshedAt.split(" - ")[0]}
              </div>
            </div>
            <PresentToggle on={present} set={setPresent} />
          </div>
          <div style={{ height: 28 }} />

          <FunnelStrip f={d.funnel} />

          <RecencyFilter value={maxDays} set={setMaxDays} counts={counts} />

          {/* onboarding / upsell alert - self-served accounts active 3-30 days */}
          {onboardItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 18,
                background: "rgba(249,112,102,0.08)", border: `1px solid ${C.red}44`,
                borderRadius: 12, padding: "13px 16px",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>⚠</span>
              <div style={{ fontSize: 12.5, color: C.txt, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: C.red }}>{onboardItems.length} self-served account{onboardItems.length === 1 ? "" : "s"} active {ONBOARD_MIN_DAYS}-{ONBOARD_MAX_DAYS} days</span>
                {" "}- reach out for proper onboarding and an upsell pass before usage habits set. Flagged on each card below.
              </div>
            </motion.div>
          )}

          {/* eligible cohort */}
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: C.mut, background: C.surf, border: `1px solid ${C.line}`, borderRadius: 16 }}>
              No eligible self-served leads activated within {maxDays} days. {d.items.length} sit in the full 90-day window - widen the filter to see them.
            </div>
          ) : (
            <AnimatePresence>
              {items.map((it, i) => (
                <LeadCard key={it.hsObjectId} item={it} today={d.today} rank={i} />
              ))}
            </AnimatePresence>
          )}

          {/* not eligible this window - audit trail */}
          <NotEligible ne={d.notEligible} today={d.today} maxDays={maxDays} />

          {/* footnote */}
          <div style={{ fontSize: 10.5, color: C.faint, fontFamily: MONO, marginTop: 28, lineHeight: 1.6, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
            Cohort = contacts owned by {d.owner} (ownerId {d.ownerId}), hs_lead_status ≠ Qualified, account_became_active in {d.windowStart} → {d.windowEnd}, with zero open/won deals on the contact or any associated company. Closed-lost-only contacts are kept and flagged RE-ENGAGE.<br />
            Ordered by activation recency - newest account_became_active on top. Score = seats {Math.round(d.weights.seat * 100)}% · geo {Math.round(d.weights.geo * 100)}% · source {Math.round(d.weights.source * 100)}% (T1=100 · T2=66 · T3=33), a quality signal that only breaks recency ties. Source: HubSpot {d.portalId}, pulled via /hs.
          </div>
        </div>
      </div>
    </MaskCtx.Provider>
  );
}
