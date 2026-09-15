/**
 * Application root.
 *
 * Provider order matters: ThemeProvider sits outermost so every screen below
 * it renders with the correct theme tokens.
 *
 * This stage registers a single placeholder route only. Real routing, route
 * guards and the application layout are built in a later stage.
 */

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import FoundationCheck from "./pages/FoundationCheck";

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <a className="skip-link" href="#main-content">
            Skip to main content
          </a>
          <main id="main-content">
            <Routes>
              <Route path="/" element={<FoundationCheck />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
