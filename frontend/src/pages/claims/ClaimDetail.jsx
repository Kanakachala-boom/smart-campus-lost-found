import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, MessageSquare, ShieldAlert, XCircle } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import ClaimStatusCard from "../../components/claims/ClaimStatusCard";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { LoadingState, ErrorState } from "../../components/common/StateViews";
import useAuth from "../../hooks/useAuth";
import claimsService from "../../services/claimsService";
import { getFullImageUrl } from "../../utils/imageUrl";
import "./ClaimDetail.css";

export function ClaimDetail() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [claim, setClaim] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review states
  const [actionError, setActionError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [handoverNote, setHandoverNote] = useState(
    "Please visit campus security / admin block with your NIE ID card for item verification and handover."
  );
  const [rejectNote, setRejectNote] = useState(
    "Verification marks and description provided did not sufficiently match the recovered item."
  );

  useEffect(() => {
    let cancelled = false;

    async function loadClaim() {
      try {
        const response = await claimsService.getClaimById(claimId);
        const data = response?.data || response;
        if (!cancelled) {
          setClaim(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load claim details.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadClaim();
    return () => {
      cancelled = true;
    };
  }, [claimId]);

  const isFinder =
    user &&
    ((claim?.found_item && claim.found_item.user_id === user.user_id) ||
      (claim?.item && claim.item.user_id === user.user_id));
  const isAdmin = user && user.role === "ADMIN";
  const canReview = (isFinder || isAdmin) && claim?.status === "PENDING";

  const handleVerify = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await claimsService.verifyClaim(claim.claim_id, handoverNote);
      const updated = res?.data || res;
      setClaim((prev) => ({ ...prev, ...updated, status: "VERIFIED" }));
    } catch (err) {
      setActionError(err.message || "Failed to approve claim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await claimsService.rejectClaim(claim.claim_id, rejectNote);
      const updated = res?.data || res;
      setClaim((prev) => ({ ...prev, ...updated, status: "REJECTED" }));
    } catch (err) {
      setActionError(err.message || "Failed to reject claim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="claim-detail-page">
        <div className="claim-detail-topbar">
          <Link to="/my-claims" className="claim-detail-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to My Claims</span>
          </Link>
        </div>

        {isLoading ? (
          <LoadingState message="Loading claim details…" />
        ) : error || !claim ? (
          <ErrorState
            title="Claim Not Found"
            message={error || `Claim #${claimId} was not found in the registry.`}
            onRetry={() => navigate("/my-claims")}
          />
        ) : (
          <div className="claim-detail-content">
            {/* Status Card */}
            <ClaimStatusCard claim={claim} showChatAction={false} />

            {/* Quick Actions */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link to={`/claims/${claim.claim_id}/chat`}>
                <Button variant="primary" icon={MessageSquare}>
                  Open Private Chat
                </Button>
              </Link>
              {claim.found_item_id && (
                <Link to={`/items/found/${claim.found_item_id}`}>
                  <Button variant="outline">
                    View Public Item Report
                  </Button>
                </Link>
              )}
            </div>

            {/* Evidence & Verification Summary */}
            <div className="claim-evidence-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 className="claim-evidence-title">Submitted Ownership Evidence</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                  <Lock size={14} />
                  <span>Confidential Student Evidence</span>
                </div>
              </div>

              <div className="claim-evidence-grid">
                <div className="claim-evidence-field">
                  <span className="claim-evidence-label">Date Lost:</span>
                  <span className="claim-evidence-val">{claim.lost_date || "Not specified"}</span>
                </div>

                <div className="claim-evidence-field">
                  <span className="claim-evidence-label">Campus Location Lost:</span>
                  <span className="claim-evidence-val">{claim.lost_location || "Not specified"}</span>
                </div>

                {claim.claimant_answer && (
                  <div className="claim-evidence-field" style={{ gridColumn: "1 / -1" }}>
                    <span className="claim-evidence-label">Challenge Response:</span>
                    <span className="claim-evidence-val" style={{ fontWeight: 600 }}>{claim.claimant_answer}</span>
                  </div>
                )}
              </div>

              <div className="claim-evidence-field">
                <span className="claim-evidence-label">Private Verification Proof:</span>
                <p className="claim-evidence-desc">{claim.verification_details}</p>
              </div>

              {claim.proof_image_url && (
                <div className="claim-evidence-field">
                  <span className="claim-evidence-label">Supporting Document / Prior Photo:</span>
                  <img
                    src={getFullImageUrl(claim.proof_image_url)}
                    alt="Submitted proof document"
                    style={{ maxWidth: "320px", maxHeight: "200px", borderRadius: "var(--radius-md)", objectFit: "cover", marginTop: "8px" }}
                  />
                </div>
              )}
            </div>

            {/* Finder / Admin Verification Action Card */}
            {canReview && (
              <Card title="Review & Verify Claim" padded className="claim-review-action-card">
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                    As the finder or campus authority, verify whether the submitted evidence and identifying markings match the item in custody before releasing it.
                  </p>

                  {actionError && (
                    <div style={{ padding: "10px", backgroundColor: "var(--color-danger-soft, rgba(239, 68, 68, 0.1))", color: "var(--color-danger, #ef4444)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)" }}>
                      {actionError}
                    </div>
                  )}

                  <div>
                    <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: "6px" }}>
                      Handover Instructions (Provided to Claimant upon Verification):
                    </label>
                    <textarea
                      rows={3}
                      value={handoverNote}
                      onChange={(e) => setHandoverNote(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text)",
                        fontSize: "var(--text-sm)",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <Button
                      variant="primary"
                      icon={CheckCircle2}
                      isLoading={isSubmitting}
                      onClick={handleVerify}
                    >
                      Verify & Approve Handover
                    </Button>
                    <Button
                      variant="danger"
                      icon={XCircle}
                      isLoading={isSubmitting}
                      onClick={handleReject}
                    >
                      Reject Claim
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Target Found Item Context */}
            {claim.item && (
              <Card title="Claimed Found Item Details" padded>
                <div className="claim-evidence-grid">
                  <div className="claim-evidence-field">
                    <span className="claim-evidence-label">Item Name:</span>
                    <span className="claim-evidence-val">{claim.item.item_name}</span>
                  </div>
                  <div className="claim-evidence-field">
                    <span className="claim-evidence-label">Category:</span>
                    <span className="claim-evidence-val">{claim.item.category}</span>
                  </div>
                  <div className="claim-evidence-field">
                    <span className="claim-evidence-label">Discovery Location:</span>
                    <span className="claim-evidence-val">{claim.item.location}</span>
                  </div>
                  <div className="claim-evidence-field">
                    <span className="claim-evidence-label">Current Custody:</span>
                    <span className="claim-evidence-val" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                      {claim.item.custody_location || "Campus Security Desk"}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default ClaimDetail;
