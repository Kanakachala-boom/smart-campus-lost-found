import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileSearch,
  MessageSquare,
  Package,
  ShieldCheck,
} from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import StatusBadge from "../../components/common/StatusBadge";
import Button from "../../components/common/Button";
import { LoadingState, ErrorState, EmptyState } from "../../components/common/StateViews";
import useAuth from "../../hooks/useAuth";
import claimsService from "../../services/claimsService";
import { CLAIM_STATUS } from "../../utils/constants";
import { CLAIM_STATUS_META } from "../../utils/statusMaps";
import "./MyClaims.css";

const TABS = [
  { id: "ALL", label: "All Claims" },
  { id: CLAIM_STATUS.PENDING, label: "Pending" },
  { id: CLAIM_STATUS.VERIFIED, label: "Verified" },
  { id: CLAIM_STATUS.REJECTED, label: "Rejected" },
];

export function MyClaims() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [claims, setClaims] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadClaims() {
      try {
        const response = await claimsService.getMyClaims(user?.user_id);
        const data = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

        if (!cancelled) {
          setClaims(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load your submitted claims.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (user) {
      loadClaims();
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredClaims = claims.filter((claim) => {
    if (activeTab === "ALL") return true;
    return claim.status === activeTab;
  });

  const getTabCount = (tabId) => {
    if (tabId === "ALL") return claims.length;
    return claims.filter((c) => c.status === tabId).length;
  };

  return (
    <AppLayout>
      <div className="my-claims-page">
        <div className="my-claims-header">
          <h1 className="my-claims-title">My Submitted Claims</h1>
          <p className="my-claims-sub">
            Track ownership verification reviews and collection instructions for items you claimed.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="my-claims-tabs" role="tablist" aria-label="Claims Filter">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`my-claims-tab ${activeTab === tab.id ? "my-claims-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="my-claims-tab__badge">{getTabCount(tab.id)}</span>
            </button>
          ))}
        </div>

        {/* Content States */}
        {isLoading ? (
          <LoadingState message="Loading your claim records…" />
        ) : error ? (
          <ErrorState
            title="Failed to Load Claims"
            message={error}
            onRetry={() => window.location.reload()}
          />
        ) : filteredClaims.length === 0 ? (
          <EmptyState
            title={
              activeTab === "ALL"
                ? "You have not submitted any item claims."
                : `No ${activeTab.toLowerCase()} claims found.`
            }
            message="Spot an item that belongs to you in the campus registry? Submit an ownership claim with identifying details."
            action={
              <Button
                variant="primary"
                icon={FileSearch}
                onClick={() => navigate("/items?type=found")}
              >
                Browse Found Items
              </Button>
            }
          />
        ) : (
          <div className="my-claims-list">
            {filteredClaims.map((claim) => {
              const statusMeta = CLAIM_STATUS_META[claim.status] || {
                label: claim.status,
                tone: "neutral",
              };

              return (
                <div key={claim.claim_id} className="my-claim-card">
                  <div className="my-claim-card__left">
                    {claim.item?.image_url ? (
                      <img
                        src={claim.item.image_url}
                        alt={claim.item.item_name}
                        className="my-claim-card__thumb"
                      />
                    ) : (
                      <div className="my-claim-card__fallback" aria-hidden="true">
                        <Package size={28} />
                      </div>
                    )}

                    <div className="my-claim-card__info">
                      <div className="my-claim-card__ref-row">
                        <span className="my-claim-card__ref">Claim #{claim.claim_id}</span>
                        {claim.found_item_id && (
                          <span className="my-claim-card__meta">
                            • Found Ref #{claim.found_item_id}
                          </span>
                        )}
                      </div>

                      <span className="my-claim-card__item-name">
                        {claim.item?.item_name || "Found Belonging"}
                      </span>

                      <span className="my-claim-card__meta">
                        Submitted on {claim.created_at?.split(" ")[0] || "Recent"} • Category: {claim.item?.category || "General"}
                      </span>
                    </div>
                  </div>

                  <div className="my-claim-card__right">
                    <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />

                    <Link to={`/claims/${claim.claim_id}`}>
                      <Button variant="outline" size="sm" icon={ShieldCheck}>
                        View Details
                      </Button>
                    </Link>

                    <Link to={`/claims/${claim.claim_id}/chat`}>
                      <Button variant="ghost" size="sm" icon={MessageSquare}>
                        Chat
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

export default MyClaims;
