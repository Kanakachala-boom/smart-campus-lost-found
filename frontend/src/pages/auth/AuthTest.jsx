/**
 * Temporary Protected Route Test Page — Stage 2 Verification ONLY.
 *
 * This page is protected by ProtectedRoute. It verifies that an authenticated
 * user session is maintained, displays non-sensitive user profile attributes,
 * and allows testing logout.
 *
 * THIS IS NOT THE APPLICATION DASHBOARD.
 */

import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  GraduationCap,
  LogOut,
} from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import ThemeToggle from "../../components/common/ThemeToggle";
import useAuth from "../../hooks/useAuth";
import { TONES } from "../../utils/statusMaps";
import "./AuthTest.css";

export function AuthTest() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="auth-test-page">
      <header className="auth-test-header">
        <div className="auth-test-header__brand">
          <GraduationCap size={22} className="auth-test-header__icon" aria-hidden="true" />
          <span>Smart Campus Lost &amp; Found</span>
        </div>
        <div className="auth-test-header__actions">
          <ThemeToggle />
          <Button
            variant="secondary"
            size="sm"
            icon={LogOut}
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="auth-test-container">
        <div className="auth-test-banner">
          <span className="auth-test-badge">Stage 2 Verification</span>
          <h1 className="auth-test-title">Protected Route Test</h1>
          <p className="auth-test-subtitle">
            This route is protected by <code>ProtectedRoute</code>. Access is only
            permitted with an active authentication session.
          </p>
        </div>

        <div className="auth-test-grid">
          <Card title="Authentication Status" className="auth-test-card">
            <div className="auth-test-status-row">
              <div className="auth-test-status-indicator">
                <CheckCircle2
                  size={24}
                  className="auth-test-status-icon"
                  aria-hidden="true"
                />
                <div>
                  <h4 className="auth-test-status-title">Session Active</h4>
                  <p className="auth-test-status-desc">
                    JWT access token is verified and persisted in storage.
                  </p>
                </div>
              </div>
              <StatusBadge
                label={isAuthenticated ? "AUTHENTICATED" : "UNAUTHENTICATED"}
                tone={isAuthenticated ? TONES.SUCCESS : TONES.DANGER}
              />
            </div>
          </Card>

          <Card title="Current User Details" className="auth-test-card">
            <dl className="auth-test-dl">
              <div className="auth-test-dl-row">
                <dt className="auth-test-dt">Full Name</dt>
                <dd className="auth-test-dd font-semibold">{user?.name || "N/A"}</dd>
              </div>

              <div className="auth-test-dl-row">
                <dt className="auth-test-dt">Email</dt>
                <dd className="auth-test-dd">{user?.email || "N/A"}</dd>
              </div>

              <div className="auth-test-dl-row">
                <dt className="auth-test-dt">Role</dt>
                <dd className="auth-test-dd">
                  <StatusBadge
                    label={user?.role || "STUDENT"}
                    tone={TONES.INFO}
                  />
                </dd>
              </div>

              <div className="auth-test-dl-row">
                <dt className="auth-test-dt">Phone Number</dt>
                <dd className="auth-test-dd">{user?.phone || "Not provided"}</dd>
              </div>

              <div className="auth-test-dl-row">
                <dt className="auth-test-dt">User ID</dt>
                <dd className="auth-test-dd">
                  <code>#{user?.user_id ?? "N/A"}</code>
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Verification Controls" className="auth-test-card">
            <div className="auth-test-actions-list">
              <p className="auth-test-desc">
                Test the Stage 2 authentication lifecycle:
              </p>
              <div className="auth-test-btn-group">
                <Button
                  variant="danger"
                  size="md"
                  icon={LogOut}
                  onClick={handleLogout}
                >
                  Test Log Out
                </Button>
                <Link to="/">
                  <Button variant="secondary" size="md">
                    Foundation Check
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="ghost" size="md">
                    Go to Login Page
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default AuthTest;
