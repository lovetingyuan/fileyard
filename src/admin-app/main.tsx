import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SWRConfig } from "swr";
import { AdminApp } from "./AdminApp";
import { readAdminUsersSearchParams } from "./utils/adminUsers";
import "../shared/styles/index.css";

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

const { page, pageSize } = readAdminUsersSearchParams(window.location.search);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SWRConfig value={{ shouldRetryOnError: false }}>
      <AdminApp page={page} pageSize={pageSize} />
    </SWRConfig>
  </StrictMode>,
);
