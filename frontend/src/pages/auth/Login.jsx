/**
 * Login page — Stage 2 Authentication.
 *
 * Provides campus user authentication with client-side validation, accessible
 * password visibility toggling, error alerts, and redirect handling.
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  LogIn,
} from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ThemeToggle from "../../components/common/ThemeToggle";
import useAuth from "../../hooks/useAuth";
import "./Login.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success message passed from registration redirect
  const registrationSuccessMessage = location.state?.message || "";
  const redirectTo = location.state?.from?.pathname || "/auth-test";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error upon editing
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

    if (!formData.email.trim()) {
      nextErrors.email = "Institutional email is required.";
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!formData.password) {
      nextErrors.password = "Password is required.";
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
      await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(
        err?.message || "Invalid credentials. Please check your email and password.",
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
        <Card className="auth-card" padded={false}>
          <div className="auth-card__content">
            <header className="auth-card__header">
              <div className="auth-card__badge">Stage 2 Authentication</div>
              <h1 className="auth-card__title">Sign In</h1>
              <p className="auth-card__subtitle">
                Enter your campus credentials to access lost and found services.
              </p>
            </header>

            {registrationSuccessMessage && (
              <div
                className="auth-alert auth-alert--success"
                role="status"
                aria-live="polite"
              >
                <CheckCircle2
                  size={18}
                  className="auth-alert__icon"
                  aria-hidden="true"
                />
                <div>{registrationSuccessMessage}</div>
              </div>
            )}

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
                <label htmlFor="login-email" className="auth-label">
                  Institutional Email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`auth-input ${
                    errors.email ? "auth-input--error" : ""
                  }`}
                  placeholder="e.g. ananya.rao@example.edu"
                  value={formData.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "login-email-error" : undefined}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p id="login-email-error" className="auth-error">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="login-password" className="auth-label">
                    Password
                  </label>
                </div>
                <div className="auth-password-wrapper">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className={`auth-input auth-input--with-toggle ${
                      errors.password ? "auth-input--error" : ""
                    }`}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "login-password-error" : undefined
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
                  <p id="login-password-error" className="auth-error">
                    {errors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                icon={LogIn}
                className="auth-submit-btn"
              >
                Sign In
              </Button>
            </form>

            <div className="auth-card__footer">
              <p>
                Don't have an account?{" "}
                <Link to="/register" className="auth-link">
                  Register here
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

export default Login;
