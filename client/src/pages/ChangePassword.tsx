import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { SubmitButton } from "../components/SubmitButton";
import { getDefaultRouteForRole } from "../utils/navigation";

export function ChangePassword() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Password criteria checks (BR-07, UI-03)
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);

  const isPolicySatisfied =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  const passwordsMatch =
    confirmPassword.length > 0 && confirmPassword === newPassword;
  const isDifferentFromCurrent =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    newPassword !== currentPassword;

  const canSubmit =
    currentPassword.length > 0 &&
    isPolicySatisfied &&
    passwordsMatch &&
    isDifferentFromCurrent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            "Failed to change password. Please try again.",
        );
      }

      const updatedUser = await refreshUser();
      const role = updatedUser?.role || user?.role || "REQUESTER";
      navigate(getDefaultRouteForRole(role), { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to change password.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center px-3 py-5 bg-body">
      <div className="card shadow-sm w-100" style={{ maxWidth: "480px" }}>
        <div className="card-body p-4 p-sm-5">
          {/* Header */}
          <div className="text-center mb-4">
            <h1
              className="h3 fw-bold mb-2"
              style={{ color: "var(--zen-primary)" }}
            >
              Change Your Password
            </h1>
            <p className="text-body-secondary small mb-0">
              You must change your password to continue.
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
            {/* Current Password */}
            <div className="mb-3">
              <label htmlFor="currentPassword" className="form-label">
                Current Password
                <span className="text-danger ms-1" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="input-group">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                >
                  {showCurrentPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label">
                New Password
                <span className="text-danger ms-1" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="input-group">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-describedby="password-criteria"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={
                    showNewPassword ? "Hide new password" : "Show new password"
                  }
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Live Criteria Checklist (UI-03, BR-07) */}
            <div
              id="password-criteria"
              className="card bg-light border-0 p-3 mb-3"
              aria-label="Password criteria"
            >
              <span className="small fw-semibold mb-2 text-secondary">
                Password must satisfy:
              </span>
              <ul className="list-unstyled mb-0 small">
                <li
                  className={`d-flex align-items-center mb-1 ${
                    hasMinLength
                      ? "text-success fw-medium"
                      : "text-body-secondary"
                  }`}
                  data-testid="criterion-length"
                >
                  <span className="me-2" aria-hidden="true">
                    {hasMinLength ? "✓" : "○"}
                  </span>{" "}
                  <span>At least 8 characters</span>
                </li>
                <li
                  className={`d-flex align-items-center mb-1 ${
                    hasUppercase
                      ? "text-success fw-medium"
                      : "text-body-secondary"
                  }`}
                  data-testid="criterion-uppercase"
                >
                  <span className="me-2" aria-hidden="true">
                    {hasUppercase ? "✓" : "○"}
                  </span>{" "}
                  <span>At least one uppercase letter</span>
                </li>
                <li
                  className={`d-flex align-items-center mb-1 ${
                    hasLowercase
                      ? "text-success fw-medium"
                      : "text-body-secondary"
                  }`}
                  data-testid="criterion-lowercase"
                >
                  <span className="me-2" aria-hidden="true">
                    {hasLowercase ? "✓" : "○"}
                  </span>{" "}
                  <span>At least one lowercase letter</span>
                </li>
                <li
                  className={`d-flex align-items-center mb-1 ${
                    hasNumber ? "text-success fw-medium" : "text-body-secondary"
                  }`}
                  data-testid="criterion-digit"
                >
                  <span className="me-2" aria-hidden="true">
                    {hasNumber ? "✓" : "○"}
                  </span>{" "}
                  <span>At least one numeric digit</span>
                </li>
                <li
                  className={`d-flex align-items-center mb-1 ${
                    hasSpecialChar
                      ? "text-success fw-medium"
                      : "text-body-secondary"
                  }`}
                  data-testid="criterion-special"
                >
                  <span className="me-2" aria-hidden="true">
                    {hasSpecialChar ? "✓" : "○"}
                  </span>{" "}
                  <span>At least one special character</span>
                </li>
                {newPassword.length > 0 &&
                  currentPassword.length > 0 &&
                  !isDifferentFromCurrent && (
                    <li className="d-flex align-items-center text-danger mt-1">
                      <span className="me-2" aria-hidden="true">
                        ✕
                      </span>
                      <span>Must be different from current password</span>
                    </li>
                  )}
              </ul>
            </div>

            {/* Confirm Password */}
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm New Password
                <span className="text-danger ms-1" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="input-group">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "true"
                      : undefined
                  }
                  aria-describedby={
                    confirmPassword.length > 0 ? "confirm-feedback" : undefined
                  }
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm match message */}
            {confirmPassword.length > 0 && (
              <div id="confirm-feedback" className="mb-3 small">
                {passwordsMatch ? (
                  <span
                    className="text-success fw-medium"
                    data-testid="password-match"
                  >
                    ✓ Passwords match
                  </span>
                ) : (
                  <span className="text-danger" data-testid="password-mismatch">
                    ✕ Passwords do not match
                  </span>
                )}
              </div>
            )}

            <SubmitButton
              type="submit"
              className="w-100 mt-2 py-2 fw-semibold"
              loading={submitting}
              disabled={!canSubmit}
              busyLabel="Saving New Password…"
            >
              Continue
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;
