import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SWRConfig } from "swr";
import App from "./App.tsx";
import "./index.css";

// Initialize theme before React renders to prevent flash
function initTheme() {
  const stored = localStorage.getItem("theme-preference");
  const preference =
    stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const effectiveTheme = preference === "system" ? (isSystemDark ? "dark" : "light") : preference;
  const daisyTheme = effectiveTheme === "light" ? "emerald" : "forest";
  document.documentElement.setAttribute("data-theme", daisyTheme);
}

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SWRConfig value={{ shouldRetryOnError: false }}>
      <App />
    </SWRConfig>
  </StrictMode>,
);
