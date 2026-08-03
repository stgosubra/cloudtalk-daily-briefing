import { useState, useEffect } from "react";
import MinutesCalc from "./MinutesCalc.jsx";
import CostCalc from "./CostCalc.jsx";

// Module 03 - Calculator hub. Two tabs over a shared blue palette:
//   Minutes  - per-user calling time estimator
//   Cost     - onboarding cost / quote estimator
const TABS = [
  { id: "minutes", label: "Minutes" },
  { id: "cost", label: "PAYG" },
];

export default function CalculatorModule({ intent }) {
  const [tab, setTab] = useState(intent?.tab === "cost" ? "cost" : "minutes");
  useEffect(() => {
    if (intent?.tab && ["minutes", "cost"].includes(intent.tab)) setTab(intent.tab);
  }, [intent]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#060810" }}>
      <div style={{
        display: "flex", gap: 6, padding: "12px 16px", flexShrink: 0,
        borderBottom: "1px solid rgba(80,130,255,0.12)", background: "#080c18",
      }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "7px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                fontFamily: "system-ui,-apple-system,sans-serif", cursor: "pointer",
                transition: "all .15s",
                background: on ? "rgba(26,86,255,0.14)" : "transparent",
                border: `1px solid ${on ? "rgba(80,130,255,0.38)" : "rgba(80,130,255,0.1)"}`,
                color: on ? "#4d82ff" : "rgba(180,205,255,0.5)",
                boxShadow: on ? "0 0 12px rgba(26,86,255,0.18)" : "none",
              }}>
              {t.label}
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === "minutes" ? <MinutesCalc /> : <CostCalc />}
      </div>
    </div>
  );
}
