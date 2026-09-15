/**
 * Registration page — Stage 2 Authentication.
 *
 * Allows new campus users to create an account with client-side validation,
 * password matching, optional phone validation, and password visibility toggle.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  UserPlus,
} from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ThemeToggle from "../../components/common/ThemeToggle";
import useAuth from "../../hooks/useAuth";
import "./Register.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!formData.name.trim()) {
      nextErrors.name = "Full name is required.";
    } else if (formData.name.trim().length < 2) {
      nextErrors.name = "Name must be at least 2 characters long.";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Institutional email is required.";
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      nextErrors.email = "Please enter a valid institutional email.";
    }

    if (formData.phone.trim() && !PHONE_REGEX.test(formData.phone.trim())) {
      nextErrors.phone = "Please enter a valid phone number (e.g. 9876543210).";
    }

    if (!formData.password) {
      nextErrors.password = "Password is required.";
    } else if (formData.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters long.";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
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
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        password: formData.password,
      });

      // Redirect to login page with success notification
      navigate("/login", {
        state: {
          message:
            "Account registered successfully! Please sign in with your credentials.",
        },
      });
    } catch (err) {
      setServerError(
        err?.message || "Registration failed. Please review your details and try again.",
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
          <span>Smart Campus Lost &amp; Found</span>
        </Link>
        <ThemeToggle />
      </div>

      <main className="auth-container">
        <Card className="auth-card auth-card--register" padded={false}>
          <div className="auth-card__content">
            <header className="auth-card__header">
              <div className="auth-card__badge">Stage 2 Authentication</div>
              <h1 className="auth-card__title">Create Account</h1>
              <p className="auth-card__subtitle">
                Register with your campus email to report or recover items.
              </p>
            </header>

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
                <label htmlFor="register-name" className="auth-label">
                  Full Name
                </label>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className={`auth-input ${
                    errors.name ? "auth-input--error" : ""
                  }`}
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "register-name-error" : undefined}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p id="register-name-error" className="auth-error">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="register-email" className="auth-label">
                  Institutional Email
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`auth-input ${
                    errors.email ? "auth-input--error" : ""
                  }`}
                  placeholder="e.g. rahul.sharma@example.edu"
                  value={formData.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "register-email-error" : undefined
                  }
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p id="register-email-error" className="auth-error">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="register-phone" className="auth-label">
                    Phone Number <span className="auth-label__optional">(Optional)</span>
                  </label>
                </div>
                <input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className={`auth-input ${
                    errors.phone ? "auth-input--error" : ""
                  }`}
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={
                    errors.phone ? "register-phone-error" : undefined
                  }
                  disabled={isSubmitting}
                />
                {errors.phone ? (
                  <p id="register-phone-error" className="auth-error">
                    {errors.phone}
                  </p>
                ) : (
                  <p className="auth-help">
                    Used strictly for claim ownership contact and verified pickups.
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="register-password" className="auth-label">
                  Password
                </label>
                <div className="auth-password-wrapper">
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`auth-input auth-input--with-toggle ${
                      errors.password ? "auth-input--error" : ""
                    }`}
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "register-password-error" : undefined
                    }
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="register-password-error" className="auth-error">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="register-confirm-password" className="auth-label">
                  Confirm Password
                </label>
                <div className="auth-password-wrapper">
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`auth-input auth-input--with-toggle ${
                      errors.confirmPassword ? "auth-input--error" : ""
                    }`}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    aria-describedby={
                      errors.confirmPassword
                        ? "register-confirm-password-error"
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
                  <p id="register-confirm-password-error" className="auth-error">
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
                icon={UserPlus}
                className="auth-submit-btn"
              >
                Create Account
              </Button>
            </form>

            <div className="auth-card__footer">
              <p>
                Already have an account?{" "}
                <Link to="/login" className="auth-link">
                  Sign in here
                </Link>
              </p>
              <p className="auth-card__sublink">
                <Link to="/" className="auth-link--muted">
                  &larr; Return to Foundation Check
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

export default Register;
