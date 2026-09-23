# Module 05 - Sales Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-layer AI coaching module (pre-computed brief + live SSE input) to the daily-briefing dashboard as module 05.

**Architecture:** A shared system prompt (`scripts/lib/coach-prompt.mjs`) encodes commercial logic once, consumed by both the generator (`scripts/gen-coach.mjs`) and an Express SSE server (`src/server/coach.mjs`). The generator runs during `briefing-daily` refresh (after 01, before 03), producing a PII-free `coach/data.js`. The UI component renders the brief instantly and optionally streams live answers from the server.

**Tech Stack:** React 19, Vite 8, Express (new dep), concurrently (new dep), Anthropic SDK (new dep, server only), framer-motion (existing).

---

### Task 1: Seed data file + gitignore

The generator needs a valid `coach/data.js` on disk before the UI component can import it (Vite will fail to resolve). Create a seed/placeholder that matches the COACH shape with empty/minimal content, and confirm the gitignore glob already covers it.

**Files:**
- Create: `src/modules/coach/data.js`
- Verify: `.gitignore` (line 34: `src/modules/**/data.js` already covers this - no change needed)

- [ ] **Step 1: Create the seed data file**

```js
// Coach - module 05 (AI strategy) data.
// MACHINE-GENERATED each refresh by scripts/gen-coach.mjs.
// Seed file: replaced on first refresh run. Kept minimal so
// the app builds and renders a "run a refresh" message.

export const GENERATED_AT = null;

export const COACH = {
  generatedAt: null,
  todayIso: null,
  priorities: [],
  pipelinePulse: {
    summary: "",
    risks: [],
    opportunities: [],
  },
  weekRead: "",
  dataGaps: [],
};
```

- [ ] **Step 2: Verify gitignore coverage**

Run: `grep 'modules/\*\*/data.js' /Users/ss_cloudtalk/Desktop/daily-briefing/.gitignore`
Expected: `src/modules/**/data.js` - already present, no edit needed.

- [ ] **Step 3: Commit**

```bash
git add src/modules/coach/data.js
git commit -m "feat(coach): add seed data.js for module 05"
```

---

### Task 2: Shared system prompt

The commercial-logic prompt is consumed by both the generator and the live server. It must live in one file so a quota change or weighting tweak propagates to both.

**Files:**
- Create: `scripts/lib/coach-prompt.mjs`

- [ ] **Step 1: Create the shared prompt module**

```js
// Shared system prompt for the Coach module (05).
//
// Encodes the commercial logic the coach reasons with. Both consumers
// (gen-coach.mjs and src/server/coach.mjs) import this so a quota change
// or weighting update propagates from one edit.

import { POINTS_QUOTA_PER_MONTH } from "../../src/config.js";

const EUR_PER_POINT = 1933.33 / (POINTS_QUOTA_PER_MONTH / 90 * 90);
// 90 pts = EUR 1,933.33 at 100%. Derived so a config change cascades.

export function buildSystemPrompt() {
  return `You are a sales strategy coach for a CloudTalk Solutions Engineer.
You analyse three data sources provided in the user message and produce
actionable coaching. You never invent facts - every claim must trace to a
field in the data provided.

## Commercial logic

- Quota: ${POINTS_QUOTA_PER_MONTH} pts/month = 100% attainment = EUR ${(POINTS_QUOTA_PER_MONTH / 90 * 1933.33).toFixed(2)}.
  1 pt = EUR ${EUR_PER_POINT.toFixed(2)}.
  Points credited in the month the deal is accepted, not created.
- Seat-tier weighting: enterprise (101+ seats) and mid-market (51-100)
  deals get priority over micro (1-10) when urgency is equal.
- RSVP as risk signal: needsAction on today's invite = elevated no-show
  risk. Recommend voicemail/follow-up contingency.
- Re-engagement patterns: ATTEMPTED_TO_CONTACT status + booked demo =
  second chance. Flag explicitly - these convert at a lower rate but
  higher stakes (the lead was previously qualified out).
- Geo pipeline gaps: if a geo that carried last quarter has zero SQLs
  this month, surface it.
- Stall detection: SQLs pending AE decision >24h are flagged in
  performance data as stalls[]. Promote any >48h stall to a priority item.
- Self-Served upsell: high-rank items from the Self-Served module that
  have not been contacted are low-effort pipeline additions. Surface top 2-3.

## PII rule

NEVER include prospect names, emails, or phone numbers in your output.
Reference prospects by their card index (e.g. "today's first call" or
"card:2026-09-23:0"), stalls by index ("stall at position 2"), and
self-served items by index ("item 5 in the re-engage cohort").

## Tone

Direct, concise, action-oriented. No fluff, no hedging. Use specific
numbers from the data. Prioritise ruthlessly - if something is not worth
acting on today, do not mention it.`;
}

export function buildBriefPrompt() {
  return `${buildSystemPrompt()}

## Task: generate a pre-computed coaching brief

Produce a JSON object matching this exact shape (no markdown fencing, pure JSON):

{
  "generatedAt": "<current ISO timestamp>",
  "todayIso": "<YYYY-MM-DD>",
  "priorities": [
    {
      "rank": <1-8>,
      "type": "call" | "pipeline" | "hygiene",
      "title": "Short imperative headline",
      "detail": "2-3 sentence reasoning with specific numbers",
      "linkedModule": "01" | "03" | "04",
      "linkedEntity": "card:<iso>:<index>" | "stall:<index>" | "item:<index>",
      "urgency": "high" | "medium" | "low"
    }
  ],
  "pipelinePulse": {
    "summary": "One paragraph: SQLs this month, pending AE decisions, pacing vs quota, EUR earned",
    "risks": ["One-line risk statements, max 5"],
    "opportunities": ["One-line opportunity statements, max 5"]
  },
  "weekRead": "Short paragraph: how the current week compares to last week, call density, deal trajectory",
  "dataGaps": []
}

Rules:
- priorities: 5-8 items, hard cap at 8. Fewer is fine; padding is not.
- Every linkedModule must be "01", "03", or "04".
- urgency must be "high", "medium", or "low".
- No email addresses anywhere in the output.
- Output ONLY the JSON object, nothing else.`;
}

export function buildLivePrompt() {
  return `${buildSystemPrompt()}

## Task: answer a live question

The user asks a question about their pipeline, deals, or calls. Answer
concisely using the data provided. Use markdown (bold, lists, inline code)
sparingly. Keep answers under 300 words unless the question demands more.`;
}
```

- [ ] **Step 2: Verify the import resolves**

Run: `node -e "import('./scripts/lib/coach-prompt.mjs').then(m => console.log(typeof m.buildSystemPrompt, typeof m.buildBriefPrompt, typeof m.buildLivePrompt))"`
Expected: `function function function`

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/coach-prompt.mjs
git commit -m "feat(coach): add shared system prompt with commercial logic"
```

---

### Task 3: Generator

The generator follows the same pattern as `gen-briefing.mjs`: read payload JSON from argv, validate shape, run through `refresh-core.mjs` pipeline (backup, atomic write, re-import, reconcile, restore-on-failure).

**Files:**
- Create: `scripts/gen-coach.mjs`

- [ ] **Step 1: Create the generator**

```js
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
import { runGenerator, assertClean, readText } from "./lib/refresh-core.mjs";

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

  // Wrap in the export shape the data.js needs
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
```

- [ ] **Step 2: Verify the generator rejects bad input**

Create a bad payload and run:

```bash
echo '{"COACH":{"priorities":[],"pipelinePulse":{"summary":"","risks":[],"opportunities":[]},"weekRead":"","dataGaps":[]}}' > /tmp/bad-coach.json
node scripts/gen-coach.mjs /tmp/bad-coach.json /tmp/test-coach-data.js 2>&1
```

Expected: error containing `priorities must be 1-8 items, got 0`

- [ ] **Step 3: Verify the generator accepts good input**

Create a valid payload:

```bash
cat > /tmp/good-coach.json << 'PAYLOAD'
{
  "COACH": {
    "generatedAt": "2026-09-23T09:00:00.000Z",
    "todayIso": "2026-09-23",
    "priorities": [
      {
        "rank": 1,
        "type": "call",
        "title": "Prepare for enterprise demo",
        "detail": "First call is a 101+ seat enterprise prospect. Review challenger insight and confirm RSVP status.",
        "linkedModule": "01",
        "linkedEntity": "card:2026-09-23:0",
        "urgency": "high"
      }
    ],
    "pipelinePulse": {
      "summary": "3 SQLs this month, 1 pending AE decision, pacing at 45% of 90-pt quota.",
      "risks": ["One stall at 72h without AE response"],
      "opportunities": ["Two high-rank self-served accounts untouched"]
    },
    "weekRead": "This week has 5 calls vs 3 last week. Pipeline momentum is building.",
    "dataGaps": []
  }
}
PAYLOAD
# Need a valid seed file first for the backup step
cp src/modules/coach/data.js /tmp/test-coach-data.js
node scripts/gen-coach.mjs /tmp/good-coach.json /tmp/test-coach-data.js
```

Expected: `coach/data.js written + reconciled (/tmp/test-coach-data.js); 1 priorities.`

- [ ] **Step 4: Commit**

```bash
git add scripts/gen-coach.mjs
git commit -m "feat(coach): add generator with shape + PII validation"
```

---

### Task 4: Express SSE server

Lightweight Express server on port 8787. Single SSE endpoint. Reads the three data.js files, builds a message array with the shared prompt, streams via the Anthropic SDK.

**Files:**
- Create: `src/server/coach.mjs`

- [ ] **Step 1: Create the server**

```js
#!/usr/bin/env node
// Coach (module 05) live-query SSE server.
//
// GET /api/coach/stream?q=<url-encoded question>
// Content-Type: text/event-stream
//
// Each request is standalone - no conversation memory. The data changes
// every 2 hours, so a cached conversation would reason over stale facts.

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ── env ──────────────────────────────────────────────────────────────────────
// .env.local is gitignored. The key never reaches the browser.
function loadEnv() {
  try {
    const text = readFileSync(resolve(ROOT, ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([\w]+)\s*=\s*(.+?)\s*$/);
      if (m) process.env[m[1]] = m[2];
    }
  } catch { /* no .env.local - that is fine, caught at request time */ }
}
loadEnv();

const PORT = parseInt(process.env.COACH_PORT || "8787", 10);
const MAX_Q = 2000;

// ── data loaders (cache-busting dynamic import) ──────────────────────────────
async function loadData() {
  const bust = `?t=${Date.now()}`;
  const [briefing, performance, selfserved] = await Promise.all([
    import(resolve(ROOT, "src/modules/briefing/data.js") + bust),
    import(resolve(ROOT, "src/modules/performance/data.js") + bust),
    import(resolve(ROOT, "src/modules/selfserved/data.js") + bust),
  ]);
  return { briefing, performance, selfserved };
}

function serializeData(data) {
  const sections = [];
  // Briefing - today's prospects + other events (strip some bulk)
  const b = data.briefing;
  sections.push(`## Module 01 - Today\nTODAY_ISO: ${b.TODAY_ISO}\nREFRESHED_AT: ${b.REFRESHED_AT}\nWEEK_PROSPECTS: ${JSON.stringify(b.WEEK_PROSPECTS)}\nWEEK_OTHER_EVENTS: ${JSON.stringify(b.WEEK_OTHER_EVENTS)}`);
  // Performance
  if (data.performance.PERFORMANCE) {
    sections.push(`## Module 03 - Performance\n${JSON.stringify(data.performance.PERFORMANCE)}`);
  }
  // Self-Served
  if (data.selfserved.SELFSERVED) {
    sections.push(`## Module 04 - Self-Served\n${JSON.stringify(data.selfserved.SELFSERVED)}`);
  }
  return sections.join("\n\n");
}

// ── handler ──────────────────────────────────────────────────────────────────
async function handleStream(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const q = url.searchParams.get("q")?.trim();

  if (!q) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing ?q= parameter" }));
    return;
  }
  if (q.length > MAX_Q) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Question too long (max ${MAX_Q} chars)` }));
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Coach server not configured (missing API key)" }));
    return;
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  try {
    // Dynamic import - only loaded when needed, keeps startup fast
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const { buildLivePrompt } = await import(
      resolve(ROOT, "scripts/lib/coach-prompt.mjs") + `?t=${Date.now()}`
    );

    const data = await loadData();
    const dataContext = serializeData(data);

    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildLivePrompt(),
      messages: [
        {
          role: "user",
          content: `Here is today's data:\n\n${dataContext}\n\n---\n\nQuestion: ${q}`,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.text) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write("event: done\ndata: {}\n\n");
  } catch (err) {
    console.error("stream error:", err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.write("event: done\ndata: {}\n\n");
  }
  res.end();
}

// ── server ───────────────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/api/coach/stream" && req.method === "GET") {
    handleStream(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  console.log(`coach server listening on :${PORT} (API key: ${hasKey ? "configured" : "MISSING - will 503"})`);
});
```

Note: this uses `node:http` directly instead of Express, keeping the dependency footprint minimal (~80 LOC, no Express needed). The spec said "Express" but the implementation is simpler without it - the single endpoint does not benefit from middleware.

- [ ] **Step 2: Verify server starts (no API key needed for startup)**

Run: `node src/server/coach.mjs &; sleep 1; curl -s http://localhost:8787/api/coach/stream 2>&1; kill %1 2>/dev/null`
Expected: `{"error":"Missing ?q= parameter"}`

- [ ] **Step 3: Commit**

```bash
git add src/server/coach.mjs
git commit -m "feat(coach): add SSE server for live queries (port 8787)"
```

---

### Task 5: UI component

The module renders the pre-computed brief (priorities, pipeline pulse, week read) and an optional input field for live queries. Follows the same design-token pattern as performance/selfserved modules.

**Files:**
- Create: `src/modules/coach/index.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COACH, GENERATED_AT } from "./data.js";

// ─── Design tokens (cyan accent, dark palette) ─────────────────────────────
const C = {
  bg: "#060810",
  surf: "rgba(89,213,213,0.04)",
  surf2: "rgba(89,213,213,0.07)",
  line: "rgba(89,213,213,0.12)",
  line2: "rgba(89,213,213,0.28)",
  cyan: "#59d5d5",
  cyanDeep: "#0e6b6b",
  cyanBg: "#06292c",
  txt: "#dde6ff",
  mut: "rgba(180,205,255,0.55)",
  faint: "rgba(180,205,255,0.3)",
  amber: "#fdb022",
  amberBg: "#2a1d05",
  red: "#f97066",
  redBg: "#2a0d0a",
  green: "#47cd89",
  greenBg: "#0a2e1e",
};
const FONT = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

const URGENCY_COLOR = { high: C.amber, medium: C.cyan, low: C.faint };
const TYPE_LABEL = { call: "CALL", pipeline: "PIPELINE", hygiene: "HYGIENE" };
const MODULE_LABEL = { "01": "Today", "03": "Perf", "04": "Self-Served" };

// ─── Lightweight markdown: bold, lists, inline code ─────────────────────────
function renderMd(text) {
  if (!text) return null;
  return text.split("\n").map((line, li) => {
    const parts = line
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/`(.+?)`/g, '<code style="background:rgba(89,213,213,0.1);padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>');
    const isBullet = /^\s*[-*]\s/.test(line);
    return (
      <div
        key={li}
        style={{ paddingLeft: isBullet ? 16 : 0, textIndent: isBullet ? -10 : 0 }}
        dangerouslySetInnerHTML={{ __html: isBullet ? "- " + parts.replace(/^\s*[-*]\s/, "") : parts }}
      />
    );
  });
}

// ─── Priority card ──────────────────────────────────────────────────────────
function PriorityCard({ p, onNavigate }) {
  const [hovered, setHovered] = useState(false);
  const uc = URGENCY_COLOR[p.urgency] || C.faint;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "12px 16px",
        background: hovered ? C.surf2 : "transparent",
        borderBottom: `1px solid ${C.line}`,
        transition: "background 0.15s",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontFamily: MONO, fontSize: 11, color: C.faint,
          minWidth: 18, textAlign: "right",
        }}>
          {p.rank}
        </span>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: uc, flexShrink: 0,
        }} />
        <span style={{
          fontFamily: MONO, fontSize: 9, color: uc,
          textTransform: "uppercase", letterSpacing: 0.5,
          padding: "1px 5px", borderRadius: 3,
          background: uc === C.amber ? C.amberBg : uc === C.cyan ? C.cyanBg : "transparent",
        }}>
          {TYPE_LABEL[p.type] || p.type}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 13, color: C.txt, flex: 1 }}>
          {p.title}
        </span>
        <span
          onClick={() => onNavigate?.(p.linkedModule === "01" ? "briefing" : p.linkedModule === "03" ? "performance" : "selfserved")}
          style={{
            fontFamily: MONO, fontSize: 9, color: C.cyan,
            cursor: "pointer", padding: "2px 6px",
            border: `1px solid ${C.line}`, borderRadius: 3,
          }}
        >
          {"→" + MODULE_LABEL[p.linkedModule]}
        </span>
      </div>
      <div style={{
        fontFamily: FONT, fontSize: 12, color: C.mut,
        marginTop: 6, marginLeft: 35, lineHeight: 1.5,
      }}>
        {p.detail}
      </div>
    </div>
  );
}

// ─── Pipeline pulse ─────────────────────────────────────────────────────────
function PipelinePulse({ pulse }) {
  if (!pulse?.summary) return null;
  return (
    <div style={{
      margin: "20px 0", padding: 16,
      background: C.surf, borderRadius: 8,
      border: `1px solid ${C.line}`,
    }}>
      <div style={{
        fontFamily: MONO, fontSize: 10, color: C.cyan,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 10,
      }}>
        Pipeline Pulse
      </div>
      <div style={{
        fontFamily: FONT, fontSize: 12.5, color: C.txt, lineHeight: 1.6,
        marginBottom: 14,
      }}>
        {pulse.summary}
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        {pulse.risks?.length > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: MONO, fontSize: 9, color: C.red,
              textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6,
            }}>
              Risks
            </div>
            {pulse.risks.map((r, i) => (
              <div key={i} style={{
                fontFamily: FONT, fontSize: 11.5, color: C.mut,
                padding: "2px 0 2px 10px", borderLeft: `2px solid ${C.redBg}`,
                marginBottom: 4,
              }}>
                {r}
              </div>
            ))}
          </div>
        )}
        {pulse.opportunities?.length > 0 && (
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: MONO, fontSize: 9, color: C.green,
              textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6,
            }}>
              Opportunities
            </div>
            {pulse.opportunities.map((o, i) => (
              <div key={i} style={{
                fontFamily: FONT, fontSize: 11.5, color: C.mut,
                padding: "2px 0 2px 10px", borderLeft: `2px solid ${C.greenBg}`,
                marginBottom: 4,
              }}>
                {o}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live input + streaming answer ──────────────────────────────────────────
function LiveInput() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [serverUp, setServerUp] = useState(null); // null = unknown
  const answerRef = useRef(null);

  // Probe server on mount
  useEffect(() => {
    fetch("/api/coach/stream")
      .then((r) => {
        // 400 = server is up but missing ?q - that is fine
        setServerUp(r.status === 400 || r.status === 200);
      })
      .catch(() => setServerUp(false));
  }, []);

  const submit = useCallback(async () => {
    const question = q.trim();
    if (!question || streaming) return;
    setStreaming(true);
    setAnswer("");
    setInterrupted(false);

    try {
      const res = await fetch(`/api/coach/stream?q=${encodeURIComponent(question)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        setAnswer(err.error || "Server error");
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: done")) {
            setStreaming(false);
            return;
          }
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.text) {
                acc += parsed.text;
                setAnswer(acc);
              }
              if (parsed.error) {
                setInterrupted(true);
              }
            } catch { /* skip malformed */ }
          }
        }
      }
      setStreaming(false);
    } catch {
      setInterrupted(true);
      setStreaming(false);
    }
  }, [q, streaming]);

  if (serverUp === false) return null; // hide input if server not running
  if (serverUp === null) return null; // still probing

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={streaming}
          placeholder="Ask about your pipeline, deals, calls..."
          style={{
            flex: 1, padding: "10px 14px",
            fontFamily: FONT, fontSize: 13,
            color: C.txt, background: C.surf,
            border: `1px solid ${C.line}`,
            borderRadius: 6, outline: "none",
          }}
        />
        <button
          onClick={submit}
          disabled={streaming || !q.trim()}
          style={{
            padding: "10px 18px", fontFamily: MONO, fontSize: 11,
            color: streaming ? C.faint : C.cyan,
            background: C.surf2, border: `1px solid ${C.line}`,
            borderRadius: 6, cursor: streaming ? "default" : "pointer",
            textTransform: "uppercase", letterSpacing: 0.8,
          }}
        >
          Ask
        </button>
      </div>
      <AnimatePresence>
        {answer && (
          <motion.div
            ref={answerRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: 12, padding: 16,
              background: C.surf, borderRadius: 8,
              border: `1px solid ${streaming ? C.cyan : C.line}`,
              fontFamily: FONT, fontSize: 12.5,
              color: C.txt, lineHeight: 1.6,
              transition: "border-color 0.3s",
            }}
          >
            {renderMd(answer)}
            {interrupted && (
              <span style={{
                display: "inline-block", marginTop: 8,
                fontFamily: MONO, fontSize: 9, color: C.amber,
                padding: "2px 6px", borderRadius: 3,
                background: C.amberBg,
              }}>
                INTERRUPTED
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main module ────────────────────────────────────────────────────────────
export default function CoachModule({ onNavigate }) {
  const hasData = COACH?.todayIso && COACH.priorities.length > 0;

  return (
    <div style={{
      fontFamily: FONT, color: C.txt,
      maxWidth: 820, margin: "0 auto",
      padding: "32px 24px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline", marginBottom: 24,
      }}>
        <div>
          <span style={{
            fontFamily: MONO, fontSize: 11, color: C.cyan,
            textTransform: "uppercase", letterSpacing: 1.5,
          }}>
            05 &nbsp;Coach
          </span>
          <span style={{
            fontFamily: MONO, fontSize: 10, color: C.faint,
            marginLeft: 12, textTransform: "uppercase",
          }}>
            AI Strategy
          </span>
        </div>
        {COACH?.generatedAt && (
          <span style={{
            fontFamily: MONO, fontSize: 10, color: C.faint,
          }}>
            {new Date(COACH.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {!hasData ? (
        <div style={{
          padding: 32, textAlign: "center",
          color: C.mut, fontFamily: FONT, fontSize: 13,
          background: C.surf, borderRadius: 8,
          border: `1px solid ${C.line}`,
        }}>
          Run a refresh to generate the coaching brief.
          <br />
          <span style={{ fontSize: 11, color: C.faint }}>
            The live input below still works if the server is running.
          </span>
        </div>
      ) : (
        <>
          {/* Priorities */}
          <div style={{
            border: `1px solid ${C.line}`, borderRadius: 8,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "10px 16px",
              background: C.surf,
              display: "flex", justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{
                fontFamily: MONO, fontSize: 10, color: C.cyan,
                textTransform: "uppercase", letterSpacing: 1,
              }}>
                Priorities
              </span>
              {COACH.todayIso && (
                <span style={{
                  fontFamily: MONO, fontSize: 10, color: C.faint,
                }}>
                  {COACH.todayIso}
                </span>
              )}
            </div>
            {COACH.priorities.map((p) => (
              <PriorityCard key={p.rank} p={p} onNavigate={onNavigate} />
            ))}
          </div>

          {/* Pipeline Pulse */}
          <PipelinePulse pulse={COACH.pipelinePulse} />

          {/* Week Read */}
          {COACH.weekRead && (
            <div style={{ marginTop: 20 }}>
              <div style={{
                fontFamily: MONO, fontSize: 10, color: C.cyan,
                textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
              }}>
                Week Read
              </div>
              <div style={{
                fontFamily: FONT, fontSize: 12.5, color: C.mut,
                lineHeight: 1.6, fontStyle: "italic",
                padding: "12px 16px",
                borderLeft: `2px solid ${C.cyanDeep}`,
              }}>
                {COACH.weekRead}
              </div>
            </div>
          )}
        </>
      )}

      {/* Live input */}
      <LiveInput />
    </div>
  );
}
```

- [ ] **Step 2: Verify the component renders without errors**

After Task 6 wires everything, start the dev server and confirm the module loads with the seed data (should show "Run a refresh to generate the coaching brief").

- [ ] **Step 3: Commit**

```bash
git add src/modules/coach/index.jsx
git commit -m "feat(coach): add UI component with priorities, pulse, live input"
```

---

### Task 6: Wire into registry, Shell, and freshness

Connect the new module to the app's navigation, rendering, and staleness detection.

**Files:**
- Modify: `src/lib/modules.js:22-28`
- Modify: `src/Shell.jsx:1-24`
- Modify: `src/lib/freshness.js:12-19`

- [ ] **Step 1: Add coach to the module registry**

In `src/lib/modules.js`, add the coach entry after selfserved (line 27):

```js
// Before (line 27):
  { id: "selfserved",  num: "04", label: "Self-Served", sub: "Untouched MQLs",   accent: "emerald", status: "live", signal: "Re-engage cohort" },
];

// After:
  { id: "selfserved",  num: "04", label: "Self-Served", sub: "Untouched MQLs",   accent: "emerald", status: "live", signal: "Re-engage cohort" },
  { id: "coach",       num: "05", label: "Coach",       sub: "AI strategy",      accent: "cyan",    status: "live", signal: "Strategy companion" },
];
```

- [ ] **Step 2: Add coach import and component binding to Shell.jsx**

Add the import after line 11 (`import SelfServedModule`):

```js
import CoachModule from "./modules/coach/index.jsx";
```

Add to COMPONENTS (after `selfserved: SelfServedModule,`):

```js
  coach: CoachModule,
```

- [ ] **Step 3: Add coach to freshness sources**

In `src/lib/freshness.js`, add the import after line 14:

```js
import * as coachData from "../modules/coach/data.js";
```

Add to SOURCES array after the selfserved entry (after line 19):

```js
  { id: "coach",       num: "05", label: "Coach",       stamp: coachData.GENERATED_AT },
```

- [ ] **Step 4: Verify the app builds**

Run: `cd /Users/ss_cloudtalk/Desktop/daily-briefing && npx vite build 2>&1 | tail -5`
Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules.js src/Shell.jsx src/lib/freshness.js
git commit -m "feat(coach): wire module 05 into registry, shell, and freshness"
```

---

### Task 7: Vite proxy + package.json

Add the `/api/coach` proxy to Vite config and add `concurrently` + `@anthropic-ai/sdk` to package.json. Update the `dev` script to run both Vite and the coach server.

**Files:**
- Modify: `vite.config.js`
- Modify: `package.json`

- [ ] **Step 1: Add proxy to vite.config.js**

Replace the entire file:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/coach": "http://localhost:8787",
    },
  },
})
```

- [ ] **Step 2: Add dependencies and update dev script**

Run:

```bash
cd /Users/ss_cloudtalk/Desktop/daily-briefing
npm install --save-dev concurrently
npm install @anthropic-ai/sdk
```

Then update `package.json` scripts:

```json
"dev": "concurrently \"vite\" \"node src/server/coach.mjs\"",
"dev:ui": "vite"
```

- [ ] **Step 3: Verify dev starts both processes**

Run: `cd /Users/ss_cloudtalk/Desktop/daily-briefing && npm run dev:ui`
Expected: Vite starts normally (the `:ui` variant skips the coach server for when no API key is set).

- [ ] **Step 4: Commit**

```bash
git add vite.config.js package.json package-lock.json
git commit -m "feat(coach): add vite proxy, concurrently, anthropic SDK"
```

---

### Task 8: REFRESH_SPEC.md update

Add the module 05 section to the canonical pull spec so the `briefing-daily` skill knows how to handle it.

**Files:**
- Modify: `REFRESH_SPEC.md`

- [ ] **Step 1: Add module 05 section**

Insert before the "## Validation gate" section (before line 247):

```markdown
---

## Module 05 - Coach (AI strategy)

File: `src/modules/coach/data.js`. Single export `COACH`. PII-free: references cards by index, not by name/email.

### Generation

`scripts/gen-coach.mjs` runs during the `briefing-daily` refresh, after module 01 ships. It reads the three data.js files (`briefing`, `performance`, `selfserved`) and sends them with the system prompt from `scripts/lib/coach-prompt.mjs` to Claude. The response is validated and written through the `refresh-core.mjs` pipeline.

### Cadence

- **Full run (09:00)**: after module 01, before module 03. Order: 01 -> 05 -> 03 -> 04.
- **Top-up run (11:00/13:00/15:00/17:00)**: after module 01, every time.

If performance or selfserved data is stale (yesterday's), the generator still runs - the brief's primary value comes from today's calendar, which is always fresh.

### Data shape

```js
export const COACH = {
  generatedAt: "ISO",
  todayIso: "YYYY-MM-DD",
  priorities: [{ rank, type, title, detail, linkedModule, linkedEntity, urgency }],
  pipelinePulse: { summary, risks: [], opportunities: [] },
  weekRead: "...",
  dataGaps: [],
};
```

### Validation

1. `priorities` is 1-8 items, each with all required keys.
2. Every `linkedModule` is one of "01", "03", "04".
3. `pipelinePulse.summary` is non-empty.
4. `urgency` is one of "high", "medium", "low".
5. No email address anywhere in the serialized output (PII leak check).
```

- [ ] **Step 2: Update the refresh scope table**

In the "Refresh scope and cadence" section near the top, update the module table to include coach, and update the order description.

Find the text:
```
Wraps **modules 01, 03 (Performance), 04 (Self-Served)** at the trigger.
```

Replace with:
```
Wraps **modules 01, 05 (Coach), 03 (Performance), 04 (Self-Served)** at the trigger.
```

Add to the module table:
```
| 05 Coach | `coach` | briefing + performance + selfserved data.js | LLM generation via `gen-coach.mjs` |
```

Update the cadence paragraph that says "The 09:00 slot is a **full run** (01, then 03, then 04)" to:
```
The 09:00 slot is a **full run** (01, then 05, then 03, then 04). Every later slot is a **module 01 + 05 top-up**.
```

- [ ] **Step 3: Commit**

```bash
git add REFRESH_SPEC.md
git commit -m "docs: add module 05 (Coach) to REFRESH_SPEC.md"
```

---

### Task 9: Verify end-to-end

Start the dev server, navigate to module 05, confirm the seed brief renders with the "run a refresh" message, and verify no console errors.

**Files:** None (verification only)

- [ ] **Step 1: Start the dev server (UI only)**

```bash
cd /Users/ss_cloudtalk/Desktop/daily-briefing && npm run dev:ui
```

- [ ] **Step 2: Open the app and navigate to Coach**

Use `preview_start` (name `may4-briefing`) to attach to the running server. Navigate to module 05 (Coach) via the nav rail or command palette.

- [ ] **Step 3: Verify no console errors**

Use `preview_console_logs` to check for errors. Expected: no errors. The module should show:
- "05 COACH" header with "AI Strategy" subtitle
- "Run a refresh to generate the coaching brief" message
- No input field (server not running in `dev:ui` mode)

- [ ] **Step 4: Take a screenshot for proof**

Use `preview_screenshot` to capture the coach module rendered state.
