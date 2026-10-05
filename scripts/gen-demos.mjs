#!/usr/bin/env node
// Demos at Stake (module 06) data.js generator.
//
//   node scripts/gen-demos.mjs <payload.json> [dataPath]
//
// Payload carries the normalized demo list pulled from HubSpot by the refresh
// runtime. The generator validates shape and writes through refresh-core.

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runGenerator, assertShape, readText } from "./lib/refresh-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = resolve(__dirname, "../src/modules/demos/data.js");

const HEADER = `// Demos at Stake - module 06 data.
// MACHINE-GENERATED each refresh by scripts/gen-demos.mjs. The component
// (DemosModule) is never touched by a refresh.
`;

const VALID_OFFICES = new Set(["BCN", "TOR"]);
const VALID_SEGS = new Set(["micro", "smb", "mm", "none"]);
const VALID_NS = new Set(["ok", "noshow", "rescheduled"]);

function reconcile(mod) {
  const D = mod.DEMOS;
  if (!D || typeof D !== "object") {
    throw new Error("DEMOS export missing or not an object");
  }

  for (const k of ["todayIso", "demos", "roster"]) {
    if (!(k in D)) throw new Error(`DEMOS missing required key "${k}"`);
  }

  if (!Array.isArray(D.demos)) {
    throw new Error("demos must be an array");
  }

  for (const [i, d] of D.demos.entries()) {
    for (const k of ["id", "name", "key", "time", "office", "sdrId", "sdr", "seg", "ns", "inPlay"]) {
      if (!(k in d)) throw new Error(`demos[${i}] missing "${k}"`);
    }
    if (!VALID_OFFICES.has(d.office)) {
      throw new Error(`demos[${i}] invalid office "${d.office}"`);
    }
    if (!VALID_SEGS.has(d.seg)) {
      throw new Error(`demos[${i}] invalid seg "${d.seg}"`);
    }
    if (!VALID_NS.has(d.ns)) {
      throw new Error(`demos[${i}] invalid ns "${d.ns}"`);
    }
  }

  if (typeof D.roster !== "object") {
    throw new Error("roster must be an object keyed by owner ID");
  }
}

async function main() {
  const [payloadPath, dataPath = DEFAULT_PATH] = process.argv.slice(2);
  if (!payloadPath) {
    console.error("usage: node scripts/gen-demos.mjs <payload.json> [dataPath]");
    process.exit(1);
  }

  const raw = JSON.parse(await readText(payloadPath));

  assertShape(raw, {
    requiredKeys: ["todayIso", "demos", "roster"],
  }, "demos");

  const exportList = [{ name: "DEMOS", value: raw }];

  await runGenerator({
    dataPath,
    header: HEADER,
    exports: exportList,
    reconcile,
  });

  console.log(`demos/data.js written + reconciled (${dataPath}); ${raw.demos.length} demos.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
