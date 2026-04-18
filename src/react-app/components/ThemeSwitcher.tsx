import MdiBrightnessAuto from "~icons/mdi/brightness-auto";
import MdiMoonWaningCrescent from "~icons/mdi/moon-waning-crescent";
import MdiWhiteBalanceSunny from "~icons/mdi/white-balance-sunny";
import { useTheme } from "../hooks/useTheme";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const handleToggle = () => {
    const next: Record<string, "light" | "dark" | "system"> = {
      system: "light",
      light: "dark",
      dark: "system",
    };
    setTheme(next[theme]);
  };

  const icons = {
    light: MdiWhiteBalanceSunny,
    dark: MdiMoonWaningCrescent,
    system: MdiBrightnessAuto,
  };

  const labels = {
    light: "亮色",
    dark: "暗色",
    system: "系统",
  };

  const ThemeIcon = icons[theme];

  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost btn-circle"
      onClick={handleToggle}
      aria-label={`当前主题: ${labels[theme]}`}
      title={`切换主题 (当前: ${labels[theme]})`}
    >
      <ThemeIcon className="w-5 h-5" />
    </button>
  );
}
