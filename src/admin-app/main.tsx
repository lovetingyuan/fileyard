import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SWRConfig } from "swr";
import { AdminApp } from "./AdminApp";
import { appSWRConfig } from "./swrConfig";
import "./index.css";

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
    <SWRConfig value={appSWRConfig}>
      <AdminApp />
    </SWRConfig>
  </StrictMode>,
);
