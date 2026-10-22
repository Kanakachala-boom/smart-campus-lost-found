/**
 * Application root.
 *
 * Configures ThemeProvider and AuthProvider contexts, router declarations,
 * and protected route barriers for The National Institute of Engineering, Mysuru.
 */

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import FoundationCheck from "./pages/FoundationCheck";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AuthTest from "./pages/auth/AuthTest";
import Dashboard from "./pages/dashboard/Dashboard";
import ReportLost from "./pages/items/ReportLost";
import ReportFound from "./pages/items/ReportFound";
import ItemsFeed from "./pages/items/ItemsFeed";
import ItemDetail from "./pages/items/ItemDetail";
import MyReports from "./pages/items/MyReports";
import MatchesFeed from "./pages/items/MatchesFeed";
import ClaimPage from "./pages/claims/ClaimPage";
import MyClaims from "./pages/claims/MyClaims";
import ClaimDetail from "./pages/claims/ClaimDetail";
import ClaimChat from "./pages/chat/ClaimChat";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import useAuth from "./hooks/useAuth";
import { ErrorState, LoadingState } from "./components/common/StateViews";
import Button from "./components/common/Button";
import AdminDashboard from "./pages/admin/AdminDashboard";

import LiveNotificationToast from "./components/common/LiveNotificationToast";

function RootRoute() {
  const {
    isAuthenticated,
    isInitialising,
    isAdmin,
    sessionError,
    retrySession,
    clearSession,
    token,
  } = useAuth();

  if (isInitialising) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoadingState message="Checking campus session…" />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--spacing-lg, 1.5rem)",
          gap: "1.25rem",
        }}
      >
        <ErrorState
          title="Campus Server Unavailable"
          message={sessionError}
          onRetry={retrySession}
        />
        {token && (
          <Button variant="ghost" size="sm" onClick={clearSession}>
            Clear saved session & go to Login
          </Button>
        )}
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  return <Navigate to="/login" replace />;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <LiveNotificationToast />
          <a className="skip-link" href="#main-content">
            Skip to main content
          </a>
          <main id="main-content">
            <Routes>
              {/* Root directs to /login when unauthenticated, or appropriate dashboard when logged in */}
              <Route path="/" element={<RootRoute />} />

              {/* NIE Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/auth-test"
                element={
                  <ProtectedRoute>
                    <AuthTest />
                  </ProtectedRoute>
                }
              />

              {/* Student Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Stage 4 Browse & Search Items Routes (Protected) */}
              <Route
                path="/items"
                element={
                  <ProtectedRoute>
                    <ItemsFeed />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/items/:type/:id"
                element={
                  <ProtectedRoute>
                    <ItemDetail />
                  </ProtectedRoute>
                }
              />

              {/* Stage 5 Ownership Claim Submission (Protected) */}
              <Route
                path="/items/found/:id/claim"
                element={
                  <ProtectedRoute>
                    <ClaimPage />
                  </ProtectedRoute>
                }
              />

              {/* User Reports & Claims Tracking */}
              <Route
                path="/my-reports"
                element={
                  <ProtectedRoute>
                    <MyReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-claims"
                element={
                  <ProtectedRoute>
                    <MyClaims />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/claims/:claimId"
                element={
                  <ProtectedRoute>
                    <ClaimDetail />
                  </ProtectedRoute>
                }
              />

              {/* Stage 5 / Stage 6 Claim-based Private Chat */}
              <Route
                path="/claims/:claimId/chat"
                element={
                  <ProtectedRoute>
                    <ClaimChat />
                  </ProtectedRoute>
                }
              />

              {/* Stage 6 Automated Matching */}
              <Route
                path="/matches"
                element={
                  <ProtectedRoute>
                    <MatchesFeed />
                  </ProtectedRoute>
                }
              />

              {/* Targeted Notifications System */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Stage 3 Item Reporting Routes (Protected) */}
              <Route path="/report" element={<Navigate to="/report/lost" replace />} />
              <Route
                path="/report/lost"
                element={
                  <ProtectedRoute>
                    <ReportLost />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/report/found"
                element={
                  <ProtectedRoute>
                    <ReportFound />
                  </ProtectedRoute>
                }
              />

              {/* Campus Admin Oversight */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Stage 1 Foundation Diagnostic */}
              <Route path="/foundation-check" element={<FoundationCheck />} />

              {/* Fallback */}
              <Route path="*" element={<RootRoute />} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
