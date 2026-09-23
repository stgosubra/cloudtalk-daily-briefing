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
          {"\u2192" + MODULE_LABEL[p.linkedModule]}
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
  const [serverUp, setServerUp] = useState(null);
  const answerRef = useRef(null);

  useEffect(() => {
    fetch("/api/coach/stream")
      .then((r) => setServerUp(r.status === 400 || r.status === 200))
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

  if (serverUp === false) return null;
  if (serverUp === null) return null;

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
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint }}>
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
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint }}>
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
