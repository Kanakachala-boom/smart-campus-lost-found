/**
 * ProtectedRoute component.
 *
 * Route guard that requires an active authentication session.
 * - While the session state is initialising (e.g. on page refresh), displays a clean loading state.
 * - If unauthenticated, redirects to /login preserving the requested path in location state.
 * - If authenticated, renders the protected child components.
 */

import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { ErrorState, LoadingState } from "./StateViews";
import Button from "./Button";

export function ProtectedRoute({ children }) {
  const {
    isAuthenticated,
    isInitialising,
    sessionError,
    retrySession,
    clearSession,
    token,
  } = useAuth();
  const location = useLocation();

  if (isInitialising) {
    return (
      <div
        style={{
          minHeight: "60vh",
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
          minHeight: "60vh",
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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
