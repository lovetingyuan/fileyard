import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme-preference";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function getEffectiveTheme(preference: Theme): "light" | "dark" {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyTheme(effective: "light" | "dark") {
  const daisyTheme = effective === "light" ? "emerald" : "forest";
  document.documentElement.setAttribute("data-theme", daisyTheme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
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

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    setThemeState(newTheme);
  };

  return { theme, effectiveTheme, setTheme };
}
