/**
 * Registration page — The National Institute of Engineering (NIE), Mysuru.
 *
 * Provides institutional student and staff registration with @nie.ac.in email domain
 * validation, ID validation, password confirmation, error alerts, and redirect handling.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  UserPlus,
} from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import ThemeToggle from "../../components/common/ThemeToggle";
import useAuth from "../../hooks/useAuth";
import { isValidNieEmail } from "../../utils/validators";
import "./Login.css";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    student_staff_id: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      nextErrors.name = "Name must be at least 2 characters.";
    }

    if (!formData.student_staff_id.trim()) {
      nextErrors.student_staff_id = "College USN / Staff ID is required.";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "College email is required.";
    } else if (!isValidNieEmail(formData.email.trim())) {
      nextErrors.email = "Please use your official NIE email address (@nie.ac.in).";
    }

    if (!formData.password) {
      nextErrors.password = "Password is required.";
    } else if (formData.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    if (formData.password !== formData.confirmPassword) {
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
        student_staff_id: formData.student_staff_id.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(
        err?.message || "Registration failed. An account may already exist with this email or ID.",
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
              <div className="auth-card__emblem">
                <Building2 size={28} className="auth-card__emblem-icon" aria-hidden="true" />
              </div>
              <div className="auth-card__institution">
                The National Institute of Engineering
              </div>
              <h1 className="auth-card__title">
                Register Student / Staff Account
              </h1>
              <p className="auth-card__subtitle">
                Create institutional access for Smart Campus Lost &amp; Found
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
                <label htmlFor="reg-name" className="auth-label">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className={`auth-input ${errors.name ? "auth-input--error" : ""}`}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.name)}
                  disabled={isSubmitting}
                />
                {errors.name && <p className="auth-error">{errors.name}</p>}
              </div>

              <div className="auth-field">
                <label htmlFor="reg-id" className="auth-label">
                  College USN / Staff ID
                </label>
                <input
                  id="reg-id"
                  name="student_staff_id"
                  type="text"
                  className={`auth-input ${errors.student_staff_id ? "auth-input--error" : ""}`}
                  placeholder="Enter your USN or Staff ID"
                  value={formData.student_staff_id}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.student_staff_id)}
                  disabled={isSubmitting}
                />
                {errors.student_staff_id && <p className="auth-error">{errors.student_staff_id}</p>}
              </div>

              <div className="auth-field">
                <label htmlFor="reg-email" className="auth-label">
                  College Email ID (@nie.ac.in)
                </label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`auth-input ${errors.email ? "auth-input--error" : ""}`}
                  placeholder="Enter your college email"
                  value={formData.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.email)}
                  disabled={isSubmitting}
                />
                {errors.email ? (
                  <p className="auth-error">{errors.email}</p>
                ) : (
                  <p className="auth-hint">Must end with @nie.ac.in</p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="reg-phone" className="auth-label">
                  Phone Number <span style={{ opacity: 0.6 }}>(Optional)</span>
                </label>
                <input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="auth-input"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="reg-password" className="auth-label">
                  Password
                </label>
                <div className="auth-password-wrapper">
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`auth-input auth-input--with-toggle ${
                      errors.password ? "auth-input--error" : ""
                    }`}
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.password)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="auth-error">{errors.password}</p>}
              </div>

              <div className="auth-field">
                <label htmlFor="reg-confirm" className="auth-label">
                  Confirm Password
                </label>
                <input
                  id="reg-confirm"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className={`auth-input ${errors.confirmPassword ? "auth-input--error" : ""}`}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  disabled={isSubmitting}
                />
                {errors.confirmPassword && <p className="auth-error">{errors.confirmPassword}</p>}
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
                Register Account
              </Button>
            </form>

            <div className="auth-card__footer">
              <p className="auth-institutional-note">
                Already registered with NIE credentials?{" "}
                <Link to="/login" style={{ fontWeight: 600, color: "var(--color-primary-600)" }}>
                  Log In here
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
