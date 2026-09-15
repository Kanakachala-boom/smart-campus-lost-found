/**
 * Theme state.
 *
 * The theme is applied by setting data-theme on <html>, which swaps the
 * semantic colour tokens in styles/tokens.css. No component needs to know
 * which theme is active in order to render correctly.
 *
 * Preference order: saved choice -> operating system preference -> light.
 */

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { THEMES } from "../utils/constants";
import { readStorage, writeStorage, STORAGE_KEYS } from "../utils/storage";

const ThemeContext = createContext(null);

function getInitialTheme() {
  const saved = readStorage(STORAGE_KEYS.THEME);
  if (saved === THEMES.LIGHT || saved === THEMES.DARK) return saved;

  // The campus system defaults to the light theme when first opened
  return THEMES.LIGHT;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (next !== THEMES.LIGHT && next !== THEMES.DARK) return;
    setThemeState(next);
    writeStorage(STORAGE_KEYS.THEME, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
      writeStorage(STORAGE_KEYS.THEME, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark: theme === THEMES.DARK }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export default ThemeContext;
