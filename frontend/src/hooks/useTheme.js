import { useContext } from "react";
import ThemeContext from "../context/ThemeContext";

/** Access and toggle the active theme. Throws outside ThemeProvider. */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}

export default useTheme;
