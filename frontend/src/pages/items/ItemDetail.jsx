import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Laptop,
  CreditCard,
  Wallet,
  Key,
  ShoppingBag,
  BookOpen,
  Glasses,
  Shirt,
  Package,
  Lock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import ThemeToggle from "../../components/common/ThemeToggle";
import { ErrorState, LoadingState } from "../../components/common/StateViews";
import useAuth from "../../hooks/useAuth";
import itemsService from "../../services/itemsService";
import matchesService from "../../services/matchesService";
import { ITEM_STATUS_META } from "../../utils/statusMaps";
import "./ItemDetail.css";

const CATEGORY_ICONS = {
  "Electronics & Gadgets": Laptop,
  "College ID & Cards": CreditCard,
  "Wallets & Purses": Wallet,
  "Keys": Key,
  "Bags & Backpacks": ShoppingBag,
  "Books & Stationery": BookOpen,
  "Personal Accessories": Glasses,
  "Clothing & Lab Coats": Shirt,
};

function CategoryIcon({ category, size = 64, className = "" }) {
  const Icon = CATEGORY_ICONS[category] || Package;
  return <Icon size={size} aria-hidden="true" className={className} />;
}

export function ItemDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isLost = String(type).toLowerCase() === "lost";

  useEffect(() => {
    let cancelled = false;

    async function loadItem() {
      try {
        const data = await itemsService.getItem(type, id);
        if (!cancelled) {
          setItem(data);
          setError(null);
        }

        if (String(type).toLowerCase() === "lost") {
          const matchRes = await matchesService.getItemMatches("lost", id);
          if (!cancelled) {
            setMatches(
              Array.isArray(matchRes?.data)
                ? matchRes.data
                : Array.isArray(matchRes)
                ? matchRes
                : [],
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load item details.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadItem();
    return () => {
      cancelled = true;
    };
  }, [type, id]);

  if (isLoading) {
    return (
      <div className="item-detail-page">
        <div className="item-detail-state">
          <LoadingState message="Loading item details…" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="item-detail-page">
        <div className="item-detail-state">
          <ErrorState
            title="Item Not Found"
            message={error || "The requested item could not be retrieved from the campus registry."}
            onRetry={() => navigate("/items")}
          />
        </div>
      </div>
    );
  }

  const statusMeta = ITEM_STATUS_META[item.status] || { label: item.status, tone: "neutral" };

  return (
    <div className="item-detail-page">
      {/* Topbar */}
      <header className="item-detail-topbar">
        <div className="item-detail-topbar__inner">
          <div className="item-detail-topbar__brand-group">
            <Link to={`/items?type=${type}`} className="item-detail-back-link">
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Back to Registry</span>
            </Link>
            <span className="item-detail-divider" aria-hidden="true">/</span>
            <span className="item-detail-crumb">
              {isLost ? "Lost Item" : "Found Item"} #{item.id}
            </span>
          </div>

          <div className="item-detail-topbar__actions">
            {user && (
              <div className="item-detail-user-badge">
                <span className="item-detail-user-name">{user.name}</span>
                <span className="item-detail-user-email">{user.email}</span>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="item-detail-container" id="main-content">
        <div className="item-detail-grid">
          {/* Left Column: Visual & Description */}
          <div className="item-detail-main">
            {/* Visual preview */}
            <Card className="item-detail-media-card" padded={false}>
              <div className="item-detail-media">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.item_name}
                    className="item-detail-image"
                  />
                ) : (
                  <div className="item-detail-fallback">
                    <CategoryIcon category={item.category} size={64} className="item-detail-fallback-icon" />
                    <span className="item-detail-fallback-text">{item.category}</span>
                  </div>
                )}

                <span
                  className={`item-detail-type-pill ${
                    isLost ? "item-detail-type-pill--lost" : "item-detail-type-pill--found"
                  }`}
                >
                  {isLost ? "LOST ITEM" : "FOUND ITEM"}
                </span>
              </div>
            </Card>

            {/* Description Card */}
            <Card title="Public Description" className="item-detail-card" padded>
              <p className="item-detail-desc-text">{item.description}</p>
            </Card>

            {/* Privacy Reassurance (Lost item only) */}
            {isLost && (
              <div className="item-detail-confidential-banner">
                <Lock size={16} aria-hidden="true" className="item-detail-confidential-icon" />
                <div>
                  <h4 className="item-detail-confidential-title">Private Identifying Marks Concealed</h4>
                  <p className="item-detail-confidential-desc">
                    Unique markings, internal contents, and secret serial numbers are strictly hidden from public view to protect against fraudulent claims.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Metadata & Action Bridges */}
          <div className="item-detail-sidebar">
            <Card className="item-detail-card" padded>
              <div className="item-detail-header-group">
                <div className="item-detail-status-row">
                  <span className="item-detail-category-tag">{item.category}</span>
                  <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                </div>

                <h1 className="item-detail-title">{item.item_name}</h1>
                <span className="item-detail-ref-text">Registry Reference: #{item.id}</span>
              </div>

              {/* Attributes Table */}
              <div className="item-detail-attributes">
                <div className="item-detail-attr">
                  <div className="item-detail-attr-label">
                    <MapPin size={15} aria-hidden="true" />
                    <span>Campus Location:</span>
                  </div>
                  <span className="item-detail-attr-val">{item.location}</span>
                </div>

                {item.specific_location && (
                  <div className="item-detail-attr">
                    <div className="item-detail-attr-label">
                      <ExternalLink size={15} aria-hidden="true" />
                      <span>Specific Spot:</span>
                    </div>
                    <span className="item-detail-attr-val">{item.specific_location}</span>
                  </div>
                )}

                <div className="item-detail-attr">
                  <div className="item-detail-attr-label">
                    <Calendar size={15} aria-hidden="true" />
                    <span>{isLost ? "Date Lost:" : "Date Found:"}</span>
                  </div>
                  <span className="item-detail-attr-val">{item.date}</span>
                </div>

                {item.time && (
                  <div className="item-detail-attr">
                    <div className="item-detail-attr-label">
                      <Clock size={15} aria-hidden="true" />
                      <span>Approximate Time:</span>
                    </div>
                    <span className="item-detail-attr-val">{item.time}</span>
                  </div>
                )}

                {/* Found Item Custody Information */}
                {!isLost && item.custody_location && (
                  <div className="item-detail-attr item-detail-attr--highlight">
                    <div className="item-detail-attr-label">
                      <ShieldCheck size={15} aria-hidden="true" />
                      <span>Current Custody:</span>
                    </div>
                    <span className="item-detail-attr-val item-detail-attr-val--custody">
                      {item.custody_location}
                    </span>
                  </div>
                )}

                {!isLost && item.contact_preference && (
                  <div className="item-detail-attr">
                    <div className="item-detail-attr-label">
                      <MessageSquare size={15} aria-hidden="true" />
                      <span>Handover Route:</span>
                    </div>
                    <span className="item-detail-attr-val">{item.contact_preference}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Active Stage 5 Claim Integration */}
            {!isLost && (
              item.status === "CLAIMED" || item.status === "RETURNED" ? (
                <Card className="item-detail-bridge-card" padded>
                  <div className="item-detail-bridge-header">
                    <ShieldCheck size={22} aria-hidden="true" className="item-detail-bridge-icon" />
                    <div>
                      <h3 className="item-detail-bridge-title">Item {statusMeta.label}</h3>
                    </div>
                  </div>
                  <p className="item-detail-bridge-desc">
                    This item has already been claimed or returned to its verified owner. No further claims can be submitted.
                  </p>
                </Card>
              ) : item.user_id && item.user_id === user?.user_id ? (
                <Card className="item-detail-bridge-card" padded>
                  <div className="item-detail-bridge-header">
                    <ShieldCheck size={22} aria-hidden="true" className="item-detail-bridge-icon" />
                    <div>
                      <h3 className="item-detail-bridge-title">Reported by You</h3>
                    </div>
                  </div>
                  <p className="item-detail-bridge-desc">
                    You reported finding this item. You cannot submit an ownership claim for an item you discovered.
                  </p>
                </Card>
              ) : (
                <Card className="item-detail-bridge-card item-detail-bridge-card--claim" padded>
                  <div className="item-detail-bridge-header">
                    <ShieldCheck size={22} aria-hidden="true" className="item-detail-bridge-icon" />
                    <div>
                      <h3 className="item-detail-bridge-title">Is this your item?</h3>
                      <span className="item-detail-stage-pill" style={{ backgroundColor: "var(--color-success-soft)", color: "var(--color-success)" }}>
                        Ownership Verification
                      </span>
                    </div>
                  </div>

                  <p className="item-detail-bridge-desc">
                    To safeguard belongings against false ownership claims, claiming requires submitting private verification proof (such as serial numbers, lockscreen wallpaper, or internal contents).
                  </p>

                  <Link to={`/items/found/${item.id}/claim`} style={{ textDecoration: "none" }}>
                    <Button
                      variant="primary"
                      fullWidth
                      icon={ShieldCheck}
                      className="item-detail-bridge-btn"
                    >
                      Claim This Item
                    </Button>
                  </Link>
                </Card>
              )
            )}

            {/* Active Stage 6 Automated Matching Integration */}
            {isLost && (
              <Card className="item-detail-bridge-card item-detail-bridge-card--match" padded>
                <div className="item-detail-bridge-header">
                  <Sparkles size={22} aria-hidden="true" className="item-detail-bridge-icon" />
                  <div>
                    <h3 className="item-detail-bridge-title">Potential Matches</h3>
                    <span className="item-detail-stage-pill">FastAPI Matching Engine</span>
                  </div>
                </div>

                {matches.length === 0 ? (
                  <div className="item-detail-match-box">
                    <span className="item-detail-match-indicator">Matching Engine Status:</span>
                    <span className="item-detail-match-status">Active — Monitoring Incoming Found Reports</span>
                    <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                      No potential matches found yet. You will be notified automatically when a matching found item is reported.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                    {matches.map((m) => (
                      <div
                        key={m.match_id}
                        style={{
                          padding: "10px 12px",
                          backgroundColor: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: "var(--text-sm)" }}>
                            {m.found_item?.item_name || `Found Item #${m.found_item_id}`}
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-full)",
                              backgroundColor: "var(--color-primary-soft)",
                              color: "var(--color-primary)",
                            }}
                          >
                            {m.score}% Match
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                          {m.match_reason}
                        </p>
                        <div style={{ marginTop: "6px" }}>
                          <Link to={`/items/found/${m.found_item_id}`}>
                            <Button variant="outline" size="sm">
                              View Matched Item & Claim
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ItemDetail;
