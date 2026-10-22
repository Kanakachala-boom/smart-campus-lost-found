import { useEffect, useState, useRef } from "react";
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
  Edit3,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  X,
  Send,
} from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import ThemeToggle from "../../components/common/ThemeToggle";
import { ErrorState, LoadingState } from "../../components/common/StateViews";
import useAuth from "../../hooks/useAuth";
import itemsService from "../../services/itemsService";
import matchesService from "../../services/matchesService";
import claimsService from "../../services/claimsService";
import messagesService from "../../services/messagesService";
import { ITEM_STATUS_META } from "../../utils/statusMaps";
import { getFullImageUrl } from "../../utils/imageUrl";
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
  const [incomingClaims, setIncomingClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState(null);
  const [error, setError] = useState(null);

  // Report edit and management states
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const isLost = String(type).toLowerCase() === "lost";
  const isOwner = user && item && (item.user_id === user.user_id || user.role === "ADMIN");

  // Private In-Report Conversation states (Found items)
  const [chatConversation, setChatConversation] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const chatEndRef = useRef(null);

  const loadConversation = async (silent = false) => {
    if (isLost || !user) return;
    if (!silent) setChatLoading(true);
    try {
      const res = await messagesService.getFoundItemConversation(id, selectedClaimId);
      const data = res?.data || res;
      setChatConversation(data);
    } catch (err) {
      if (!silent) {
        if (err?.response?.status === 403 || err?.status === 403) {
          setChatConversation({ can_chat: false, reason: "Restricted to authorized participants." });
        } else {
          setChatConversation(null);
        }
      }
    } finally {
      if (!silent) setChatLoading(false);
    }
  };

  useEffect(() => {
    if (isLost || !user) return;
    let cancelled = false;
    loadConversation();

    const interval = setInterval(() => {
      if (!cancelled) {
        loadConversation(true);
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [type, id, user?.user_id, selectedClaimId]);

  useEffect(() => {
    if (chatConversation?.messages?.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatConversation?.messages?.length]);

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const textToSend = chatInput.trim();
    setChatInput("");
    setIsSendingChat(true);

    try {
      const res = await messagesService.sendFoundItemMessage(
        id,
        textToSend,
        selectedClaimId || chatConversation?.claim_id
      );
      const newMsg = res?.data || res;
      setChatConversation((prev) => ({
        ...prev,
        messages: [...(prev?.messages || []), newMsg],
      }));
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err) {
      setChatInput(textToSend);
      alert(err.message || "Failed to send message.");
    } finally {
      setIsSendingChat(false);
    }
  };

  const loadMatches = async () => {
    setMatchesLoading(true);
    setMatchesError(null);
    try {
      const matchRes = await matchesService.getItemMatches(type, id);
      const list = Array.isArray(matchRes?.data)
        ? matchRes.data
        : Array.isArray(matchRes)
        ? matchRes
        : [];
      setMatches(list);
    } catch (err) {
      setMatchesError(err.message || "Failed to retrieve matching reports.");
    } finally {
      setMatchesLoading(false);
    }
  };

  const loadItem = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await itemsService.getItem(type, id);
      setItem(data);
      setEditFormData({
        item_name: data.item_name || "",
        category: data.category || "",
        description: data.description || "",
        location: data.location || "",
        specific_location: data.specific_location || "",
        date: data.date || "",
        contact_preference: data.contact_preference || "",
      });

      // Load matches for both lost and found
      loadMatches();

      // If found item and current user is owner/admin, load claims
      if (String(type).toLowerCase() === "found" && (user?.role === "ADMIN" || data.user_id === user?.user_id)) {
        try {
          const claimsRes = await claimsService.getFoundItemClaims(id);
          const list = Array.isArray(claimsRes?.data) ? claimsRes.data : Array.isArray(claimsRes) ? claimsRes : [];
          setIncomingClaims(list);
        } catch {
          setIncomingClaims([]);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load item details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItem();
  }, [type, id]);

  const handleStatusUpdate = async (newStatus, promptMessage) => {
    if (promptMessage && !window.confirm(promptMessage)) return;
    setActionError(null);
    setActionSuccess(null);
    setIsUpdating(true);
    try {
      await itemsService.updateItemStatus(type, id, newStatus);
      setItem((prev) => ({ ...prev, status: newStatus }));
      setActionSuccess(`Status successfully updated to ${newStatus}.`);
      loadMatches();
    } catch (err) {
      setActionError(err.message || "Failed to update item status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setIsUpdating(true);
    try {
      const updated = await itemsService.updateItem(type, id, editFormData);
      setItem((prev) => ({ ...prev, ...(updated?.data || updated) }));
      setIsEditing(false);
      setActionSuccess("Report details updated successfully.");
      loadMatches();
    } catch (err) {
      setActionError(err.message || "Failed to save edits.");
    } finally {
      setIsUpdating(false);
    }
  };

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
                    src={getFullImageUrl(item.image_url)}
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

            {/* Private In-Report Conversation for Found Items */}
            {!isLost && user && chatConversation?.can_chat && (
              <Card className="item-detail-card item-detail-chat-box" padded id="conversation">
                <div className="item-detail-chat-header">
                  <div className="item-detail-chat-title-group">
                    <h3 className="item-detail-chat-title">
                      <MessageSquare size={18} aria-hidden="true" color="var(--color-primary)" />
                      <span>Private Report Conversation</span>
                    </h3>
                    <span className="item-detail-chat-subtitle">
                      {chatConversation.is_finder
                        ? `Coordinating with Claimant: ${chatConversation.claimant_name || "Lost item owner"}`
                        : `Coordinating with Finder: ${chatConversation.finder_name || "Campus Finder"}`}
                    </span>
                  </div>
                  <span className="item-detail-stage-pill" style={{ color: "var(--color-success)" }}>
                    Direct Item Channel
                  </span>
                </div>

                <div className="item-detail-chat-notice">
                  <Lock size={13} aria-hidden="true" />
                  <span>
                    Confidential NIE campus coordination. Personal phone numbers and email addresses remain protected.
                  </span>
                </div>

                {/* If finder has multiple claim conversations */}
                {chatConversation.conversations && chatConversation.conversations.length > 1 && (
                  <div className="item-detail-chat-tabs">
                    {chatConversation.conversations.map((conv) => (
                      <button
                        key={conv.claim_id}
                        type="button"
                        onClick={() => setSelectedClaimId(conv.claim_id)}
                        className={`item-detail-chat-tab ${
                          (selectedClaimId === conv.claim_id || (!selectedClaimId && chatConversation.claim_id === conv.claim_id))
                            ? "item-detail-chat-tab--active"
                            : ""
                        }`}
                      >
                        Claim #{conv.claim_id} ({conv.claimant_name})
                      </button>
                    ))}
                  </div>
                )}

                <div className="item-detail-chat-stream">
                  {chatConversation.messages && chatConversation.messages.length > 0 ? (
                    chatConversation.messages.map((msg) => {
                      const isMine = msg.sender_id === user.user_id;
                      return (
                        <div
                          key={msg.message_id || `${msg.sent_at}-${msg.sender_id}`}
                          className={`item-detail-chat-bubble ${
                            isMine ? "item-detail-chat-bubble--mine" : "item-detail-chat-bubble--other"
                          }`}
                        >
                          <span className="item-detail-chat-bubble__sender">
                            {isMine ? "You" : (msg.sender_name || "Counterpart")}
                          </span>
                          <span className="item-detail-chat-bubble__text">{msg.text || msg.content}</span>
                          <span className="item-detail-chat-bubble__time">
                            {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="item-detail-chat-empty">
                      No messages yet. Send a direct message to coordinate item handover with the {chatConversation.is_finder ? "claimant" : "finder"}.
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChatMessage} className="item-detail-chat-form">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message to coordinate item return…"
                    className="item-detail-chat-input"
                    disabled={isSendingChat}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    icon={Send}
                    isLoading={isSendingChat}
                    disabled={!chatInput.trim() || isSendingChat}
                  >
                    Send
                  </Button>
                </form>
              </Card>
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

            {/* Owner Report Management Actions */}
            {isOwner && (
              <Card className="item-detail-bridge-card" padded>
                <div className="item-detail-bridge-header">
                  <Edit3 size={20} aria-hidden="true" className="item-detail-bridge-icon" />
                  <div>
                    <h3 className="item-detail-bridge-title">Manage Your Report</h3>
                    <span className="item-detail-stage-pill">Report Owner Actions</span>
                  </div>
                </div>

                {actionError && (
                  <div style={{ padding: "8px 12px", backgroundColor: "var(--color-danger-soft, rgba(239,68,68,0.1))", color: "var(--color-danger, #ef4444)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", marginBottom: "10px" }}>
                    {actionError}
                  </div>
                )}
                {actionSuccess && (
                  <div style={{ padding: "8px 12px", backgroundColor: "var(--color-success-soft, rgba(16,185,129,0.1))", color: "var(--color-success, #10b981)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", marginBottom: "10px" }}>
                    {actionSuccess}
                  </div>
                )}

                {isEditing ? (
                  <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Item Title:</label>
                      <input
                        type="text"
                        value={editFormData.item_name}
                        onChange={(e) => setEditFormData({ ...editFormData, item_name: e.target.value })}
                        required
                        style={{ width: "100%", padding: "6px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)", fontSize: "var(--text-sm)" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Description:</label>
                      <textarea
                        rows={3}
                        value={editFormData.description}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        required
                        style={{ width: "100%", padding: "6px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)", fontSize: "var(--text-sm)" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Campus Location:</label>
                      <input
                        type="text"
                        value={editFormData.location}
                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                        required
                        style={{ width: "100%", padding: "6px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)", fontSize: "var(--text-sm)" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Specific Spot:</label>
                      <input
                        type="text"
                        value={editFormData.specific_location || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, specific_location: e.target.value })}
                        style={{ width: "100%", padding: "6px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)", fontSize: "var(--text-sm)" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Date:</label>
                      <input
                        type="date"
                        value={editFormData.date}
                        onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                        required
                        style={{ width: "100%", padding: "6px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)", fontSize: "var(--text-sm)" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <Button type="submit" variant="primary" size="sm" isLoading={isUpdating}>
                        Save Updates
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Button variant="outline" size="sm" icon={Edit3} onClick={() => setIsEditing(true)}>
                      Edit Report Details
                    </Button>

                    {isLost && item.status !== "RECLAIMED" && item.status !== "CLOSED" && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={CheckCircle}
                        isLoading={isUpdating}
                        onClick={() => handleStatusUpdate("RECLAIMED", "Mark this item as recovered? This will resolve pending matches.")}
                      >
                        Mark as Recovered
                      </Button>
                    )}

                    {!isLost && item.status !== "RETURNED" && item.status !== "CLOSED" && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={CheckCircle}
                        isLoading={isUpdating}
                        onClick={() => handleStatusUpdate("RETURNED", "Mark this item as returned to its owner?")}
                      >
                        Mark as Returned
                      </Button>
                    )}

                    {item.status !== "CLOSED" && item.status !== "RECLAIMED" && item.status !== "RETURNED" && (
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={isUpdating}
                        onClick={() => handleStatusUpdate("CLOSED", "Close this report? Closed reports are archived from active matching.")}
                      >
                        Close Report
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Finder: Incoming Ownership Claims */}
            {!isLost && isOwner && incomingClaims.length > 0 && (
              <Card className="item-detail-bridge-card" padded>
                <div className="item-detail-bridge-header">
                  <ShieldCheck size={20} aria-hidden="true" className="item-detail-bridge-icon" />
                  <div>
                    <h3 className="item-detail-bridge-title">Submitted Claims ({incomingClaims.length})</h3>
                    <span className="item-detail-stage-pill">Finder Review</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                  {incomingClaims.map((c) => (
                    <div
                      key={c.claim_id}
                      style={{
                        padding: "8px 10px",
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>{c.claimant_name || "Student"}</div>
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                          Status: <strong style={{ color: "var(--color-primary)" }}>{c.status}</strong>
                        </div>
                      </div>
                      <Link to={`/claims/${c.claim_id}`}>
                        <Button variant="outline" size="sm">
                          Review Claim
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Claim Integration (Non-owners on Found Items) */}
            {!isLost && !isOwner && (
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

            {/* Automated Matching Integration for BOTH Lost and Found items */}
            <Card className="item-detail-bridge-card item-detail-bridge-card--match" padded>
              <div className="item-detail-bridge-header">
                <Sparkles size={22} aria-hidden="true" className="item-detail-bridge-icon" />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 className="item-detail-bridge-title">Potential Matches</h3>
                    <button
                      onClick={loadMatches}
                      title="Refresh matches"
                      disabled={matchesLoading}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}
                    >
                      <RefreshCw size={14} className={matchesLoading ? "spin" : ""} />
                    </button>
                  </div>
                  <span className="item-detail-stage-pill">FastAPI Matching Engine</span>
                </div>
              </div>

              {matchesLoading ? (
                <div style={{ padding: "12px", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                  Scanning database for potential matches…
                </div>
              ) : matchesError ? (
                <div style={{ padding: "8px 12px", backgroundColor: "var(--color-danger-soft, rgba(239,68,68,0.1))", color: "var(--color-danger, #ef4444)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)" }}>
                  {matchesError}
                  <button onClick={loadMatches} style={{ display: "block", marginTop: "4px", background: "none", border: "none", color: "inherit", textDecoration: "underline", cursor: "pointer" }}>
                    Retry scan
                  </button>
                </div>
              ) : matches.length === 0 ? (
                <div className="item-detail-match-box">
                  <span className="item-detail-match-indicator">Matching Engine Status:</span>
                  <span className="item-detail-match-status">Active — Monitoring Incoming Reports</span>
                  <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                    No potential matches found yet. You will be notified automatically when a compatible {isLost ? "found" : "lost"} item report is registered.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                  {matches.map((m) => {
                    const otherItem = isLost ? m.found_item : m.lost_item;
                    const otherId = isLost ? m.found_item_id : m.lost_item_id;
                    const targetLink = isLost ? `/items/found/${otherId}` : `/items/lost/${otherId}`;
                    return (
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
                            {otherItem?.item_name || `Matching Item #${otherId}`}
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
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                          Category: {otherItem?.category || "Unknown"} • Location: {otherItem?.location || "Campus"}
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                          {m.match_reason}
                        </p>
                        <div style={{ marginTop: "6px" }}>
                          <Link to={targetLink}>
                            <Button variant="outline" size="sm">
                              {isLost ? "View Matched Item & Claim" : "View Matched Report"}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ItemDetail;
