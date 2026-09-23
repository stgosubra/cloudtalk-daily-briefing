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
  const b = data.briefing;
  sections.push(`## Module 01 - Today\nTODAY_ISO: ${b.TODAY_ISO}\nREFRESHED_AT: ${b.REFRESHED_AT}\nWEEK_PROSPECTS: ${JSON.stringify(b.WEEK_PROSPECTS)}\nWEEK_OTHER_EVENTS: ${JSON.stringify(b.WEEK_OTHER_EVENTS)}`);
  if (data.performance.PERFORMANCE) {
    sections.push(`## Module 03 - Performance\n${JSON.stringify(data.performance.PERFORMANCE)}`);
  }
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
