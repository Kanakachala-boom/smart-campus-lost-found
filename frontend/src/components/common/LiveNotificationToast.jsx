import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  CheckCircle,
  X,
  ExternalLink,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import notificationsService from "../../services/notificationsService";
import "./LiveNotificationToast.css";

export default function LiveNotificationToast() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeToasts, setActiveToasts] = useState([]);
  const seenIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setActiveToasts([]);
      seenIdsRef.current.clear();
      initialLoadRef.current = true;
      return;
    }

    let isMounted = true;

    async function pollNotifications() {
      try {
        const notifs = await notificationsService.getNotifications(user.user_id);
        if (!isMounted || !Array.isArray(notifs)) return;

        // On first load, record existing unread notifications so we don't spam toasts
        if (initialLoadRef.current) {
          notifs.forEach((n) => seenIdsRef.current.add(n.notification_id || n.id));
          initialLoadRef.current = false;
          return;
        }

        // Detect newly arrived unread notifications
        const incoming = notifs.filter((n) => {
          const id = n.notification_id || n.id;
          return !n.is_read && !seenIdsRef.current.has(id);
        });

        if (incoming.length > 0) {
          incoming.forEach((n) => {
            const id = n.notification_id || n.id;
            seenIdsRef.current.add(id);
          });

          setActiveToasts((prev) => [...prev, ...incoming].slice(-3)); // Keep maximum 3 on screen
        }
      } catch {
        // Silently handle temporary connection blips
      }
    }

    pollNotifications();
    const interval = setInterval(pollNotifications, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, user]);

  const dismissToast = (id) => {
    setActiveToasts((prev) => prev.filter((t) => (t.notification_id || t.id) !== id));
  };

  const handleToastClick = async (toast) => {
    const id = toast.notification_id || toast.id;
    try {
      await notificationsService.markAsRead(id);
    } catch {
      // Degrade gracefully
    }
    dismissToast(id);

    const target = toast.target_url || (toast.item_id ? `/items/${toast.item_type || "found"}/${toast.item_id}` : "/notifications");
    navigate(target);
  };

  if (activeToasts.length === 0) return null;

  return (
    <div className="live-toast-container" aria-live="polite" aria-atomic="true">
      {activeToasts.map((toast) => {
        const id = toast.notification_id || toast.id;
        const type = toast.type || "INFO";

        let Icon = Bell;
        let badgeClass = "badge-info";
        if (type === "POTENTIAL_MATCH") {
          Icon = Sparkles;
          badgeClass = "badge-match";
        } else if (type === "CLAIM_VERIFIED" || type === "HANDOVER_COMPLETED") {
          Icon = ShieldCheck;
          badgeClass = "badge-success";
        } else if (type === "NEW_MESSAGE") {
          Icon = MessageSquare;
          badgeClass = "badge-message";
        } else if (type === "REPORT_CONFIRMED") {
          Icon = CheckCircle;
          badgeClass = "badge-confirm";
        }

        return (
          <div key={id} className={`live-toast-card ${badgeClass}`}>
            <div className="live-toast-card__icon" aria-hidden="true">
              <Icon size={18} />
            </div>
            <div
              className="live-toast-card__body"
              onClick={() => handleToastClick(toast)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleToastClick(toast)}
            >
              <div className="live-toast-card__header">
                <span className="live-toast-card__title">{toast.title || "Campus Notification"}</span>
                <span className="live-toast-card__time">Just now</span>
              </div>
              <p className="live-toast-card__message">{toast.message}</p>
              <span className="live-toast-card__link">
                View Details <ExternalLink size={12} />
              </span>
            </div>
            <button
              type="button"
              className="live-toast-card__close"
              onClick={() => dismissToast(id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
