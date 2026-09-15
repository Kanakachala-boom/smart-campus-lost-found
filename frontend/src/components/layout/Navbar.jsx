import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  FilePlus2,
  FileSearch,
  FolderHeart,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import ThemeToggle from "../common/ThemeToggle";
import Button from "../common/Button";
import notificationsService from "../../services/notificationsService";
import "./Navbar.css";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  const notifRef = useRef(null);

  const isAdmin = user?.role === "ADMIN";

  // Load unread count and latest notifications
  useEffect(() => {
    let cancelled = false;

    async function fetchNotifications() {
      try {
        const countRes = await notificationsService.getUnreadCount(user?.user_id);
        const listRes = await notificationsService.getNotifications(user?.user_id);
        if (!cancelled) {
          setUnreadCount(countRes?.unread_count || 0);
          setRecentNotifs(Array.isArray(listRes) ? listRes.slice(0, 4) : []);
        }
      } catch {
        // Degrade gracefully
      }
    }

    if (user) {
      fetchNotifications();
    }

    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead(user?.user_id);
      setUnreadCount(0);
      setRecentNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Degrade gracefully
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="app-navbar">
      <div className="app-navbar__inner">
        {/* Brand Group */}
        <Link to="/dashboard" className="app-navbar__brand">
          <div className="app-navbar__logo-icon" aria-hidden="true">
            <Shield size={20} />
          </div>
          <div className="app-navbar__brand-text">
            <span className="app-navbar__brand-title">Smart Campus Lost & Found</span>
            <span className="app-navbar__brand-sub">The National Institute of Engineering</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="app-navbar__nav" aria-label="Main Navigation">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `app-navbar__link ${isActive ? "app-navbar__link--active" : ""}`
            }
          >
            <LayoutDashboard size={15} aria-hidden="true" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/items"
            className={({ isActive }) =>
              `app-navbar__link ${isActive ? "app-navbar__link--active" : ""}`
            }
          >
            <FileSearch size={15} aria-hidden="true" />
            <span>Browse Items</span>
          </NavLink>

          <NavLink
            to="/my-reports"
            className={({ isActive }) =>
              `app-navbar__link ${isActive ? "app-navbar__link--active" : ""}`
            }
          >
            <FolderHeart size={15} aria-hidden="true" />
            <span>My Reports</span>
          </NavLink>

          <NavLink
            to="/my-claims"
            className={({ isActive }) =>
              `app-navbar__link ${isActive ? "app-navbar__link--active" : ""}`
            }
          >
            <ShieldCheck size={15} aria-hidden="true" />
            <span>My Claims</span>
          </NavLink>

          <NavLink
            to="/matches"
            className={({ isActive }) =>
              `app-navbar__link ${isActive ? "app-navbar__link--active" : ""}`
            }
          >
            <Sparkles size={15} aria-hidden="true" />
            <span>Matches</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `app-navbar__link app-navbar__link--admin ${
                  isActive ? "app-navbar__link--active" : ""
                }`
              }
            >
              <Shield size={15} aria-hidden="true" />
              <span>Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Right Section: Notifications, Theme, User, Logout */}
        <div className="app-navbar__actions">
          {/* Notification Bell with Dropdown */}
          <div className="notif-bell-container" ref={notifRef}>
            <button
              type="button"
              className={`notif-bell-btn ${showNotifDropdown ? "notif-bell-btn--active" : ""}`}
              onClick={() => setShowNotifDropdown((prev) => !prev)}
              aria-label={`Notifications: ${unreadCount} unread`}
              aria-expanded={showNotifDropdown}
            >
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {showNotifDropdown && (
              <div className="notif-dropdown" role="region" aria-label="Recent notifications">
                <div className="notif-dropdown__header">
                  <h3 className="notif-dropdown__title">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="notif-dropdown__clear"
                      onClick={handleMarkAllRead}
                    >
                      <CheckCheck size={13} style={{ display: "inline", marginRight: 4 }} />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="notif-dropdown__list">
                  {recentNotifs.length === 0 ? (
                    <div className="notif-dropdown__empty">No notifications yet.</div>
                  ) : (
                    recentNotifs.map((notif) => (
                      <Link
                        key={notif.notification_id}
                        to={notif.target_url || "/notifications"}
                        className={`notif-item ${!notif.is_read ? "notif-item--unread" : ""}`}
                        onClick={() => setShowNotifDropdown(false)}
                      >
                        <div className="notif-item__top">
                          <span className="notif-item__title">{notif.title}</span>
                          <span className="notif-item__time">{notif.created_at?.split(" ")[0]}</span>
                        </div>
                        <span className="notif-item__message">{notif.message}</span>
                      </Link>
                    ))
                  )}
                </div>

                <div className="notif-dropdown__footer">
                  <Link
                    to="/notifications"
                    className="notif-dropdown__view-all"
                    onClick={() => setShowNotifDropdown(false)}
                  >
                    View All Notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          <ThemeToggle />

          {/* User Badge */}
          {user && (
            <div className="app-navbar__user-badge">
              <span className="app-navbar__user-name">{user.name}</span>
              <span
                className={`app-navbar__user-role ${
                  isAdmin ? "app-navbar__user-role--admin" : ""
                }`}
              >
                {isAdmin ? "Admin" : "Student"}
              </span>
            </div>
          )}

          {/* Logout button desktop */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            icon={LogOut}
            aria-label="Log out of NIE Lost and Found"
            style={{ display: "none" }}
            className="app-navbar__desktop-logout"
          >
            Logout
          </Button>

          {/* Mobile Hamburger */}
          <button
            type="button"
            className="app-navbar__hamburger"
            onClick={() => setShowMobileDrawer(true)}
            aria-label="Open navigation menu"
            aria-expanded={showMobileDrawer}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {showMobileDrawer && (
        <div
          className="app-drawer-overlay"
          onClick={() => setShowMobileDrawer(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      {showMobileDrawer && (
        <div className="app-drawer" role="dialog" aria-modal="true" aria-label="Navigation Menu">
          <div className="app-drawer__header">
            <span className="app-navbar__brand-title">NIE Lost & Found</span>
            <button
              type="button"
              className="app-drawer__close"
              onClick={() => setShowMobileDrawer(false)}
              aria-label="Close menu"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <nav className="app-drawer__nav" onClick={() => setShowMobileDrawer(false)}>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `app-drawer__link ${isActive ? "app-drawer__link--active" : ""}`
              }
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/items"
              className={({ isActive }) =>
                `app-drawer__link ${isActive ? "app-drawer__link--active" : ""}`
              }
            >
              <FileSearch size={18} aria-hidden="true" />
              <span>Browse Items</span>
            </NavLink>

            <NavLink
              to="/report/lost"
              className={({ isActive }) =>
                `app-drawer__link ${isActive ? "app-drawer__link--active" : ""}`
              }
            >
              <FilePlus2 size={18} aria-hidden="true" />
              <span>Report Lost Item</span>
            </NavLink>

            <NavLink
              to="/report/found"
              className={({ isActive }) =>
                `app-drawer__link ${isActive ? "app-drawer__link--active" : ""}`
              }
            >
              <FilePlus2 size={18} aria-hidden="true" />
              <span>Report Found Item</span>
            </NavLink>

            <NavLink
              to="/my-reports"
              className={({ isActive }) =>
                `app-drawer__link ${isActive ? "app-drawer__link--active" : ""}`
              }
            >
              <FolderHeart size={18} aria-hidden="true" />
              <span>My Reports</span>
            </NavLink>

            <NavLink
              to="/my-claims"
              className={({ isActive }) =>
                `app-drawer__link ${isActive ? "app-drawer__link--active" : ""}`
              }
            >
              <ShieldCheck size={18} aria-hidden="true" />
              <span>My Claims</span>
            </NavLink>

            <NavLink
              to="/matches"
              className={({ isActive }) =>
                `app-drawer__link ${isActive ? "app-drawer__link--active" : ""}`
              }
            >
              <Sparkles size={18} aria-hidden="true" />
              <span>Potential Matches</span>
            </NavLink>

            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                `app-drawer__link ${isActive ? "app-drawer__link--active" : ""}`
              }
            >
              <Bell size={18} aria-hidden="true" />
              <span>Notifications ({unreadCount})</span>
            </NavLink>

            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `app-drawer__link ${isActive ? "app-drawer__link--active" : ""}`
                }
              >
                <Shield size={18} aria-hidden="true" />
                <span>Admin Dashboard</span>
              </NavLink>
            )}
          </nav>

          <div className="app-drawer__footer">
            {user && (
              <div className="app-navbar__user-badge" style={{ display: "flex", alignItems: "flex-start" }}>
                <span className="app-navbar__user-name">{user.name}</span>
                <span className="app-navbar__brand-sub">{user.email}</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} icon={LogOut} fullWidth>
              Logout
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
