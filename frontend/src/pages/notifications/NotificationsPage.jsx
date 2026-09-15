import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CheckCheck,
  ExternalLink,
  Inbox,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { notificationsService } from "../../services";
import Button from "../../components/common/Button";
import AppLayout from "../../components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "../../components/common/StateViews";
import "./NotificationsPage.css";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationsService.getNotifications(user?.user_id || 1);
      const data = response?.data || response || [];
      setNotifications(data);
      setError(null);
    } catch (err) {
      setError(err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await notificationsService.getNotifications(user?.user_id || 1);
        if (!cancelled) {
          const data = response?.data || response || [];
          setNotifications(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load notifications.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleMarkAsRead = async (notificationId) => {
    setUpdatingId(notificationId);
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n)),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead(user?.user_id || 1);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "POTENTIAL_MATCH":
        return <Sparkles size={18} style={{ color: "var(--color-primary)" }} />;
      case "CLAIM_VERIFIED":
        return <CheckCircle2 size={18} style={{ color: "var(--color-success)" }} />;
      case "CLAIM_REJECTED":
        return <AlertTriangle size={18} style={{ color: "var(--color-danger)" }} />;
      case "CLAIM_SUBMITTED":
        return <Clock size={18} style={{ color: "var(--color-warning)" }} />;
      default:
        return <Bell size={18} style={{ color: "var(--color-primary)" }} />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "UNREAD") return !n.is_read;
    if (activeTab === "MATCHES") return n.type === "POTENTIAL_MATCH";
    if (activeTab === "CLAIMS") return n.type.startsWith("CLAIM_");
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AppLayout>
      <div className="notifications-page">
      <div className="notifications-page__header">
        <div className="notifications-page__title-group">
          <Bell size={24} style={{ color: "var(--color-primary)" }} />
          <h1 className="notifications-page__title">Notifications</h1>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                backgroundColor: "var(--color-primary-soft)",
                color: "var(--color-primary)",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--color-primary-soft-border)",
              }}
            >
              {unreadCount} Unread
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            <CheckCheck size={14} /> Mark All as Read
          </Button>
        )}
      </div>

      <div className="notifications-page__tabs">
        {[
          { key: "ALL", label: "All" },
          { key: "UNREAD", label: `Unread (${unreadCount})` },
          { key: "MATCHES", label: "Potential Matches" },
          { key: "CLAIMS", label: "Claims" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`notifications-page__tab ${
              activeTab === tab.key ? "notifications-page__tab--active" : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <LoadingState message="Loading your campus notifications..." />}

      {error && !loading && <ErrorState message={error} onRetry={fetchNotifications} />}

      {!loading && !error && filteredNotifications.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="No Notifications"
          message={
            activeTab === "UNREAD"
              ? "You are all caught up! No unread notifications."
              : "No campus alerts or match notifications to display."
          }
          action={
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                Go to Dashboard
              </Button>
            </Link>
          }
        />
      )}

      {!loading && !error && filteredNotifications.length > 0 && (
        <div className="notifications-page__list">
          {filteredNotifications.map((n) => (
            <div
              key={n.notification_id}
              className={`notification-row ${!n.is_read ? "notification-row--unread" : ""}`}
            >
              {!n.is_read && <div className="notification-row__unread-dot" />}
              <div className="notification-row__icon-box">{getIconForType(n.type)}</div>

              <div className="notification-row__content">
                <div className="notification-row__top">
                  <h3 className="notification-row__title">{n.title}</h3>
                  <span className="notification-row__time">
                    {new Date(n.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="notification-row__message">{n.message}</p>

                <div className="notification-row__actions">
                  {n.target_url && (
                    <Link to={n.target_url}>
                      <Button variant="primary" size="sm">
                        View Details <ExternalLink size={12} />
                      </Button>
                    </Link>
                  )}

                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={updatingId === n.notification_id}
                      onClick={() => handleMarkAsRead(n.notification_id)}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AppLayout>
  );
}
