/**
 * Forgot Password page — The National Institute of Engineering (NIE), Mysuru.
 *
 * Prompts for the registered NIE college email and submits a recovery request.
 * Displays neutral confirmation copy to prevent account enumeration.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Mail,
  Send,
} from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ThemeToggle from "../../components/common/ThemeToggle";
import useAuth from "../../hooks/useAuth";
import { isValidNieEmail } from "../../utils/validators";
import "./ForgotPassword.css";

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();

    if (!trimmed) {
      setError("Please enter your registered NIE college email.");
      return;
    }

    if (!isValidNieEmail(trimmed)) {
      setError("Please use your official NIE email address (@nie.ac.in).");
      return;
    }

    setIsSubmitting(true);

    try {
      await requestPasswordReset(trimmed);
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to process recovery request. Please try again later.",
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
                <Mail size={24} className="auth-card__icon" aria-hidden="true" />
              </div>
              <h1 className="auth-card__title">Forgot your password?</h1>
              <p className="auth-card__subtitle">
                Enter your registered NIE email address and we'll send password
                recovery instructions to your college email.
              </p>
            </header>

            {isSubmitted ? (
              <div className="auth-recovery-success" role="status" aria-live="polite">
                <div className="auth-alert auth-alert--success">
                  <CheckCircle2
                    size={20}
                    className="auth-alert__icon"
                    aria-hidden="true"
                  />
                  <div>
                    <h4 style={{ margin: "0 0 6px 0", fontWeight: 600 }}>Recovery Link Dispatched</h4>
                    <p className="auth-recovery-success__text">
                      If an account matches the details provided, password reset instructions will be sent to the registered contact. Please check your inbox and spam folder.
                    </p>
                  </div>
                </div>

                <div className="auth-card__footer">
                  <Link to="/login" className="auth-back-link">
                    <ArrowLeft size={16} aria-hidden="true" />
                    <span>Back to Login</span>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {error && (
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
                    <div>{error}</div>
                  </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                  <div className="auth-field">
                    <label htmlFor="recovery-email" className="auth-label">
                      Registered NIE Email
                    </label>
                    <input
                      id="recovery-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={`auth-input ${error ? "auth-input--error" : ""}`}
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "recovery-email-error" : undefined}
                      disabled={isSubmitting}
                    />
                    {error ? (
                      <p id="recovery-email-error" className="auth-error">
                        {error}
                      </p>
                    ) : (
                      <p className="auth-hint">Must end with @nie.ac.in</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                    icon={Send}
                    className="auth-submit-btn"
                  >
                    Send Recovery Link
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

export default ForgotPassword;
