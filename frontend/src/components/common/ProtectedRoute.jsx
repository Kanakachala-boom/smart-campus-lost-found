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
import { LoadingState } from "./StateViews";

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitialising } = useAuth();
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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
