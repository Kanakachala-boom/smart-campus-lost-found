import { Link, NavLink } from "react-router-dom";
import { ArrowLeft, Search, CheckCircle2, Shield } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import ThemeToggle from "../common/ThemeToggle";
import "./ReportHeader.css";

/**
 * Institutional header and mode switcher for Lost and Found item reporting.
 */
export function ReportHeader({ activeMode = "lost" }) {
  const { user } = useAuth();

  return (
    <header className="report-header">
      <div className="report-header__topbar">
        <div className="report-header__brand-group">
          <Link to="/" className="report-header__back-link" aria-label="Return to Home">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Home</span>
          </Link>
          <span className="report-header__divider" aria-hidden="true">/</span>
          <div className="report-header__institution">
            <Shield size={14} aria-hidden="true" className="report-header__shield-icon" />
            <span>The National Institute of Engineering</span>
          </div>
        </div>

        <div className="report-header__actions">
          {user && (
            <div className="report-header__user-badge">
              <span className="report-header__user-name">{user.name}</span>
              <span className="report-header__user-email">{user.email}</span>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>

      <div className="report-header__hero">
        <div className="report-header__title-section">
          <h1 className="report-header__title">Report Campus Item</h1>
          <p className="report-header__subtitle">
            Submit a lost or found report to facilitate automated matching and secure recovery across NIE Mysuru.
          </p>
        </div>

        {/* Tab switcher */}
        <nav className="report-nav" aria-label="Reporting Type Selection">
          <NavLink
            to="/report/lost"
            className={({ isActive }) =>
              `report-nav__tab ${
                isActive || activeMode === "lost" ? "report-nav__tab--active" : ""
              }`
            }
            end
          >
            <Search size={16} aria-hidden="true" className="report-nav__tab-icon" />
            <div className="report-nav__tab-content">
              <span className="report-nav__tab-title">Report Lost Item</span>
              <span className="report-nav__tab-desc">I misplaced something on campus</span>
            </div>
          </NavLink>

          <NavLink
            to="/report/found"
            className={({ isActive }) =>
              `report-nav__tab ${
                isActive || activeMode === "found" ? "report-nav__tab--active" : ""
              }`
            }
            end
          >
            <CheckCircle2 size={16} aria-hidden="true" className="report-nav__tab-icon" />
            <div className="report-nav__tab-content">
              <span className="report-nav__tab-title">Report Found Item</span>
              <span className="report-nav__tab-desc">I discovered an item to return</span>
            </div>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default ReportHeader;
