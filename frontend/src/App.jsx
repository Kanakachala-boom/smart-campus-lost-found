/**
 * Application root.
 *
 * Configures ThemeProvider and AuthProvider contexts, router declarations,
 * and protected route barriers.
 */

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import FoundationCheck from "./pages/FoundationCheck";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AuthTest from "./pages/auth/AuthTest";

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
              {/* Stage 1 Foundation Demo */}
              <Route path="/" element={<FoundationCheck />} />

              {/* Stage 2 Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/auth-test"
                element={
                  <ProtectedRoute>
                    <AuthTest />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
