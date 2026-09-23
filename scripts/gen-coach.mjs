#!/usr/bin/env node
// Coach (module 05) data.js generator - Option A.
//
//   node scripts/gen-coach.mjs <payload.json> [dataPath]
//
// The payload carries the COACH object produced by Claude from the three
// source data.js files (briefing, performance, selfserved) plus a system
// prompt. This generator validates the shape, checks PII hygiene, and
// writes through the refresh-core pipeline.

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runGenerator, readText } from "./lib/refresh-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = resolve(__dirname, "../src/modules/coach/data.js");

const HEADER = `// Coach - module 05 (AI strategy) data.
// MACHINE-GENERATED each refresh by scripts/gen-coach.mjs (Option A: Claude
// reasons over briefing + performance + selfserved data, no stored token).
// PII-free: prospects referenced by card index, not by name/email.
`;

const VALID_MODULES = new Set(["01", "03", "04"]);
const VALID_URGENCY = new Set(["high", "medium", "low"]);
const VALID_TYPES = new Set(["call", "pipeline", "hygiene"]);

// Loose email regex - catches obvious leaks, not meant to be RFC-complete.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function reconcile(mod) {
  const C = mod.COACH;
  if (!C || typeof C !== "object") {
    throw new Error("COACH export missing or not an object");
  }

  // 1. priorities: array of 1-8 items
  if (!Array.isArray(C.priorities) || C.priorities.length === 0 || C.priorities.length > 8) {
    throw new Error(`priorities must be 1-8 items, got ${C.priorities?.length ?? "missing"}`);
  }

  for (const [i, p] of C.priorities.entries()) {
    for (const key of ["rank", "type", "title", "detail", "linkedModule", "linkedEntity", "urgency"]) {
      if (!(key in p)) throw new Error(`priorities[${i}] missing "${key}"`);
    }
    if (!VALID_TYPES.has(p.type)) {
      throw new Error(`priorities[${i}].type "${p.type}" not in {call, pipeline, hygiene}`);
    }
    if (!VALID_MODULES.has(p.linkedModule)) {
      throw new Error(`priorities[${i}].linkedModule "${p.linkedModule}" not in {01, 03, 04}`);
    }
    if (!VALID_URGENCY.has(p.urgency)) {
      throw new Error(`priorities[${i}].urgency "${p.urgency}" not in {high, medium, low}`);
    }
  }

  // 2. pipelinePulse
  if (!C.pipelinePulse || typeof C.pipelinePulse !== "object") {
    throw new Error("pipelinePulse missing or not an object");
  }
  if (typeof C.pipelinePulse.summary !== "string" || !C.pipelinePulse.summary.trim()) {
    throw new Error("pipelinePulse.summary is empty");
  }
  if (!Array.isArray(C.pipelinePulse.risks)) {
    throw new Error("pipelinePulse.risks must be an array");
  }
  if (!Array.isArray(C.pipelinePulse.opportunities)) {
    throw new Error("pipelinePulse.opportunities must be an array");
  }

  // 3. weekRead
  if (typeof C.weekRead !== "string" || !C.weekRead.trim()) {
    throw new Error("weekRead is empty");
  }

  // 4. PII leak check - no emails anywhere in the serialized output
  const serialized = JSON.stringify(C);
  if (EMAIL_RE.test(serialized)) {
    const match = serialized.match(EMAIL_RE);
    throw new Error(`PII leak: email address found in COACH data: "${match[0]}"`);
  }
}

async function main() {
  const [payloadPath, dataPath = DEFAULT_PATH] = process.argv.slice(2);
  if (!payloadPath) {
    console.error("usage: node scripts/gen-coach.mjs <payload.json> [dataPath]");
    process.exit(1);
  }

  const raw = JSON.parse(await readText(payloadPath));
  const coach = raw.COACH || raw;

  const exportList = [{ name: "COACH", value: coach }];

  await runGenerator({
    dataPath,
    header: HEADER,
    exports: exportList,
    reconcile,
  });

  console.log(`coach/data.js written + reconciled (${dataPath}); ${coach.priorities.length} priorities.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
