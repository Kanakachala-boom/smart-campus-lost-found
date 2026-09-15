import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  Lock,
  RotateCcw,
  Search,
} from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import FormField from "../../components/forms/FormField";
import ImageUpload from "../../components/forms/ImageUpload";
import ReportHeader from "../../components/items/ReportHeader";
import itemsService from "../../services/itemsService";
import {
  CAMPUS_LOCATIONS,
  getTodayDateString,
  isValidPastOrPresentDate,
  ITEM_CATEGORIES,
  OTHER_LOCATION_VALUE,
  TIME_PERIODS,
} from "../../utils/itemOptions";
import "./ReportLost.css";

const INITIAL_FORM = {
  item_name: "",
  category: "",
  location_lost: "",
  custom_location: "",
  specific_location: "",
  date_lost: getTodayDateString(),
  time_lost: "",
  description: "",
  identifying_marks: "",
  image: null,
  notify_on_match: true,
};

export function ReportLost() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedItem, setSubmittedItem] = useState(null);

  const todayStr = getTodayDateString();

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

  const validateForm = () => {
    const errs = {};

    // 1. Item Name: 3–100 characters, not only whitespace
    const trimmedName = formData.item_name.trim();
    if (!trimmedName) {
      errs.item_name = "Item name is required.";
    } else if (trimmedName.length < 3) {
      errs.item_name = "Item name must be at least 3 characters.";
    } else if (trimmedName.length > 100) {
      errs.item_name = "Item name cannot exceed 100 characters.";
    }

    // 2. Category: Required predefined option
    if (!formData.category) {
      errs.category = "Please select an item category.";
    }

    // 3. Location: Required; if 'Other', custom_location is required (min 3 chars)
    if (!formData.location_lost) {
      errs.location_lost = "Please select where the item was lost.";
    } else if (formData.location_lost === OTHER_LOCATION_VALUE) {
      const trimmedCustom = formData.custom_location.trim();
      if (!trimmedCustom) {
        errs.custom_location = "Please specify the custom campus location.";
      } else if (trimmedCustom.length < 3) {
        errs.custom_location = "Location must be at least 3 characters.";
      }
    }

    // 4. Date Lost: Required, cannot be future
    if (!formData.date_lost) {
      errs.date_lost = "Date lost is required.";
    } else if (!isValidPastOrPresentDate(formData.date_lost)) {
      errs.date_lost = "Date lost cannot be in the future.";
    }

    // 5. Description: Required, 10–1000 characters
    const trimmedDesc = formData.description.trim();
    if (!trimmedDesc) {
      errs.description = "Public description is required.";
    } else if (trimmedDesc.length < 10) {
      errs.description = "Description must be at least 10 characters for effective matching.";
    } else if (trimmedDesc.length > 1000) {
      errs.description = "Description cannot exceed 1000 characters.";
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Focus first erroneous field
      const firstKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(`lost-${firstKey}`);
      el?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const finalLocation =
        formData.location_lost === OTHER_LOCATION_VALUE
          ? formData.custom_location.trim()
          : formData.location_lost;

      const payload = {
        item_name: formData.item_name.trim(),
        category: formData.category,
        location_lost: finalLocation,
        specific_location: formData.specific_location.trim() || undefined,
        date_lost: formData.date_lost,
        time_lost: formData.time_lost || undefined,
        description: formData.description.trim(),
        identifying_marks: formData.identifying_marks.trim() || undefined,
        image: formData.image || undefined,
        notify_on_match: formData.notify_on_match,
      };

      const result = await itemsService.createLostItem(payload);
      setSubmittedItem(result || payload);
    } catch (err) {
      setSubmitError(
        err.message || "Failed to submit lost item report. Please check your inputs and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setErrors({});
    setSubmitError(null);
    setSubmittedItem(null);
  };

  return (
    <div className="report-page">
      <ReportHeader activeMode="lost" />

      <main className="report-container">
        {submittedItem ? (
          /* Confirmation State */
          <Card className="report-success-card" padded>
            <div className="report-success-content">
              <div className="report-success-icon" aria-hidden="true">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="report-success-title">Lost Item Report Submitted</h2>
              <p className="report-success-subtitle">
                Your report has been recorded in the campus system under ID{" "}
                <strong>#{submittedItem.lost_item_id || "NEW"}</strong>.
              </p>

              <div className="report-summary-box">
                <div className="report-summary-row">
                  <span className="report-summary-label">Item:</span>
                  <span className="report-summary-value">{submittedItem.item_name}</span>
                </div>
                <div className="report-summary-row">
                  <span className="report-summary-label">Category:</span>
                  <span className="report-summary-value">{submittedItem.category}</span>
                </div>
                <div className="report-summary-row">
                  <span className="report-summary-label">Location:</span>
                  <span className="report-summary-value">{submittedItem.location_lost}</span>
                </div>
                <div className="report-summary-row">
                  <span className="report-summary-label">Date Lost:</span>
                  <span className="report-summary-value">{submittedItem.date_lost}</span>
                </div>
                <div className="report-summary-row">
                  <span className="report-summary-label">Status:</span>
                  <span className="report-summary-status">Active — Awaiting Match</span>
                </div>
              </div>

              <div className="report-success-note">
                <Search size={16} aria-hidden="true" className="report-success-note-icon" />
                <p>
                  Our automated matching engine will evaluate candidate found items. You will receive
                  a user-specific notification as soon as a potential match is identified.
                </p>
              </div>

              <div className="report-success-actions">
                <Button
                  variant="primary"
                  icon={RotateCcw}
                  onClick={handleReset}
                >
                  Report Another Item
                </Button>
                <Link to="/" className="btn btn--secondary">
                  <span>Return to Home</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          /* Lost Item Form */
          <Card className="report-form-card" padded>
            <div className="report-form-header">
              <div className="report-form-emblem report-form-emblem--lost">
                <Search size={20} aria-hidden="true" />
              </div>
              <div>
                <h2 className="report-form-title">Report a Lost Item</h2>
                <p className="report-form-subtitle">
                  Provide accurate details about what you lost to maximize the chance of automated matching.
                </p>
              </div>
            </div>

            {submitError && (
              <div className="report-alert report-alert--error" role="alert">
                <AlertCircle size={18} aria-hidden="true" className="report-alert__icon" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="report-form">
              {/* Section 1: Item Identity */}
              <div className="report-form-section">
                <h3 className="report-form-section-title">1. Item Information</h3>

                <div className="report-grid report-grid--2col">
                  <FormField
                    id="lost-item_name"
                    label="Item Name / Title"
                    required
                    hint="Brief, descriptive name (e.g. Wildhorn Leather Wallet, HP Laptop Charger)"
                    error={errors.item_name}
                  >
                    <input
                      id="lost-item_name"
                      type="text"
                      className={`form-input ${errors.item_name ? "form-input--error" : ""}`}
                      placeholder="e.g. Black Leather Wallet"
                      value={formData.item_name}
                      maxLength={100}
                      onChange={(e) => handleFieldChange("item_name", e.target.value)}
                      aria-invalid={Boolean(errors.item_name)}
                    />
                  </FormField>

                  <FormField
                    id="lost-category"
                    label="Category"
                    required
                    hint="Select the standard category for algorithmic matching"
                    error={errors.category}
                  >
                    <select
                      id="lost-category"
                      className={`form-select ${errors.category ? "form-select--error" : ""}`}
                      value={formData.category}
                      onChange={(e) => handleFieldChange("category", e.target.value)}
                      aria-invalid={Boolean(errors.category)}
                    >
                      <option value="">Select a category…</option>
                      {ITEM_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>

              {/* Section 2: Location & Timeline */}
              <div className="report-form-section">
                <h3 className="report-form-section-title">2. Location & Date Lost</h3>

                <div className="report-grid report-grid--2col">
                  <FormField
                    id="lost-location_lost"
                    label="Campus Location Lost"
                    required
                    hint="Select common campus zone or 'Other'"
                    error={errors.location_lost}
                  >
                    <select
                      id="lost-location_lost"
                      className={`form-select ${errors.location_lost ? "form-select--error" : ""}`}
                      value={formData.location_lost}
                      onChange={(e) => handleFieldChange("location_lost", e.target.value)}
                      aria-invalid={Boolean(errors.location_lost)}
                    >
                      <option value="">Select campus location…</option>
                      {CAMPUS_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    id="lost-date_lost"
                    label="Date Lost"
                    required
                    hint="Calendar date item was misplaced (cannot be future)"
                    error={errors.date_lost}
                  >
                    <input
                      id="lost-date_lost"
                      type="date"
                      max={todayStr}
                      className={`form-input ${errors.date_lost ? "form-input--error" : ""}`}
                      value={formData.date_lost}
                      onChange={(e) => handleFieldChange("date_lost", e.target.value)}
                      aria-invalid={Boolean(errors.date_lost)}
                    />
                  </FormField>
                </div>

                {/* Conditional Custom Location */}
                {formData.location_lost === OTHER_LOCATION_VALUE && (
                  <FormField
                    id="lost-custom_location"
                    label="Specify Campus Location"
                    required
                    hint="Enter the exact building, ground, or facility"
                    error={errors.custom_location}
                  >
                    <input
                      id="lost-custom_location"
                      type="text"
                      className={`form-input ${errors.custom_location ? "form-input--error" : ""}`}
                      placeholder="e.g. Chemistry Lab 3, 2nd Floor"
                      value={formData.custom_location}
                      onChange={(e) => handleFieldChange("custom_location", e.target.value)}
                      aria-invalid={Boolean(errors.custom_location)}
                    />
                  </FormField>
                )}

                <div className="report-grid report-grid--2col">
                  <FormField
                    id="lost-specific_location"
                    label="Specific Location / Spot"
                    optional
                    hint="Room number, desk, floor, or nearby landmark"
                  >
                    <input
                      id="lost-specific_location"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Table #8, near the water dispenser"
                      value={formData.specific_location}
                      onChange={(e) => handleFieldChange("specific_location", e.target.value)}
                    />
                  </FormField>

                  <FormField
                    id="lost-time_lost"
                    label="Approximate Time"
                    optional
                    hint="Time of day when item was misplaced"
                  >
                    <select
                      id="lost-time_lost"
                      className="form-select"
                      value={formData.time_lost}
                      onChange={(e) => handleFieldChange("time_lost", e.target.value)}
                    >
                      <option value="">Select approximate time…</option>
                      {TIME_PERIODS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>

              {/* Section 3: Descriptions */}
              <div className="report-form-section">
                <h3 className="report-form-section-title">3. Item Description & Identifiers</h3>

                <FormField
                  id="lost-description"
                  label="Public Description"
                  required
                  hint="Describe observable traits visible to anyone (color, brand, visible stickers, general wear). Min 10 characters."
                  error={errors.description}
                  characterCount={{ current: formData.description.length, max: 1000 }}
                >
                  <textarea
                    id="lost-description"
                    className={`form-textarea ${errors.description ? "form-textarea--error" : ""}`}
                    placeholder="e.g. Black leather bifold wallet with contrast blue stitching. Slightly worn at corners."
                    rows={4}
                    maxLength={1000}
                    value={formData.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    aria-invalid={Boolean(errors.description)}
                  />
                </FormField>

                {/* Confidential identifying marks */}
                <div className="report-confidential-field">
                  <div className="report-confidential-badge">
                    <Lock size={13} aria-hidden="true" />
                    <span>Confidential / Hidden from Public Feed</span>
                  </div>
                  <FormField
                    id="lost-identifying_marks"
                    label="Private Identifying Marks"
                    optional
                    hint="Sticker under case, initials inside cover, exact card digits, or contents known only to you. This is NEVER displayed publicly and is used solely to verify ownership."
                  >
                    <textarea
                      id="lost-identifying_marks"
                      className="form-textarea"
                      placeholder="e.g. Contains student ID card ending in 2024 and a 500-rupee note inside the zipper pouch."
                      rows={3}
                      maxLength={500}
                      value={formData.identifying_marks}
                      onChange={(e) => handleFieldChange("identifying_marks", e.target.value)}
                    />
                  </FormField>
                </div>

                {/* Image Upload */}
                <ImageUpload
                  id="lost-image"
                  label="Item Photograph (Optional)"
                  hint="Upload an old photo or reference image if available. Max 5 MB."
                  value={formData.image}
                  onChange={(file) => handleFieldChange("image", file)}
                />

                {/* Potential Match Notifications Preference */}
                <div className="report-preference-group">
                  <h4 className="report-preference-title">Potential Match Notifications</h4>
                  <label className="report-preference-label" htmlFor="lost-notify-on-match">
                    <input
                      type="checkbox"
                      id="lost-notify-on-match"
                      checked={formData.notify_on_match}
                      onChange={(e) => handleFieldChange("notify_on_match", e.target.checked)}
                      className="report-preference-checkbox"
                    />
                    <div className="report-preference-text">
                      <span className="report-preference-text-primary">
                        Notify me when another report may match this item.
                      </span>
                      <span className="report-preference-text-secondary">
                        You can receive a notification when the system finds a potential match for this report.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Controls */}
              <div className="report-form-footer">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  icon={FilePlus2}
                  className="report-submit-btn"
                >
                  Submit Lost Item Report
                </Button>

                <p className="report-footer-notice">
                  By submitting, you confirm that this report describes personal belongings misplaced on the NIE campus.
                </p>
              </div>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}

export default ReportLost;
