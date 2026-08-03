// Phase 0 router shell. The original daily-briefing component lives untouched
// at src/modules/briefing/BriefingModule.jsx and renders inside Shell as the
// first module. New modules (Pipeline, Forecast, Library, etc.) get built into
// their own files under src/modules/ in subsequent phases.
//
// Dev hash gate: when window.location.hash === "#design", render the design
// system probe instead of the shell. Used to verify Phase 1 primitives.
import { useEffect, useState } from "react";
import Shell from "./Shell.jsx";
import DesignProbe from "./design/DesignProbe.jsx";

export default function App() {
  const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  if (hash === "#design") return <DesignProbe />;
  return <Shell />;
}
