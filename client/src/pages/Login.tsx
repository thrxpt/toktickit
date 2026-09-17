import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { FormField } from "../components/FormField";
import { SubmitButton } from "../components/SubmitButton";
import { getDefaultRouteForRole } from "../utils/navigation";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    if (!email.trim()) {
      setEmailError("Email is required.");
      hasError = true;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required.");
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (hasError) {
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const user = await login({ email: email.trim(), password });
      if (user.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        const fromPath = (location.state as { from?: { pathname?: string } })
          ?.from?.pathname;
        const targetPath =
          fromPath && fromPath !== "/login"
            ? fromPath
            : getDefaultRouteForRole(user.role);
        navigate(targetPath, { replace: true });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid email or password.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center px-3 py-5 bg-body">
      <div className="card shadow-sm w-100" style={{ maxWidth: "440px" }}>
        <div className="card-body p-4 p-sm-5">
          {/* Brand Header */}
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center mb-2"
              style={{ color: "var(--zen-primary)" }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h1
              className="h3 fw-bold mb-1"
              style={{ color: "var(--zen-primary)" }}
            >
              TokTickIT
            </h1>
            <p className="text-body-secondary small mb-0">
              Sign in to manage your support requests
            </p>
          </div>

          {/* Form-level Error Alert */}
          {formError && (
            <div
              className="alert alert-danger py-2 px-3 mb-3 small"
              role="alert"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <FormField id="email" label="Email" required error={emailError}>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                autoFocus
                autoComplete="email"
                placeholder="name@example.com"
              />
            </FormField>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Password
                <span className="text-danger ms-1" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="input-group">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`form-control ${passwordError ? "is-invalid" : ""}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  autoComplete="current-password"
                  aria-invalid={passwordError ? "true" : undefined}
                  aria-describedby={
                    passwordError ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <div id="password-error" className="invalid-feedback d-block">
                  {passwordError}
                </div>
              )}
            </div>

            <SubmitButton
              type="submit"
              className="w-100 mt-3 py-2 fw-semibold"
              loading={submitting}
              busyLabel="Signing In…"
            >
              Sign In
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
