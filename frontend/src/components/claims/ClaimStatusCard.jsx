import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock, MessageSquare, ShieldCheck } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import Button from "../common/Button";
import { CLAIM_STATUS } from "../../utils/constants";
import { CLAIM_STATUS_META } from "../../utils/statusMaps";
import "./ClaimStatusCard.css";

export function ClaimStatusCard({ claim, showChatAction = true }) {
  if (!claim) return null;

  const status = claim.status || CLAIM_STATUS.PENDING;
  const statusMeta = CLAIM_STATUS_META[status] || {
    label: status,
    tone: "neutral",
  };

  const isPending = status === CLAIM_STATUS.PENDING;
  const isVerified = status === CLAIM_STATUS.VERIFIED;
  const isRejected = status === CLAIM_STATUS.REJECTED;

  const cardMod = isPending
    ? "claim-status-card--pending"
    : isVerified
    ? "claim-status-card--verified"
    : "claim-status-card--rejected";

  return (
    <div className={`claim-status-card ${cardMod}`}>
      <div className="claim-status-card__top">
        <div>
          <span className="claim-status-card__ref">Claim #{claim.claim_id}</span>
          <h3 className="claim-status-card__title">
            {claim.item?.item_name || "Claimed Item"}
          </h3>
        </div>

        <div className="claim-status-card__badge-group">
          {isPending && <Clock size={16} color="var(--color-warning)" aria-hidden="true" />}
          {isVerified && <CheckCircle2 size={16} color="var(--color-success)" aria-hidden="true" />}
          {isRejected && <AlertCircle size={16} color="var(--color-danger)" aria-hidden="true" />}
          <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
        </div>
      </div>

      <div className="claim-status-card__body">
        {isPending && (
          <p>
            Your claim has been submitted and is under verification by authorized campus personnel.
          </p>
        )}

        {isVerified && (
          <div className="claim-status-card__notice">
            <span className="claim-status-card__notice-label">
              Handover & Physical Collection Instructions:
            </span>
            <span>
              {claim.handover_instructions ||
                `Please visit ${
                  claim.item?.custody_location || "Campus Security Desk"
                } during working hours with your physical NIE Student ID Card.`}
            </span>
          </div>
        )}

        {isRejected && claim.rejection_reason && (
          <div className="claim-status-card__notice">
            <span className="claim-status-card__notice-label">Reason for Rejection:</span>
            <span>{claim.rejection_reason}</span>
          </div>
        )}
      </div>

      {showChatAction && (
        <div className="claim-status-card__actions">
          <Link to={`/claims/${claim.claim_id}/chat`}>
            <Button variant="outline" size="sm" icon={MessageSquare}>
              Private Claim Chat
            </Button>
          </Link>
          <Link to={`/claims/${claim.claim_id}`}>
            <Button variant="ghost" size="sm" icon={ShieldCheck}>
              View Claim Details
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default ClaimStatusCard;
