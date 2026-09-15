import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  Eye,
  BarChart3,
  Lock,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { adminService } from "../../services";
import Button from "../../components/common/Button";
import StatusBadge from "../../components/common/StatusBadge";
import AppLayout from "../../components/layout/AppLayout";
import {
  getClaimStatusMeta,
  getLostStatusMeta,
  getFoundStatusMeta,
  getMatchStatusMeta,
} from "../../utils/statusMaps";
import { LoadingState, EmptyState, ErrorState } from "../../components/common/StateViews";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("OVERVIEW");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [claims, setClaims] = useState([]);
  const [items, setItems] = useState([]);
  const [matches, setMatches] = useState([]);

  const [claimFilter, setClaimFilter] = useState("PENDING");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const isAdmin = user?.role === "ADMIN";

  const fetchAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [ovData, clData, itData, mtData] = await Promise.all([
        adminService.getAdminOverview(),
        adminService.getAdminClaims(),
        adminService.getAdminItems(),
        adminService.getAdminMatches(),
      ]);
      setOverview(ovData?.metrics || ovData);
      setClaims(clData || []);
      setItems(itData || []);
      setMatches(mtData || []);
      setError(null);
    } catch (err) {
      setError(err?.message || "Failed to load administration data.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isAdmin) return;
      try {
        const [ovData, clData, itData, mtData] = await Promise.all([
          adminService.getAdminOverview(),
          adminService.getAdminClaims(),
          adminService.getAdminItems(),
          adminService.getAdminMatches(),
        ]);
        if (!cancelled) {
          setOverview(ovData?.metrics || ovData);
          setClaims(clData || []);
          setItems(itData || []);
          setMatches(mtData || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load administration data.");
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
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="admin-page">
          <EmptyState
            icon={ShieldAlert}
            title="Campus Admin Authorization Required"
            message="This portal view is restricted to designated NIE campus authority and security personnel."
            action={
              <Link to="/dashboard">
                <Button variant="primary" size="sm">
                  Return to Student Dashboard
                </Button>
              </Link>
            }
          />
        </div>
      </AppLayout>
    );
  }

  const handleVerify = async (claimId) => {
    const instructions = window.prompt(
      "Enter item handover instructions for claimant:",
      "Please collect your item from South Campus Security Office between 10 AM - 4 PM with your NIE ID Card.",
    );
    if (!instructions) return;

    setActionLoadingId(claimId);
    try {
      await adminService.adminVerifyClaim(claimId, instructions);
      setClaims((prev) =>
        prev.map((c) => (c.claim_id === claimId ? { ...c, status: "VERIFIED" } : c)),
      );
      if (overview) {
        setOverview((prev) => ({
          ...prev,
          pendingClaims: Math.max(0, (prev.pendingClaims || 1) - 1),
          verifiedClaims: (prev.verifiedClaims || 0) + 1,
        }));
      }
    } catch (err) {
      alert(err?.message || "Verification failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (claimId) => {
    const reason = window.prompt(
      "Enter rejection reason:",
      "Submitted verification details do not match item characteristics recorded upon custody.",
    );
    if (!reason) return;

    setActionLoadingId(claimId);
    try {
      await adminService.adminRejectClaim(claimId, reason);
      setClaims((prev) =>
        prev.map((c) => (c.claim_id === claimId ? { ...c, status: "REJECTED", rejection_reason: reason } : c)),
      );
      if (overview) {
        setOverview((prev) => ({
          ...prev,
          pendingClaims: Math.max(0, (prev.pendingClaims || 1) - 1),
          rejectedClaims: (prev.rejectedClaims || 0) + 1,
        }));
      }
    } catch (err) {
      alert(err?.message || "Rejection failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusChange = async (type, itemId, newStatus) => {
    try {
      await adminService.adminUpdateItemStatus(type, itemId, newStatus);
      setItems((prev) =>
        prev.map((i) => (i.id === itemId && i.type === type ? { ...i, status: newStatus } : i)),
      );
    } catch (err) {
      alert(err?.message || "Failed to update item status");
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (claimFilter === "ALL") return true;
    return c.status === claimFilter;
  });

  return (
    <AppLayout>
      <div className="admin-page">
        {/* Header */}
      <div className="admin-header">
        <div>
          <span className="admin-header__badge">
            <Lock size={12} /> Campus Administration
          </span>
          <h1 className="admin-header__title">Lost & Found Oversight Panel</h1>
          <p className="admin-header__sub">
            The National Institute of Engineering, Mysuru • Item Verification & Campus Custody
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {[
          { key: "OVERVIEW", label: "Overview & Analytics", icon: BarChart3 },
          { key: "CLAIMS", label: `Claims (${claims.filter((c) => c.status === "PENDING").length} Pending)`, icon: ShieldCheck },
          { key: "ITEMS", label: `All Reports (${items.length})`, icon: FileText },
          { key: "MATCHES", label: `Automated Matches (${matches.length})`, icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              className={`admin-tab ${activeTab === tab.key ? "admin-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {loading && <LoadingState message="Loading administrative portal data..." />}
      {error && !loading && <ErrorState message={error} onRetry={fetchAdminData} />}

      {/* TAB 1: OVERVIEW */}
      {!loading && !error && activeTab === "OVERVIEW" && overview && (
        <div>
          <div className="admin-metrics-grid">
            <div className="admin-metric-box">
              <div className="admin-metric-box__title">Total Reports</div>
              <div className="admin-metric-box__val">{overview.totalReports || 0}</div>
            </div>
            <div className="admin-metric-box">
              <div className="admin-metric-box__title">Active Reports</div>
              <div className="admin-metric-box__val" style={{ color: "var(--color-primary)" }}>
                {overview.activeReports || 0}
              </div>
            </div>
            <div className="admin-metric-box">
              <div className="admin-metric-box__title">Pending Claims</div>
              <div className="admin-metric-box__val" style={{ color: "var(--color-warning)" }}>
                {overview.pendingClaims || 0}
              </div>
            </div>
            <div className="admin-metric-box">
              <div className="admin-metric-box__title">Verified Claims</div>
              <div className="admin-metric-box__val" style={{ color: "var(--color-success)" }}>
                {overview.verifiedClaims || 0}
              </div>
            </div>
            <div className="admin-metric-box">
              <div className="admin-metric-box__title">Items Returned</div>
              <div className="admin-metric-box__val" style={{ color: "var(--color-success)" }}>
                {overview.returnedItems || 0}
              </div>
            </div>
            <div className="admin-metric-box">
              <div className="admin-metric-box__title">Recovery Rate</div>
              <div className="admin-metric-box__val" style={{ color: "var(--color-primary)" }}>
                {overview.recoveryRate || 0}%
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)" }}>
            <div className="dashboard-section">
              <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, margin: "0 0 var(--space-3)" }}>
                Campus Item Recovery Lifecycle
              </h3>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                Active campus reports transition through automated matching, student ownership verification,
                and physical custody handover at the campus security desk.
              </p>
              <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)" }}>
                  <span>Lost Items Reported:</span>
                  <strong>{overview.totalLost || 0}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)" }}>
                  <span>Found Items in Custody:</span>
                  <strong>{overview.totalFound || 0}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)" }}>
                  <span>Rejected Claims:</span>
                  <strong>{overview.rejectedClaims || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLAIMS REVIEW */}
      {!loading && !error && activeTab === "CLAIMS" && (
        <div>
          <div className="my-reports-tabs" style={{ marginBottom: "var(--space-6)" }}>
            {["ALL", "PENDING", "VERIFIED", "REJECTED"].map((status) => (
              <button
                key={status}
                type="button"
                className={`report-tab ${claimFilter === status ? "report-tab--active" : ""}`}
                onClick={() => setClaimFilter(status)}
              >
                {status === "ALL" ? "All Claims" : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {filteredClaims.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Claims in Filter"
              message={`No ownership claims currently matching status: ${claimFilter}.`}
            />
          ) : (
            <div className="admin-card-list">
              {filteredClaims.map((claim) => {
                const meta = getClaimStatusMeta(claim.status);
                return (
                  <div key={claim.claim_id} className="admin-claim-card">
                    <div className="admin-claim-card__top">
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
                            {claim.found_item_name || `Found Item #${claim.found_item_id}`}
                          </h3>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                            • Claim #CLM-{claim.claim_id}
                          </span>
                        </div>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                          Submitted: {claim.created_at} • Claimant ID: {claim.claimant_user_id}
                        </p>
                      </div>

                      <StatusBadge
                        label={meta.label}
                        statusKey={claim.status}
                        tone={meta.tone}
                        icon={meta.icon}
                      />
                    </div>

                    {/* Private Evidence Box */}
                    <div className="admin-evidence-box">
                      <div className="admin-evidence-box__heading">
                        <Lock size={13} style={{ color: "var(--color-primary)" }} />
                        Confidential Ownership Evidence (Admin Review Only):
                      </div>
                      <p style={{ margin: "4px 0", color: "var(--color-text)" }}>
                        {claim.verification_details}
                      </p>
                      {claim.claimant_challenge_answer && (
                        <div style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)" }}>
                          <strong>Claimant Challenge Response:</strong> {claim.claimant_challenge_answer}
                        </div>
                      )}
                    </div>

                    {/* Admin Actions */}
                    <div className="admin-claim-actions">
                      <Link to={`/claims/${claim.claim_id}/chat`}>
                        <Button variant="outline" size="sm">
                          Open Claim Chat
                        </Button>
                      </Link>

                      {claim.status === "PENDING" && (
                        <>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={actionLoadingId === claim.claim_id}
                            onClick={() => handleReject(claim.claim_id)}
                          >
                            <XCircle size={14} /> Reject Claim
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={actionLoadingId === claim.claim_id}
                            onClick={() => handleVerify(claim.claim_id)}
                          >
                            <CheckCircle2 size={14} /> Verify & Approve Handover
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALL REPORTS TABLE */}
      {!loading && !error && activeTab === "ITEMS" && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>Date</th>
                <th>Status</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const isLost = it.type === "lost";
                const meta = isLost
                  ? getLostStatusMeta(it.status)
                  : getFoundStatusMeta(it.status);

                return (
                  <tr key={`${it.type}-${it.id}`}>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "11px",
                          color: isLost ? "var(--color-danger)" : "var(--color-success)",
                        }}
                      >
                        {isLost ? "LOST" : "FOUND"}
                      </span>
                    </td>
                    <td>
                      <strong>{it.item_name}</strong>
                    </td>
                    <td>{it.category}</td>
                    <td>{it.location}</td>
                    <td>{it.date}</td>
                    <td>
                      <StatusBadge
                        label={meta.label}
                        statusKey={it.status}
                        tone={meta.tone}
                        icon={meta.icon}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <Link to={`/items/${it.type}/${it.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye size={13} />
                          </Button>
                        </Link>
                        {it.status !== "RETURNED" && it.status !== "CLOSED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(
                                it.type,
                                it.id,
                                isLost ? "RECLAIMED" : "RETURNED",
                              )
                            }
                          >
                            Mark Handed Over
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: ALL MATCHES TABLE */}
      {!loading && !error && activeTab === "MATCHES" && (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Match Ref</th>
                <th>Lost Item</th>
                <th>Found Item</th>
                <th>Correlation Reason</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const meta = getMatchStatusMeta(m.status);
                return (
                  <tr key={m.match_id}>
                    <td>#MTC-{m.match_id}</td>
                    <td>{m.lost_item?.item_name || `#${m.lost_item_id}`}</td>
                    <td>{m.found_item?.item_name || `#${m.found_item_id}`}</td>
                    <td style={{ maxWidth: "320px", color: "var(--color-text-muted)" }}>
                      {m.match_reason}
                    </td>
                    <td>
                      <strong>{m.score}%</strong>
                    </td>
                    <td>
                      <StatusBadge
                        label={meta.label}
                        statusKey={m.status}
                        tone={meta.tone}
                        icon={meta.icon}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </AppLayout>
  );
}
