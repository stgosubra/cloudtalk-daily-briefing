// Data freshness for the three generator-backed modules.
//
// Every data.js written by scripts/lib/refresh-core.mjs carries a GENERATED_AT
// ISO stamp taken at write time. The unattended refresh (briefing-daily task) is
// best-effort - it fires on machine wake, so a missed morning is possible and
// must be visible rather than silent. Shell renders a banner from staleModules().
//
// Namespace imports, not named ones: a data.js generated before the stamp existed
// simply has no GENERATED_AT, and a namespace read yields undefined instead of a
// build error.

import * as briefingData from "../modules/briefing/data.js";
import * as performanceData from "../modules/performance/data.js";
import * as selfservedData from "../modules/selfserved/data.js";

const SOURCES = [
  { id: "briefing",    num: "01", label: "Today",       stamp: briefingData.GENERATED_AT },
  { id: "performance", num: "03", label: "Performance", stamp: performanceData.GENERATED_AT },
  { id: "selfserved",  num: "04", label: "Self-Served", stamp: selfservedData.GENERATED_AT },
];

function localDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Whole days between the stamp's local date and today's. 0 = refreshed today.
function daysStale(stamp, now) {
  const then = new Date(stamp);
  if (isNaN(then)) return null;
  const a = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((b - a) / 86400000);
}

// Modules whose data is not from today. An absent stamp counts as stale with
// days: null - it means the file predates the stamp, so freshness is unknown and
// silently claiming it is current would be worse than flagging it.
export function staleModules(now = new Date()) {
  return SOURCES.filter((s) => {
    if (!s.stamp) return true;
    return daysStale(s.stamp, now) !== 0;
  }).map((s) => ({ ...s, days: s.stamp ? daysStale(s.stamp, now) : null }));
}

export function freshnessFor(id, now = new Date()) {
  const src = SOURCES.find((s) => s.id === id);
  if (!src) return null;
  return {
    ...src,
    days: src.stamp ? daysStale(src.stamp, now) : null,
    today: Boolean(src.stamp) && daysStale(src.stamp, now) === 0,
    dayKey: src.stamp ? localDayKey(new Date(src.stamp)) : null,
  };
}
