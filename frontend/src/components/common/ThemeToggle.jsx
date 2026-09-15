/**
 * Light/dark mode switch. The chosen theme persists across refreshes.
 */

import { Moon, Sun } from "lucide-react";
import useTheme from "../../hooks/useTheme";
import "./ThemeToggle.css";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

export default ThemeToggle;
