import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import AppLayout from "../../components/layout/AppLayout";
import ClaimForm from "../../components/claims/ClaimForm";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { LoadingState, ErrorState } from "../../components/common/StateViews";
import useAuth from "../../hooks/useAuth";
import itemsService from "../../services/itemsService";
import claimsService from "../../services/claimsService";
import "./ClaimPage.css";

export function ClaimPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [foundItem, setFoundItem] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [existingClaim, setExistingClaim] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedClaim, setSubmittedClaim] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const item = await itemsService.getItem("found", id);
        const challengeData = await claimsService.getVerificationChallenge(id);
        const userClaimsRes = await claimsService.getMyClaims(user?.user_id);
        const userClaims = Array.isArray(userClaimsRes?.data)
          ? userClaimsRes.data
          : Array.isArray(userClaimsRes)
          ? userClaimsRes
          : [];

        const duplicate = userClaims.find(
          (c) => c.found_item_id === Number(id) && c.status === "PENDING",
        );

        if (!cancelled) {
          setFoundItem(item);
          setChallenge(challengeData?.data || challengeData);
          setExistingClaim(duplicate || null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load item information.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await claimsService.submitClaim(formData, user);
      const claimResult = response?.data || response;
      setSubmittedClaim(claimResult);
    } catch (err) {
      setSubmitError(err.message || "Failed to submit claim. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="claim-page">
        <div className="claim-page__topbar">
          <Link to={`/items/found/${id}`} className="claim-page__back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Item Details</span>
          </Link>
        </div>

        {isLoading ? (
          <LoadingState message="Loading claim verification details…" />
        ) : error || !foundItem ? (
          <ErrorState
            title="Unable to Claim Item"
            message={error || "Found item was not found in the campus registry."}
            onRetry={() => navigate("/items")}
          />
        ) : submittedClaim ? (
          /* Confirmation Success State */
          <div className="claim-success-card">
            <div className="claim-success-icon-wrap" aria-hidden="true">
              <CheckCircle2 size={36} />
            </div>
            <span className="claim-success-ref">Claim #{submittedClaim.claim_id}</span>
            <h1 className="claim-success-title">Claim Submitted Successfully</h1>
            <p className="claim-success-desc">
              Your claim has been submitted and is under verification by authorized campus personnel. You will receive a notification once the evaluation is complete.
            </p>
            <div className="claim-success-actions">
              <Button
                variant="primary"
                onClick={() => navigate("/my-claims")}
                fullWidth
              >
                View My Claims
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/items")}
                fullWidth
              >
                Back to Registry
              </Button>
            </div>
          </div>
        ) : foundItem.status === "CLAIMED" || foundItem.status === "RETURNED" ? (
          /* Ineligible: Already Claimed / Returned */
          <Card title="Item Unavailable for Claim" padded>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <ShieldAlert size={28} color="var(--color-warning)" />
              <div>
                <p style={{ marginTop: 0, fontSize: "var(--text-sm)", color: "var(--color-text)" }}>
                  This item has already been claimed or returned to its verified owner. No further claims can be accepted.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate("/items")}>
                  Browse Active Items
                </Button>
              </div>
            </div>
          </Card>
        ) : foundItem.user_id && foundItem.user_id === user?.user_id ? (
          /* Ineligible: Self-claim guard */
          <Card title="Self-Claim Restricted" padded>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <ShieldAlert size={28} color="var(--color-warning)" />
              <div>
                <p style={{ marginTop: 0, fontSize: "var(--text-sm)", color: "var(--color-text)" }}>
                  You reported this item as found. According to NIE campus policy, you cannot submit an ownership claim for an item you discovered.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate(`/items/found/${id}`)}>
                  Return to Item
                </Button>
              </div>
            </div>
          </Card>
        ) : existingClaim ? (
          /* Ineligible: Already Pending */
          <Card title="Claim Already Pending" padded>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <ShieldAlert size={28} color="var(--color-primary)" />
              <div>
                <p style={{ marginTop: 0, fontSize: "var(--text-sm)", color: "var(--color-text)" }}>
                  You already have an active pending claim (<strong>#CLM-{existingClaim.claim_id}</strong>) for this item under review.
                </p>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <Button variant="primary" size="sm" onClick={() => navigate(`/claims/${existingClaim.claim_id}`)}>
                    View Existing Claim
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/my-claims")}>
                    My Claims
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          /* Standard Claim Form */
          <ClaimForm
            foundItem={foundItem}
            challenge={challenge}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/items/found/${id}`)}
            isSubmitting={isSubmitting}
            apiError={submitError}
          />
        )}
      </div>
    </AppLayout>
  );
}

export default ClaimPage;
