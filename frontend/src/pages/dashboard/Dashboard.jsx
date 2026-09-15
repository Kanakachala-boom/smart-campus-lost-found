import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  Bell,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  Clock,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { dashboardService } from "../../services";
import Button from "../../components/common/Button";
import StatusBadge from "../../components/common/StatusBadge";
import AppLayout from "../../components/layout/AppLayout";
import {
  getLostStatusMeta,
  getFoundStatusMeta,
  getClaimStatusMeta,
} from "../../utils/statusMaps";
import { LoadingState, ErrorState } from "../../components/common/StateViews";
import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getDashboardData(user?.user_id || 1);
      setData(res);
      setError(null);
    } catch (err) {
      setError(err?.message || "Failed to load campus dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await dashboardService.getDashboardData(user?.user_id || 1);
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load campus dashboard data.");
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

  if (loading) {
    return (
      <AppLayout>
        <div className="dashboard-page">
          <LoadingState message="Loading your campus portal overview..." />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="dashboard-page">
          <ErrorState message={error} onRetry={fetchDashboard} />
        </div>
      </AppLayout>
    );
  }

  const metrics = data?.metrics || {
    activeLost: 0,
    activeFound: 0,
    pendingClaims: 0,
    potentialMatches: 0,
    unreadNotifications: 0,
  };

  const recentReports = data?.recentReports || [];
  const recentClaims = data?.recentClaims || [];

  return (
    <AppLayout>
      <div className="dashboard-page">
        {/* Welcome Banner */}
      <div className="dashboard-welcome">
        <div>
          <h1 className="dashboard-welcome__greeting">
            Welcome, {user?.name || "NIE Student"}
          </h1>
          <p className="dashboard-welcome__sub">
            The National Institute of Engineering, Mysuru • Campus Lost & Found Portal
          </p>
        </div>
        <div className="dashboard-welcome__actions">
          <Link to="/report/lost">
            <Button variant="danger" size="sm">
              <PlusCircle size={15} /> Report Lost
            </Button>
          </Link>
          <Link to="/report/found">
            <Button variant="primary" size="sm">
              <PlusCircle size={15} /> Report Found
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="dashboard-metrics-grid">
        <Link to="/my-reports?type=lost" className="dashboard-metric-card">
          <div className="dashboard-metric-card__header">
            <span className="dashboard-metric-card__label">Active Lost Reports</span>
            <div className="dashboard-metric-card__icon" style={{ color: "var(--color-danger)" }}>
              <HelpCircle size={18} />
            </div>
          </div>
          <div className="dashboard-metric-card__value">{metrics.activeLost}</div>
        </Link>

        <Link to="/my-reports?type=found" className="dashboard-metric-card">
          <div className="dashboard-metric-card__header">
            <span className="dashboard-metric-card__label">Active Found Reports</span>
            <div className="dashboard-metric-card__icon" style={{ color: "var(--color-success)" }}>
              <Search size={18} />
            </div>
          </div>
          <div className="dashboard-metric-card__value">{metrics.activeFound}</div>
        </Link>

        <Link to="/my-claims" className="dashboard-metric-card">
          <div className="dashboard-metric-card__header">
            <span className="dashboard-metric-card__label">Pending Claims</span>
            <div className="dashboard-metric-card__icon" style={{ color: "var(--color-warning)" }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="dashboard-metric-card__value">{metrics.pendingClaims}</div>
        </Link>

        <Link to="/matches" className="dashboard-metric-card">
          <div className="dashboard-metric-card__header">
            <span className="dashboard-metric-card__label">Potential Matches</span>
            <div className="dashboard-metric-card__icon" style={{ color: "var(--color-primary)" }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div className="dashboard-metric-card__value">{metrics.potentialMatches}</div>
        </Link>

        <Link to="/notifications" className="dashboard-metric-card">
          <div className="dashboard-metric-card__header">
            <span className="dashboard-metric-card__label">Unread Alerts</span>
            <div className="dashboard-metric-card__icon" style={{ color: "var(--color-info)" }}>
              <Bell size={18} />
            </div>
          </div>
          <div className="dashboard-metric-card__value">{metrics.unreadNotifications}</div>
        </Link>
      </div>

      {/* Activity Grid */}
      <div className="dashboard-activity-grid">
        {/* Recent Reports */}
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <h2 className="dashboard-section__title">
              <FileText size={18} /> My Recent Item Reports
            </h2>
            <Link to="/my-reports" style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: 600 }}>
              View All
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", margin: "var(--space-4) 0" }}>
              You haven't reported any lost or found items yet.
            </p>
          ) : (
            <div className="dashboard-item-list">
              {recentReports.map((item) => {
                const isLost = item.type === "lost";
                const meta = isLost
                  ? getLostStatusMeta(item.status)
                  : getFoundStatusMeta(item.status);

                return (
                  <div key={`${item.type}-${item.id}`} className="dashboard-item-row">
                    <div className="dashboard-item-row__info">
                      <span className="dashboard-item-row__title">{item.item_name}</span>
                      <span className="dashboard-item-row__meta">
                        {isLost ? "🔴 Lost" : "🟢 Found"} • 📍 {item.location_lost || item.location_found || item.location || "NIE Campus"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <StatusBadge
                        label={meta.label}
                        statusKey={item.status}
                        tone={meta.tone}
                        icon={meta.icon}
                      />
                      <Link to={`/items/${item.type}/${item.id}`}>
                        <Button variant="ghost" size="sm">
                          <ArrowRight size={14} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Claims */}
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <h2 className="dashboard-section__title">
              <ShieldCheck size={18} /> My Recent Claims
            </h2>
            <Link to="/my-claims" style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: 600 }}>
              View All
            </Link>
          </div>

          {recentClaims.length === 0 ? (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", margin: "var(--space-4) 0" }}>
              You have not submitted any ownership claims.
            </p>
          ) : (
            <div className="dashboard-item-list">
              {recentClaims.map((claim) => {
                const meta = getClaimStatusMeta(claim.status);
                return (
                  <div key={claim.claim_id} className="dashboard-item-row">
                    <div className="dashboard-item-row__info">
                      <span className="dashboard-item-row__title">
                        {claim.found_item_name || `Claim #CLM-${claim.claim_id}`}
                      </span>
                      <span className="dashboard-item-row__meta">
                        Ref #CLM-{claim.claim_id} • {new Date(claim.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <StatusBadge
                        label={meta.label}
                        statusKey={claim.status}
                        tone={meta.tone}
                        icon={meta.icon}
                      />
                      <Link to={`/claims/${claim.claim_id}`}>
                        <Button variant="ghost" size="sm">
                          <ArrowRight size={14} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
