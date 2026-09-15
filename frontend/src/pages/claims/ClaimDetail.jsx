import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, MessageSquare } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import ClaimStatusCard from "../../components/claims/ClaimStatusCard";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { LoadingState, ErrorState } from "../../components/common/StateViews";
import claimsService from "../../services/claimsService";
import "./ClaimDetail.css";

export function ClaimDetail() {
  const { claimId } = useParams();
  const navigate = useNavigate();

  const [claim, setClaim] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
                    src={claim.proof_image_url}
                    alt="Submitted proof document"
                    style={{ maxWidth: "320px", maxHeight: "200px", borderRadius: "var(--radius-md)", objectFit: "cover", marginTop: "8px" }}
                  />
                </div>
              )}
            </div>

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
