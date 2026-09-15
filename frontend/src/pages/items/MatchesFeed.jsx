import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { matchesService } from "../../services";
import { MATCH_STATUS } from "../../utils/constants";
import { getMatchStatusMeta } from "../../utils/statusMaps";
import StatusBadge from "../../components/common/StatusBadge";
import Button from "../../components/common/Button";
import AppLayout from "../../components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "../../components/common/StateViews";
import "./MatchesFeed.css";

export default function MatchesFeed() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await matchesService.getMyMatches(user?.user_id || 1);
      const data = response?.data || response || [];
      setMatches(data);
      setError(null);
    } catch (err) {
      setError(err?.message || "Failed to load item matches.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await matchesService.getMyMatches(user?.user_id || 1);
        if (!cancelled) {
          const data = response?.data || response || [];
          setMatches(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load item matches.");
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

  const handleStatusUpdate = async (matchId, newStatus) => {
    setActionLoadingId(matchId);
    try {
      await matchesService.updateMatchStatus(matchId, newStatus);
      setMatches((prev) =>
        prev.map((m) => (m.match_id === matchId ? { ...m, status: newStatus } : m)),
      );
    } catch (err) {
      alert(err?.message || "Failed to update match status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredMatches = matches.filter((m) => {
    if (activeFilter === "ALL") return true;
    return m.status === activeFilter;
  });

  return (
    <AppLayout>
      <div className="matches-feed-page">
      <div className="matches-feed-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={24} style={{ color: "var(--color-primary)" }} />
          <h1 className="matches-feed-title">Potential Item Matches</h1>
        </div>
        <p className="matches-feed-sub">
          Automated correlations between your reported items and matching campus reports.
        </p>
      </div>

      <div className="my-reports-tabs" style={{ marginBottom: "var(--space-6)" }}>
        {["ALL", MATCH_STATUS.PENDING, MATCH_STATUS.ACCEPTED, MATCH_STATUS.REJECTED].map(
          (status) => (
            <button
              key={status}
              type="button"
              className={`report-tab ${activeFilter === status ? "report-tab--active" : ""}`}
              onClick={() => setActiveFilter(status)}
            >
              {status === "ALL" ? "All Matches" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ),
        )}
      </div>

      {loading && <LoadingState message="Checking for potential matches..." />}

      {error && !loading && <ErrorState message={error} onRetry={fetchMatches} />}

      {!loading && !error && filteredMatches.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No Matches Found"
          message={
            activeFilter === "ALL"
              ? "The system has not identified any candidate matches for your reports yet. Check back soon!"
              : `No matches with status ${activeFilter}.`
          }
          action={
            <Link to="/items">
              <Button variant="outline" size="sm">
                Browse Campus Items
              </Button>
            </Link>
          }
        />
      )}

      {!loading && !error && filteredMatches.length > 0 && (
        <div className="matches-list">
          {filteredMatches.map((match) => {
            const statusMeta = getMatchStatusMeta(match.status);
            const isUserLostOwner = match.lost_item?.user_id === user?.user_id;

            return (
              <div key={match.match_id} className="match-card">
                <div className="match-card__header">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="match-card__score-badge">
                      <Sparkles size={13} />
                      Match Confidence: {match.score}% ({match.confidence_level || "Suggested"})
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                      Ref #MTC-{String(match.match_id).padStart(4, "0")} •{" "}
                      {new Date(match.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <StatusBadge
                    label={statusMeta.label}
                    statusKey={match.status}
                    tone={statusMeta.tone}
                    icon={statusMeta.icon}
                  />
                </div>

                <div className="match-card__items-grid">
                  <div className="match-item-column">
                    <span className="match-item-column__badge" style={{ color: "var(--color-danger)" }}>
                      Lost Report
                    </span>
                    <span className="match-item-column__name">
                      {match.lost_item?.item_name || "Unknown Lost Item"}
                    </span>
                    <span className="match-item-column__meta">
                      📍 {match.lost_item?.location || "NIE Campus"} • {match.lost_item?.date}
                    </span>
                    <Link
                      to={`/items/lost/${match.lost_item_id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-primary)",
                        fontWeight: 600,
                        marginTop: "4px",
                      }}
                    >
                      View Report <ExternalLink size={11} />
                    </Link>
                  </div>

                  <div className="match-items-separator">
                    <ArrowRight size={20} />
                  </div>

                  <div className="match-item-column">
                    <span className="match-item-column__badge" style={{ color: "var(--color-success)" }}>
                      Discovered Found Item
                    </span>
                    <span className="match-item-column__name">
                      {match.found_item?.item_name || "Unknown Found Item"}
                    </span>
                    <span className="match-item-column__meta">
                      📍 {match.found_item?.location || "NIE Campus"} • {match.found_item?.date}
                    </span>
                    <Link
                      to={`/items/found/${match.found_item_id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-primary)",
                        fontWeight: 600,
                        marginTop: "4px",
                      }}
                    >
                      View Item <ExternalLink size={11} />
                    </Link>
                  </div>
                </div>

                {match.match_reason && (
                  <div className="match-card__reason-box">
                    <Sparkles size={15} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: "2px" }} />
                    <span>{match.match_reason}</span>
                  </div>
                )}

                <div className="match-card__actions">
                  {match.status === MATCH_STATUS.PENDING && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoadingId === match.match_id}
                        onClick={() => handleStatusUpdate(match.match_id, MATCH_STATUS.REJECTED)}
                      >
                        <XCircle size={14} /> Dismiss Match
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={actionLoadingId === match.match_id}
                        onClick={() => handleStatusUpdate(match.match_id, MATCH_STATUS.ACCEPTED)}
                      >
                        <CheckCircle2 size={14} /> Confirm Relevant
                      </Button>
                    </>
                  )}

                  {isUserLostOwner && match.found_item_id && (
                    <Link to={`/items/found/${match.found_item_id}/claim`}>
                      <Button variant="secondary" size="sm">
                        <ShieldCheck size={14} /> Claim This Found Item
                      </Button>
                    </Link>
                  )}
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
