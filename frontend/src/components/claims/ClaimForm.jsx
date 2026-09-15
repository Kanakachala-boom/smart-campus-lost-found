import { useState } from "react";
import { Lock, Package, ShieldCheck } from "lucide-react";
import Button from "../common/Button";
import FormField from "../forms/FormField";
import ImageUpload from "../forms/ImageUpload";
import { getTodayDateString } from "../../utils/itemOptions";
import "./ClaimForm.css";

export function ClaimForm({
  foundItem,
  challenge,
  onSubmit,
  onCancel,
  isSubmitting = false,
  apiError = null,
}) {
  const todayStr = getTodayDateString();

  const [formData, setFormData] = useState({
    verification_details: "",
    lost_date: todayStr,
    lost_location: "",
    claimant_answer: "",
    proof_image: null,
    affirmed: false,
  });

  const [errors, setErrors] = useState({});

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const errs = {};

    if (!formData.verification_details.trim()) {
      errs.verification_details = "Proof of ownership description is required.";
    } else if (formData.verification_details.trim().length < 30) {
      errs.verification_details = "Please provide at least 30 characters of specific ownership evidence.";
    } else if (formData.verification_details.length > 1000) {
      errs.verification_details = "Description must not exceed 1000 characters.";
    }

    if (!formData.lost_date) {
      errs.lost_date = "Date lost is required.";
    } else if (formData.lost_date > todayStr) {
      errs.lost_date = "Date lost cannot be in the future.";
    }

    if (!formData.lost_location.trim()) {
      errs.lost_location = "Campus location where item was misplaced is required.";
    }

    if (challenge?.has_challenge && !formData.claimant_answer.trim()) {
      errs.claimant_answer = "Please answer the verification challenge question.";
    }

    if (!formData.affirmed) {
      errs.affirmed = "You must confirm that you are the rightful owner.";
    }

    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSubmit({
      found_item_id: foundItem.id,
      verification_details: formData.verification_details.trim(),
      lost_date: formData.lost_date,
      lost_location: formData.lost_location.trim(),
      claimant_answer: challenge?.has_challenge ? formData.claimant_answer.trim() : null,
      proof_image_url: formData.proof_image ? URL.createObjectURL(formData.proof_image) : null,
    });
  };

  return (
    <form className="claim-form-card" onSubmit={handleSubmit} noValidate>
      <div className="claim-form-header">
        <h1 className="claim-form-title">Ownership Verification & Claim</h1>
        <p className="claim-form-subtitle">
          Submit confidential proof of ownership for institutional review.
        </p>
      </div>

      {apiError && (
        <div className="form-error-banner" role="alert">
          {apiError}
        </div>
      )}

      {/* Target Item Context */}
      {foundItem && (
        <div className="claim-item-context">
          {foundItem.image_url ? (
            <img
              src={foundItem.image_url}
              alt={foundItem.item_name}
              className="claim-item-context__img"
            />
          ) : (
            <div className="claim-item-context__fallback" aria-hidden="true">
              <Package size={28} />
            </div>
          )}
          <div className="claim-item-context__info">
            <span className="claim-item-context__name">{foundItem.item_name}</span>
            <span className="claim-item-context__meta">
              Found on {foundItem.date} at {foundItem.location} • Held at: {foundItem.custody_location || "Campus Security"}
            </span>
          </div>
        </div>
      )}

      {/* Security Reassurance */}
      <div className="claim-security-banner">
        <Lock size={16} aria-hidden="true" className="claim-security-banner__icon" />
        <span className="claim-security-banner__text">
          Confidential Submission: Your submitted proof is strictly hidden from the public feed and is only accessible to authorized NIE evaluators during handover verification.
        </span>
      </div>

      {/* Section 1: Detailed Ownership Proof */}
      <div className="claim-form-section">
        <h2 className="claim-form-section-title">1. Ownership Evidence</h2>

        <FormField
          id="claim-verification_details"
          label="Proof of Ownership & Confidential Marks"
          required
          hint="Describe identifying marks not visible in the public listing, serial numbers, specific scratches, stickers, internal contents, or other details that help verify ownership. (Min 30 characters)"
          error={errors.verification_details}
          characterCount={{ current: formData.verification_details.length, max: 1000 }}
        >
          <textarea
            id="claim-verification_details"
            className={`form-textarea ${errors.verification_details ? "form-textarea--error" : ""}`}
            rows={4}
            maxLength={1000}
            placeholder="e.g. Has initials 'KA' scratched inside the battery compartment cover, and contains student ID card ending in 045..."
            value={formData.verification_details}
            onChange={(e) => handleFieldChange("verification_details", e.target.value)}
            aria-invalid={Boolean(errors.verification_details)}
          />
        </FormField>
      </div>

      {/* Section 2: Loss Timeline & Location */}
      <div className="claim-form-section">
        <h2 className="claim-form-section-title">2. Loss Circumstances</h2>

        <div className="report-grid report-grid--2col">
          <FormField
            id="claim-lost_date"
            label="Approximate Date Lost"
            required
            hint="Date you misplaced the item"
            error={errors.lost_date}
          >
            <input
              id="claim-lost_date"
              type="date"
              className={`form-input ${errors.lost_date ? "form-input--error" : ""}`}
              max={todayStr}
              value={formData.lost_date}
              onChange={(e) => handleFieldChange("lost_date", e.target.value)}
              aria-invalid={Boolean(errors.lost_date)}
            />
          </FormField>

          <FormField
            id="claim-lost_location"
            label="Campus Location Misplaced"
            required
            hint="Building, room, or zone where item was lost"
            error={errors.lost_location}
          >
            <input
              id="claim-lost_location"
              type="text"
              className={`form-input ${errors.lost_location ? "form-input--error" : ""}`}
              placeholder="e.g. Central Library 2nd Floor or Canteen"
              value={formData.lost_location}
              onChange={(e) => handleFieldChange("lost_location", e.target.value)}
              aria-invalid={Boolean(errors.lost_location)}
            />
          </FormField>
        </div>
      </div>

      {/* Section 3: Challenge Question (if item has one) */}
      {challenge?.has_challenge && (
        <div className="claim-form-section">
          <h2 className="claim-form-section-title">3. Security Verification Challenge</h2>
          <div className="claim-challenge-box">
            <span className="claim-challenge-box__label">Custodian Verification Question</span>
            <span className="claim-challenge-box__prompt">{challenge.question}</span>
          </div>

          <FormField
            id="claim-claimant_answer"
            label="Your Answer"
            required
            hint="Answer the specific prompt above to establish ownership"
            error={errors.claimant_answer}
          >
            <input
              id="claim-claimant_answer"
              type="text"
              className={`form-input ${errors.claimant_answer ? "form-input--error" : ""}`}
              placeholder="Enter your confidential answer…"
              value={formData.claimant_answer}
              onChange={(e) => handleFieldChange("claimant_answer", e.target.value)}
              aria-invalid={Boolean(errors.claimant_answer)}
            />
          </FormField>
        </div>
      )}

      {/* Section 4: Supporting Proof Image */}
      <div className="claim-form-section">
        <h2 className="claim-form-section-title">
          {challenge?.has_challenge ? "4" : "3"}. Supporting Document / Prior Photo (Optional)
        </h2>
        <ImageUpload
          id="claim-proof_image"
          label="Purchase Invoice, Serial Card, or Old Photo"
          hint="Upload a receipt or prior photo showing you in possession of the item if available. Max 5 MB."
          value={formData.proof_image}
          onChange={(file) => handleFieldChange("proof_image", file)}
        />
      </div>

      {/* Section 5: Affirmation */}
      <div className="claim-form-section">
        <label className="claim-affirmation" htmlFor="claim-affirmed">
          <input
            type="checkbox"
            id="claim-affirmed"
            className="claim-affirmation__checkbox"
            checked={formData.affirmed}
            onChange={(e) => handleFieldChange("affirmed", e.target.checked)}
          />
          <span className="claim-affirmation__text">
            I confirm that I am the rightful owner of this item and that the information provided in this claim is accurate.
          </span>
        </label>
        {errors.affirmed && (
          <span className="form-error-inline" role="alert">
            {errors.affirmed}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="claim-form-actions">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          icon={ShieldCheck}
          isLoading={isSubmitting}
        >
          Submit Claim for Verification
        </Button>
      </div>
    </form>
  );
}

export default ClaimForm;
