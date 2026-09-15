/**
 * Reset Password page — The National Institute of Engineering (NIE), Mysuru.
 *
 * Provides the UI for entering and confirming a new password.
 * Receives an optional reset token from URL query params (simulated for now).
 */

import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ThemeToggle from "../../components/common/ThemeToggle";
import useAuth from "../../hooks/useAuth";
import "./ResetPassword.css";

export function ResetPassword() {
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (serverError) {
      setServerError("");
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.newPassword) {
      nextErrors.newPassword = "New password is required.";
    } else if (formData.newPassword.length < 8) {
      nextErrors.newPassword = "Password must be at least 8 characters long.";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password.";
    } else if (formData.newPassword !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await resetPassword({
        token,
        newPassword: formData.newPassword,
      });

      setIsSuccess(true);
    } catch (err) {
      setServerError(
        err?.message ||
          "Unable to update password. Your reset link may have expired.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <Link to="/" className="auth-topbar__brand">
          <GraduationCap size={20} className="auth-topbar__icon" aria-hidden="true" />
          <span>The National Institute of Engineering, Mysuru</span>
        </Link>
        <ThemeToggle />
      </div>

      <main className="auth-container">
        <Card className="auth-card" padded={false}>
          <div className="auth-card__content">
            <header className="auth-card__header">
              <div className="auth-card__icon-badge">
                <KeyRound size={24} className="auth-card__icon" aria-hidden="true" />
              </div>
              <h1 className="auth-card__title">Reset your password</h1>
              <p className="auth-card__subtitle">
                Create a new secure password for your NIE campus account.
              </p>
            </header>

            {isSuccess ? (
              <div
                className="auth-reset-success"
                role="status"
                aria-live="polite"
              >
                <div className="auth-alert auth-alert--success">
                  <CheckCircle2
                    size={20}
                    className="auth-alert__icon"
                    aria-hidden="true"
                  />
                  <div>
                    <h4 className="auth-reset-success__title">
                      Password Updated Successfully
                    </h4>
                    <p className="auth-reset-success__desc">
                      Your NIE account password has been updated. You can now
                      log in using your new credentials.
                    </p>
                  </div>
                </div>

                <div className="auth-reset-actions">
                  <Link to="/login">
                    <Button variant="primary" size="lg" fullWidth>
                      Return to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {serverError && (
                  <div
                    className="auth-alert auth-alert--error"
                    role="alert"
                    aria-live="assertive"
                  >
                    <AlertCircle
                      size={18}
                      className="auth-alert__icon"
                      aria-hidden="true"
                    />
                    <div>{serverError}</div>
                  </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                  <div className="auth-field">
                    <label htmlFor="reset-new-password" className="auth-label">
                      New Password
                    </label>
                    <div className="auth-password-wrapper">
                      <input
                        id="reset-new-password"
                        name="newPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className={`auth-input auth-input--with-toggle ${
                          errors.newPassword ? "auth-input--error" : ""
                        }`}
                        placeholder="Minimum 8 characters"
                        value={formData.newPassword}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.newPassword)}
                        aria-describedby={
                          errors.newPassword
                            ? "reset-new-password-error"
                            : undefined
                        }
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        disabled={isSubmitting}
                      >
                        {showPassword ? (
                          <EyeOff size={18} aria-hidden="true" />
                        ) : (
                          <Eye size={18} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p id="reset-new-password-error" className="auth-error">
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  <div className="auth-field">
                    <label
                      htmlFor="reset-confirm-password"
                      className="auth-label"
                    >
                      Confirm New Password
                    </label>
                    <div className="auth-password-wrapper">
                      <input
                        id="reset-confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className={`auth-input auth-input--with-toggle ${
                          errors.confirmPassword ? "auth-input--error" : ""
                        }`}
                        placeholder="Re-enter your new password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        aria-invalid={Boolean(errors.confirmPassword)}
                        aria-describedby={
                          errors.confirmPassword
                            ? "reset-confirm-password-error"
                            : undefined
                        }
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} aria-hidden="true" />
                        ) : (
                          <Eye size={18} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p
                        id="reset-confirm-password-error"
                        className="auth-error"
                      >
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                    icon={ShieldCheck}
                    className="auth-submit-btn"
                  >
                    Set New Password
                  </Button>
                </form>

                <div className="auth-card__footer">
                  <Link to="/login" className="auth-back-link">
                    <ArrowLeft size={16} aria-hidden="true" />
                    <span>Back to Login</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

export default ResetPassword;
