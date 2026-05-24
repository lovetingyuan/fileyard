import { useEffect } from "react";
import type { ThemePreference } from "../../types";
import { getStoreMethods, useAppStore } from "../store";

const STORAGE_KEY = "theme-preference";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getEffectiveTheme(preference: ThemePreference): "light" | "dark" {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyTheme(effective: "light" | "dark") {
  const daisyTheme = effective === "light" ? "emerald" : "forest";
  document.documentElement.setAttribute("data-theme", daisyTheme);
}

export function useTheme() {
  const { themePreference: theme } = useAppStore();
  const effectiveTheme = getEffectiveTheme(theme);

  useEffect(() => {
    applyTheme(effectiveTheme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme(getSystemTheme());
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, effectiveTheme]);

  const setTheme = (newTheme: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    getStoreMethods().setThemePreference(newTheme);
  };

  return { theme, effectiveTheme, setTheme };
}
