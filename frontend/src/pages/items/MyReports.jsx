import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, FilePlus2, Package } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import StatusBadge from "../../components/common/StatusBadge";
import Button from "../../components/common/Button";
import { LoadingState, ErrorState, EmptyState } from "../../components/common/StateViews";
import useAuth from "../../hooks/useAuth";
import reportsService from "../../services/reportsService";
import { ITEM_STATUS_META } from "../../utils/statusMaps";
import "./MyReports.css";

const REPORT_TABS = [
  { id: "ALL", label: "All Reports" },
  { id: "lost", label: "Lost Items" },
  { id: "found", label: "Found Items" },
  { id: "ACTIVE", label: "Active" },
  { id: "POTENTIAL_MATCH", label: "Matched" },
  { id: "RETURNED", label: "Returned / Reclaimed" },
];

export function MyReports() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      try {
        const response = await reportsService.getMyReports(user?.user_id);
        const data = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

        if (!cancelled) {
          setReports(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load your reported items.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (user) {
      loadReports();
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredReports = reports.filter((item) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "lost" || activeTab === "found") {
      return item.type === activeTab;
    }
    if (activeTab === "RETURNED") {
      return item.status === "RETURNED" || item.status === "RECLAIMED";
    }
    return item.status === activeTab;
  });

  const getTabCount = (tabId) => {
    if (tabId === "ALL") return reports.length;
    if (tabId === "lost" || tabId === "found") {
      return reports.filter((r) => r.type === tabId).length;
    }
    if (tabId === "RETURNED") {
      return reports.filter((r) => r.status === "RETURNED" || r.status === "RECLAIMED").length;
    }
    return reports.filter((r) => r.status === tabId).length;
  };

  return (
    <AppLayout>
      <div className="my-reports-page">
        <div className="my-reports-header">
          <div>
            <h1 className="my-reports-title">My Reported Items</h1>
            <p className="my-reports-sub">
              Manage your lost and found listings reported on the NIE campus.
            </p>
          </div>

          <div className="my-reports-header-actions">
            <Link to="/report/lost">
              <Button variant="outline" size="sm" icon={FilePlus2}>
                Report Lost
              </Button>
            </Link>
            <Link to="/report/found">
              <Button variant="primary" size="sm" icon={FilePlus2}>
                Report Found
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="my-reports-tabs" role="tablist" aria-label="Reports Filter">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`my-reports-tab ${activeTab === tab.id ? "my-reports-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="my-reports-tab__count">{getTabCount(tab.id)}</span>
            </button>
          ))}
        </div>

        {/* Content States */}
        {isLoading ? (
          <LoadingState message="Loading your reported listings…" />
        ) : error ? (
          <ErrorState
            title="Failed to Load Reports"
            message={error}
            onRetry={() => window.location.reload()}
          />
        ) : filteredReports.length === 0 ? (
          <EmptyState
            title={
              activeTab === "ALL"
                ? "You have not reported any items yet."
                : `No ${activeTab.toLowerCase()} reports found.`
            }
            message="Lost a belonging or found an unattended item on campus? Submit a report to initiate recovery."
            action={
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" onClick={() => navigate("/report/lost")}>
                  Report Lost Item
                </Button>
                <Button variant="outline" onClick={() => navigate("/report/found")}>
                  Report Found Item
                </Button>
              </div>
            }
          />
        ) : (
          <div className="my-reports-list">
            {filteredReports.map((item) => {
              const statusMeta = ITEM_STATUS_META[item.status] || {
                label: item.status,
                tone: "neutral",
              };
              const isLost = item.type === "lost";

              return (
                <div key={`${item.type}-${item.id}`} className="my-report-card">
                  <div className="my-report-card__left">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.item_name}
                        className="my-report-card__thumb"
                      />
                    ) : (
                      <div
                        className={`my-report-card__fallback ${
                          isLost ? "my-report-card__fallback--lost" : "my-report-card__fallback--found"
                        }`}
                        aria-hidden="true"
                      >
                        <Package size={30} />
                      </div>
                    )}

                    <div className="my-report-card__info">
                      <div className="my-report-card__pill-row">
                        <span
                          className={`my-report-card__type-pill ${
                            isLost ? "my-report-card__type-pill--lost" : "my-report-card__type-pill--found"
                          }`}
                        >
                          {isLost ? "LOST REPORT" : "FOUND REPORT"}
                        </span>
                        <span className="my-report-card__meta">#{item.id}</span>
                      </div>

                      <span className="my-report-card__name">{item.item_name}</span>

                      <span className="my-report-card__meta">
                        {item.location} • {item.date} • Category: {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="my-report-card__right">
                    <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                    <Link to={`/items/${item.type}/${item.id}`}>
                      <Button variant="outline" size="sm" icon={ExternalLink}>
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default MyReports;
