// Demos at Stake module configuration.
//
// Stage IDs, timezone mapping and constants for the demo tracker.
// Not generated. Edited by hand when pipelines or roster change.

import { OWNER_IDS } from "./config.js";

// HubSpot deal stage IDs (pipeline-specific)
export const WON_STAGES = new Set(["6607659", "9474198", "24316488"]);
export const LOST_STAGES = new Set(["6607660", "9474199", "24316489"]);

// Office timezones used for local-time rendering and speed-to-demo calc
export const TZ = { BCN: "Europe/Madrid", TOR: "America/Toronto" };
export const HOME_TZ = "Europe/Madrid";

// Roster keyed by HubSpot owner ID
export const ROSTER = Object.fromEntries(
  Object.entries(OWNER_IDS).map(([name, id]) => {
    const office = [
      "Jack Griffiths", "Andy Dai", "Antonio Mioc",
      "Melanie Feng", "Nicolas Lopez",
    ].includes(name) ? "TOR" : "BCN";
    return [String(id), { name, office, lead: name === "Nicolas Lopez" }];
  }),
);

// Segment brackets on amount_in_home_currency (EUR MRR)
export function segOf(amt) {
  if (amt == null || isNaN(amt)) return "none";
  if (amt < 500) return "micro";
  if (amt <= 1500) return "smb";
  return "mm";
}
export const SEG_LABEL = { micro: "Micro", smb: "SMB", mm: "Mid-Market", none: "No amount" };

// Speed-to-demo thresholds (working hours)
export const SLOW_THRESHOLD_H = 48;

// Horizon / history window
export const HORIZON_DAYS = 15;
export const HISTORY_DAYS = 20;
export const HISTORY_WEEKS = 8;

// No-show status classification
export function noShowState(s) {
  if (!s) return "ok";
  if (s.indexOf("Demo Rescheduled") >= 0) return "rescheduled";
  if (s.indexOf("Demo No Show") >= 0 || s.indexOf("Demo Not Rescheduled") >= 0) return "noshow";
  return "ok";
}
