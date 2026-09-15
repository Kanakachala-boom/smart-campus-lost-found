import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import FormField from "../../components/forms/FormField";
import ImageUpload from "../../components/forms/ImageUpload";
import ReportHeader from "../../components/items/ReportHeader";
import itemsService from "../../services/itemsService";
import {
  CAMPUS_LOCATIONS,
  CONTACT_PREFERENCES,
  CUSTODY_LOCATIONS,
  getTodayDateString,
  isValidPastOrPresentDate,
  ITEM_CATEGORIES,
  OTHER_CUSTODY_VALUE,
  OTHER_LOCATION_VALUE,
  TIME_PERIODS,
} from "../../utils/itemOptions";
import "./ReportFound.css";

const INITIAL_FORM = {
  item_name: "",
  category: "",
  location_found: "",
  custom_location: "",
  specific_location: "",
  date_found: getTodayDateString(),
  time_found: "",
  description: "",
  custody_location: CUSTODY_LOCATIONS[0],
  custom_custody: "",
  contact_preference: CONTACT_PREFERENCES[0],
  image: null,
  notify_on_match: true,
};

export function ReportFound() {
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
    if (!formData.location_found) {
      errs.location_found = "Please select where the item was found.";
    } else if (formData.location_found === OTHER_LOCATION_VALUE) {
      const trimmedCustom = formData.custom_location.trim();
      if (!trimmedCustom) {
        errs.custom_location = "Please specify the custom campus location.";
      } else if (trimmedCustom.length < 3) {
        errs.custom_location = "Location must be at least 3 characters.";
      }
    }

    // 4. Date Found: Required, cannot be future
    if (!formData.date_found) {
      errs.date_found = "Date found is required.";
    } else if (!isValidPastOrPresentDate(formData.date_found)) {
      errs.date_found = "Date found cannot be in the future.";
    }

    // 5. Description: Required, 10–1000 characters
    const trimmedDesc = formData.description.trim();
    if (!trimmedDesc) {
      errs.description = "General description is required.";
    } else if (trimmedDesc.length < 10) {
      errs.description = "Description must be at least 10 characters.";
    } else if (trimmedDesc.length > 1000) {
      errs.description = "Description cannot exceed 1000 characters.";
    }

    // 6. Custody Location: Required; if 'Other', custom_custody is required (min 3 chars)
    if (!formData.custody_location) {
      errs.custody_location = "Please select current custody location.";
    } else if (formData.custody_location === OTHER_CUSTODY_VALUE) {
      const trimmedCustody = formData.custom_custody.trim();
      if (!trimmedCustody) {
        errs.custom_custody = "Please specify where the item is currently kept.";
      } else if (trimmedCustody.length < 3) {
        errs.custom_custody = "Custody location must be at least 3 characters.";
      }
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
      const el = document.getElementById(`found-${firstKey}`);
      el?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const finalLocation =
        formData.location_found === OTHER_LOCATION_VALUE
          ? formData.custom_location.trim()
          : formData.location_found;

      const finalCustody =
        formData.custody_location === OTHER_CUSTODY_VALUE
          ? formData.custom_custody.trim()
          : formData.custody_location;

      const payload = {
        item_name: formData.item_name.trim(),
        category: formData.category,
        location_found: finalLocation,
        specific_location: formData.specific_location.trim() || undefined,
        date_found: formData.date_found,
        time_found: formData.time_found || undefined,
        description: formData.description.trim(),
        custody_location: finalCustody,
        contact_preference: formData.contact_preference || undefined,
        image: formData.image || undefined,
        notify_on_match: formData.notify_on_match,
      };

      const result = await itemsService.createFoundItem(payload);
      setSubmittedItem(result || payload);
    } catch (err) {
      setSubmitError(
        err.message || "Failed to submit found item report. Please check your inputs and try again.",
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
      <ReportHeader activeMode="found" />

      <main className="report-container">
        {submittedItem ? (
          /* Confirmation State */
          <Card className="report-success-card" padded>
            <div className="report-success-content">
              <div className="report-success-icon" aria-hidden="true">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="report-success-title">Found Item Report Submitted</h2>
              <p className="report-success-subtitle">
                Thank you for reporting this item! Recorded in the campus repository under ID{" "}
                <strong>#{submittedItem.found_item_id || "NEW"}</strong>.
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
                  <span className="report-summary-label">Location Found:</span>
                  <span className="report-summary-value">{submittedItem.location_found}</span>
                </div>
                <div className="report-summary-row">
                  <span className="report-summary-label">Date Found:</span>
                  <span className="report-summary-value">{submittedItem.date_found}</span>
                </div>
                <div className="report-summary-row">
                  <span className="report-summary-label">Current Custody:</span>
                  <span className="report-summary-value">{submittedItem.custody_location}</span>
                </div>
                <div className="report-summary-row">
                  <span className="report-summary-label">Status:</span>
                  <span className="report-summary-status">Active — Available in Feed</span>
                </div>
              </div>

              <div className="report-success-note">
                <ShieldCheck size={16} aria-hidden="true" className="report-success-note-icon" />
                <p>
                  This item is now registered in the campus repository. When a student submits a claim
                  or an automated match is detected, you will receive a notification to coordinate verification.
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
          /* Found Item Form */
          <Card className="report-form-card" padded>
            <div className="report-form-header">
              <div className="report-form-emblem report-form-emblem--found">
                <CheckCircle2 size={20} aria-hidden="true" />
              </div>
              <div>
                <h2 className="report-form-title">Report a Found Item</h2>
                <p className="report-form-subtitle">
                  Help return misplaced belongings to their rightful NIE owners by submitting finding details and custody location.
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
                    id="found-item_name"
                    label="Item Name / Title"
                    required
                    hint="Descriptive name (e.g. Casio Calculator, Blue Water Bottle, Hero Bike Key)"
                    error={errors.item_name}
                  >
                    <input
                      id="found-item_name"
                      type="text"
                      className={`form-input ${errors.item_name ? "form-input--error" : ""}`}
                      placeholder="e.g. Casio Scientific Calculator"
                      value={formData.item_name}
                      maxLength={100}
                      onChange={(e) => handleFieldChange("item_name", e.target.value)}
                      aria-invalid={Boolean(errors.item_name)}
                    />
                  </FormField>

                  <FormField
                    id="found-category"
                    label="Category"
                    required
                    hint="Select the standard category for algorithmic matching"
                    error={errors.category}
                  >
                    <select
                      id="found-category"
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
                <h3 className="report-form-section-title">2. Discovery Location & Date</h3>

                <div className="report-grid report-grid--2col">
                  <FormField
                    id="found-location_found"
                    label="Campus Location Found"
                    required
                    hint="Campus zone where you discovered the item"
                    error={errors.location_found}
                  >
                    <select
                      id="found-location_found"
                      className={`form-select ${errors.location_found ? "form-select--error" : ""}`}
                      value={formData.location_found}
                      onChange={(e) => handleFieldChange("location_found", e.target.value)}
                      aria-invalid={Boolean(errors.location_found)}
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
                    id="found-date_found"
                    label="Date Found"
                    required
                    hint="Date item was discovered (cannot be future)"
                    error={errors.date_found}
                  >
                    <input
                      id="found-date_found"
                      type="date"
                      max={todayStr}
                      className={`form-input ${errors.date_found ? "form-input--error" : ""}`}
                      value={formData.date_found}
                      onChange={(e) => handleFieldChange("date_found", e.target.value)}
                      aria-invalid={Boolean(errors.date_found)}
                    />
                  </FormField>
                </div>

                {/* Conditional Custom Location */}
                {formData.location_found === OTHER_LOCATION_VALUE && (
                  <FormField
                    id="found-custom_location"
                    label="Specify Campus Location"
                    required
                    hint="Enter the exact building, ground, or facility"
                    error={errors.custom_location}
                  >
                    <input
                      id="found-custom_location"
                      type="text"
                      className={`form-input ${errors.custom_location ? "form-input--error" : ""}`}
                      placeholder="e.g. Physics Lab 2, Ground Floor"
                      value={formData.custom_location}
                      onChange={(e) => handleFieldChange("custom_location", e.target.value)}
                      aria-invalid={Boolean(errors.custom_location)}
                    />
                  </FormField>
                )}

                <div className="report-grid report-grid--2col">
                  <FormField
                    id="found-specific_location"
                    label="Specific Location / Spot"
                    optional
                    hint="Room number, desk, bench, or nearby landmark"
                  >
                    <input
                      id="found-specific_location"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 2nd Floor reading table #14"
                      value={formData.specific_location}
                      onChange={(e) => handleFieldChange("specific_location", e.target.value)}
                    />
                  </FormField>

                  <FormField
                    id="found-time_found"
                    label="Approximate Time"
                    optional
                    hint="Time of day when item was spotted"
                  >
                    <select
                      id="found-time_found"
                      className="form-select"
                      value={formData.time_found}
                      onChange={(e) => handleFieldChange("time_found", e.target.value)}
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

              {/* Section 3: Custody & Contact */}
              <div className="report-form-section">
                <h3 className="report-form-section-title">3. Current Custody & Handover</h3>

                <div className="report-grid report-grid--2col">
                  <FormField
                    id="found-custody_location"
                    label="Current Custody / Storage Location"
                    required
                    hint="Where is the physical item currently kept?"
                    error={errors.custody_location}
                  >
                    <select
                      id="found-custody_location"
                      className={`form-select ${errors.custody_location ? "form-select--error" : ""}`}
                      value={formData.custody_location}
                      onChange={(e) => handleFieldChange("custody_location", e.target.value)}
                      aria-invalid={Boolean(errors.custody_location)}
                    >
                      {CUSTODY_LOCATIONS.map((cust) => (
                        <option key={cust} value={cust}>
                          {cust}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    id="found-contact_preference"
                    label="Contact Preference"
                    optional
                    hint="How you prefer to coordinate handover with the owner"
                  >
                    <select
                      id="found-contact_preference"
                      className="form-select"
                      value={formData.contact_preference}
                      onChange={(e) => handleFieldChange("contact_preference", e.target.value)}
                    >
                      {CONTACT_PREFERENCES.map((pref) => (
                        <option key={pref} value={pref}>
                          {pref}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                {/* Conditional Custom Custody */}
                {formData.custody_location === OTHER_CUSTODY_VALUE && (
                  <FormField
                    id="found-custom_custody"
                    label="Specify Custody Location"
                    required
                    hint="Specify where the item is securely deposited"
                    error={errors.custom_custody}
                  >
                    <input
                      id="found-custom_custody"
                      type="text"
                      className={`form-input ${errors.custom_custody ? "form-input--error" : ""}`}
                      placeholder="e.g. With Sports Dept Office, Coach Room"
                      value={formData.custom_custody}
                      onChange={(e) => handleFieldChange("custom_custody", e.target.value)}
                      aria-invalid={Boolean(errors.custom_custody)}
                    />
                  </FormField>
                )}
              </div>

              {/* Section 4: Descriptions & Image */}
              <div className="report-form-section">
                <h3 className="report-form-section-title">4. Description & Photograph</h3>

                <FormField
                  id="found-description"
                  label="General Description"
                  required
                  hint="Describe observable traits visible to anyone (color, brand, model, physical condition). Min 10 characters."
                  error={errors.description}
                  characterCount={{ current: formData.description.length, max: 1000 }}
                >
                  <textarea
                    id="found-description"
                    className={`form-textarea ${errors.description ? "form-textarea--error" : ""}`}
                    placeholder="e.g. Casio fx-991EX Classwiz scientific calculator in black slide cover. Good working condition."
                    rows={4}
                    maxLength={1000}
                    value={formData.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    aria-invalid={Boolean(errors.description)}
                  />
                </FormField>

                {/* Image Upload */}
                <ImageUpload
                  id="found-image"
                  label="Item Photograph (Recommended)"
                  hint="Photograph of the item helps the rightful owner verify and claim it. Max 5 MB."
                  value={formData.image}
                  onChange={(file) => handleFieldChange("image", file)}
                />

                {/* Potential Match Notifications Preference */}
                <div className="report-preference-group">
                  <h4 className="report-preference-title">Potential Match Notifications</h4>
                  <label className="report-preference-label" htmlFor="found-notify-on-match">
                    <input
                      type="checkbox"
                      id="found-notify-on-match"
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
                  Submit Found Item Report
                </Button>

                <p className="report-footer-notice">
                  By submitting, you agree to safeguard or deposit this item at the stated custody location for its rightful owner.
                </p>
              </div>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}

export default ReportFound;
