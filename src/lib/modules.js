// Single source of truth for the module registry.
//
// Both consumers read from here:
//   - Shell.jsx      builds the nav rail + command palette, attaching `component`
//   - dashboard/     builds the Constellation tiles, attaching `icon`
//
// Those two fields stay with their consumers because they are not data: one needs
// the module imports, the other needs the inline SVG map. Everything else lives
// here so the list cannot drift between the rail and the tiles again.
//
// Fields:
//   id      stable key, matches the directory under src/modules/ and the Icon key
//   num     two-digit display number; also what the command palette searches
//   label   nav + tile title
//   sub     one-line subtitle
//   accent  palette accent key (see lib/palette.js)
//   status  "live" renders normally; "stub" renders a SOON badge and is not clickable
//   signal  static one-line metric shown on the tile; null means the tile computes
//           it at render time (module 01 derives it from live briefing data)
//   primary marks the single hero tile on the Constellation

export const MODULES = [
  { id: "dashboard",   num: "00", label: "Dashboard",   sub: "Constellation",    accent: "purple",  status: "live" },
  { id: "briefing",    num: "01", label: "Today",       sub: "Schedule",         accent: "blue",    status: "live", signal: null,                 primary: true },
  { id: "calculator",  num: "02", label: "Calculator",  sub: "Minutes / cost",   accent: "blue",    status: "live", signal: "Cost - Minutes" },
  { id: "performance", num: "03", label: "Performance", sub: "SQL / SQO",        accent: "emerald", status: "live", signal: "SQL / SQO tracker" },
  { id: "selfserved",  num: "04", label: "Self-Served", sub: "Untouched MQLs",   accent: "emerald", status: "live", signal: "Re-engage cohort" },
  { id: "roadmap",     num: "05", label: "Roadmap",     sub: "Reserved slot",    accent: "purple",  status: "stub" },
  { id: "coach",       num: "06", label: "Sales Coach", sub: "AI coaching",      accent: "blue",    status: "live", signal: "Coach session" },
  { id: "precall",     num: "07", label: "Pre-Call SE", sub: "Brief generator",  accent: "blue",    status: "live", signal: "Generate brief" },
  { id: "competitor",  num: "08", label: "Competitor",  sub: "Move tracker",     accent: "red",     status: "live", signal: "Aircall - Dialpad" },
  { id: "pipeline",    num: "09", label: "Pipeline",    sub: "Cockpit",          accent: "blue",    status: "stub" },
  { id: "library",     num: "10", label: "Library",     sub: "Past discoveries", accent: "purple",  status: "stub" },
  { id: "quotes",      num: "11", label: "Quotes",      sub: "ROI calculator",   accent: "amber",   status: "stub" },
  { id: "battlecards", num: "12", label: "Battlecards", sub: "Static cards",     accent: "red",     status: "stub" },
  { id: "email",       num: "13", label: "Email",       sub: "Triage + draft",   accent: "cyan",    status: "stub" },
  { id: "demos",       num: "14", label: "Demos",       sub: "Sandbox state",    accent: "meet",    status: "stub" },
  { id: "review",      num: "15", label: "Review",      sub: "Call scoring",     accent: "orange",  status: "stub" },
  { id: "activity",    num: "16", label: "Activity",    sub: "Cross-tool feed",  accent: "cyan",    status: "stub" },
  { id: "wiki",        num: "17", label: "Wiki",        sub: "Knowledge base",   accent: "purple",  status: "stub" },
  { id: "stale",       num: "18", label: "Stale Leads", sub: "Re-engage",        accent: "amber",   status: "stub" },
];

// The Constellation shows every module except itself.
export const TILE_MODULES = MODULES.filter((m) => m.id !== "dashboard");
