import React, { useEffect, useRef, useState } from "react";

import apiFetch from "../../api/client";
import { FormField } from "../../components/FormField";

export interface AdminUserData {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
}

export interface UserEditDrawerProps {
  isOpen: boolean;
  user: AdminUserData | null; // null = Create mode, AdminUserData = Edit mode
  currentAdminId?: number;
  activeAdminCount?: number;
  onClose: () => void;
  onSaved: (savedUser: AdminUserData) => void;
}

function validateInitialPassword(password: string): string | null {
  if (!password) {
    return "Initial password is required.";
  }
  if (password.length < 8) {
    return "Initial password must be at least 8 characters long.";
  }
  return null;
}

export function UserEditDrawer({
  isOpen,
  user,
  currentAdminId,
  activeAdminCount = 1,
  onClose,
  onSaved,
}: UserEditDrawerProps) {
  const isEditMode = user !== null;
  const isSelf = isEditMode && user.id === currentAdminId;
  const isSoleActiveAdmin =
    isEditMode &&
    user.role === "ADMINISTRATOR" &&
    user.isActive &&
    activeAdminCount <= 1;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">(
    "REQUESTER",
  );
  const [isActive, setIsActive] = useState(true);
  const [initialPassword, setInitialPassword] = useState("");

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset password sub-flow in Edit mode (UI-14, AC-20)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(
    null,
  );
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(
    null,
  );
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const drawerRef = useRef<HTMLDivElement | null>(null);
  const resetModalRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<HTMLInputElement | null>(null);
  const openResetBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Initialize or reset form state when user changes or drawer opens
  useEffect(() => {
    if (!isOpen) {
      setShowResetModal(false);
      setResetPasswordInput("");
      setResetPasswordError(null);
      setResetSuccessMessage(null);
      setFieldErrors({});
      setGeneralError(null);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
      return;
    }

    previousActiveElement.current = document.activeElement as HTMLElement | null;

    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setIsActive(user.isActive);
      setInitialPassword("");
    } else {
      setName("");
      setEmail("");
      setRole("REQUESTER");
      setIsActive(true);
      setInitialPassword("");
    }
    setFieldErrors({});
    setGeneralError(null);
    setShowResetModal(false);
    setResetSuccessMessage(null);

    // Focus first input
    const timer = setTimeout(() => {
      initialFocusRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen, user]);

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setResetPasswordInput("");
    setResetPasswordError(null);
    setTimeout(() => {
      openResetBtnRef.current?.focus();
    }, 50);
  };

  // Trap focus and escape key (ui-spec.md §6)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showResetModal) {
          handleCloseResetModal();
        } else {
          onClose();
        }
        return;
      }

      if (e.key === "Tab") {
        const container = showResetModal
          ? resetModalRef.current
          : drawerRef.current;
        if (!container) return;

        const focusable = container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showResetModal, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = "Full name is required.";
    } else if (name.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters long.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "A valid email address is required.";
    }

    if (!isEditMode) {
      const passErr = validateInitialPassword(initialPassword);
      if (passErr) {
        errors.initialPassword = passErr;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode && user) {
        const payload: {
          name: string;
          email: string;
          role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
          isActive: boolean;
        } = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          isActive,
        };

        const res = await apiFetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.error?.code === "DUPLICATE_EMAIL") {
            setFieldErrors({
              email:
                data.error?.fields?.email ??
                "A user with this email address already exists.",
            });
          } else if (data.error?.code === "CANNOT_DEACTIVATE_SELF") {
            setGeneralError("You cannot deactivate your own account.");
          } else if (data.error?.code === "CANNOT_DEACTIVATE_LAST_ADMIN") {
            setGeneralError(
              "Cannot deactivate or reassign the last active Administrator.",
            );
          } else {
            setGeneralError(data.error?.message ?? "Failed to update user.");
          }
          return;
        }

        const saved = (data.user ?? data) as AdminUserData;
        onSaved(saved);
        onClose();
      } else {
        // Create user
        const payload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          isActive,
          initialPassword,
        };

        const res = await apiFetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.error?.code === "DUPLICATE_EMAIL") {
            setFieldErrors({
              email:
                data.error?.fields?.email ??
                "A user with this email address already exists.",
            });
          } else if (data.error?.fields) {
            setFieldErrors(data.error.fields);
          } else {
            setGeneralError(data.error?.message ?? "Failed to create user.");
          }
          return;
        }

        const saved = (data.user ?? data) as AdminUserData;
        onSaved(saved);
        onClose();
      }
    } catch {
      setGeneralError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const passErr = validateInitialPassword(resetPasswordInput);
    if (passErr) {
      setResetPasswordError(passErr);
      return;
    }

    setResetSubmitting(true);
    setResetPasswordError(null);
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialPassword: resetPasswordInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResetPasswordError(
          data.error?.message ?? "Failed to reset initial password.",
        );
        return;
      }

      setResetSuccessMessage(
        data.message ??
          "Initial password updated. User will be required to change password at next login.",
      );
      handleCloseResetModal();
    } catch {
      setResetPasswordError("Network error. Please try again.");
    } finally {
      setResetSubmitting(false);
    }
  };

  const deactivateTooltip = isSoleActiveAdmin
    ? "Cannot deactivate or reassign the last active Administrator."
    : isSelf
      ? "You cannot deactivate your own account."
      : undefined;

  const roleTooltip = isSoleActiveAdmin
    ? "Cannot deactivate or reassign the last active Administrator."
    : undefined;

  return (
    <>
      <div
        className="zen-admin-drawer-backdrop"
        onClick={onClose}
        data-testid="drawer-backdrop"
      />
      <div
        ref={drawerRef}
        className="zen-admin-drawer p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        data-testid="user-edit-drawer"
      >
        <div
          className="d-flex flex-column flex-grow-1"
          aria-hidden={showResetModal ? "true" : undefined}
          inert={showResetModal || undefined}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
            <h2 id="drawer-title" className="h4 mb-0">
              {isEditMode ? "Edit User" : "Create User"}
            </h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              data-testid="drawer-close-btn"
            />
          </div>

          {generalError && (
            <div
              className="alert alert-danger py-2 mb-3"
              role="alert"
              data-testid="drawer-general-error"
            >
              {generalError}
            </div>
          )}

          {resetSuccessMessage && (
            <div
              className="alert alert-success py-2 mb-3"
              role="alert"
              data-testid="drawer-reset-success"
            >
              {resetSuccessMessage}
            </div>
          )}

          <form onSubmit={handleSave} className="flex-grow-1 d-flex flex-column">
          <div className="flex-grow-1">
            {/* Full Name */}
            <FormField
              id="userName"
              label="Full Name"
              required
              error={fieldErrors.name}
              className="mb-3"
            >
              <input
                ref={initialFocusRef}
                id="userName"
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Thompson"
                disabled={submitting}
                data-testid="input-user-name"
              />
            </FormField>

            {/* Email Address */}
            <FormField
              id="userEmail"
              label="Email Address"
              required
              error={fieldErrors.email}
              className="mb-3"
            >
              <input
                id="userEmail"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex.thompson@toktickit.com"
                disabled={submitting}
                data-testid="input-user-email"
              />
            </FormField>

            {/* Role dropdown */}
            <div className="mb-3" title={roleTooltip}>
              <label htmlFor="userRole" className="form-label fw-bold small">
                Role <span className="text-danger" aria-hidden="true">*</span>
              </label>
              <select
                id="userRole"
                className={`form-select ${fieldErrors.role ? "is-invalid" : ""}`}
                value={role}
                onChange={(e) =>
                  setRole(
                    e.target.value as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR",
                  )
                }
                disabled={submitting || isSoleActiveAdmin}
                aria-invalid={Boolean(fieldErrors.role)}
                aria-describedby={
                  fieldErrors.role
                    ? "userRole-error"
                    : isSoleActiveAdmin
                      ? "role-disabled-helper"
                      : undefined
                }
                data-testid="select-user-role"
              >
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
              {isSoleActiveAdmin && (
                <div
                  id="role-disabled-helper"
                  className="form-text text-muted"
                  data-testid="role-disabled-helper"
                >
                  Cannot deactivate or reassign the last active Administrator.
                </div>
              )}
              {fieldErrors.role && (
                <div id="userRole-error" className="invalid-feedback d-block">
                  {fieldErrors.role}
                </div>
              )}
            </div>

            {/* Active toggle switch */}
            <div className="mb-4" title={deactivateTooltip}>
              <div className="form-check form-switch zen-user-switch d-flex align-items-center gap-2">
                <input
                  id="userActive"
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={submitting || isSelf || isSoleActiveAdmin}
                  aria-describedby={
                    deactivateTooltip ? "deactivate-tooltip-text" : undefined
                  }
                  data-testid="switch-user-active"
                />
                <label
                  className="form-check-label fw-semibold"
                  htmlFor="userActive"
                >
                  {isActive ? "Active Account" : "Inactive Account"}
                </label>
              </div>
              {deactivateTooltip && (
                <div
                  id="deactivate-tooltip-text"
                  className="form-text text-muted mt-1"
                  data-testid="deactivate-tooltip-text"
                >
                  {deactivateTooltip}.
                </div>
              )}
            </div>

            {/* Initial Password Section (Create vs Edit) */}
            {!isEditMode ? (
              <div>
                <FormField
                  id="userInitialPassword"
                  label="Initial Password"
                  required
                  error={fieldErrors.initialPassword}
                  helperText="Minimum 8 characters. User must change password at next login."
                  className="mb-1"
                >
                  <input
                    id="userInitialPassword"
                    type="password"
                    className="form-control"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    disabled={submitting}
                    data-testid="input-user-initial-password"
                  />
                </FormField>
                <div className="mb-4 text-end">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none small text-muted"
                    onClick={() => setInitialPassword("TokTickIT2026!")}
                    data-testid="btn-use-default-password"
                  >
                    Use default password (TokTickIT2026!)
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-light rounded border">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1 fw-bold">Initial Password</h6>
                    <p className="text-muted small mb-0">
                      Issue a new temporary credential for this user.
                    </p>
                  </div>
                  <button
                    ref={openResetBtnRef}
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowResetModal(true)}
                    data-testid="btn-open-reset-password"
                  >
                    Reset Initial Password
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-top d-flex flex-column gap-2">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={submitting}
              data-testid="btn-save-user"
            >
              {submitting ? "Saving..." : "Save User"}
            </button>

            {isEditMode && (
              <div title={deactivateTooltip}>
                <button
                  type="button"
                  className={`btn w-100 ${
                    isActive ? "btn-outline-danger" : "btn-outline-success"
                  }`}
                  disabled={
                    submitting ||
                    (isActive && (isSelf || isSoleActiveAdmin))
                  }
                  onClick={() => setIsActive(!isActive)}
                  data-testid="btn-toggle-deactivate"
                >
                  {isActive ? "Deactivate User" : "Activate User"}
                </button>
              </div>
            )}

              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={onClose}
                disabled={submitting}
                data-testid="btn-cancel-drawer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Modal Dialog for Reset Password in Edit mode (UI-14, AC-20) */}
        {showResetModal && (
          <div
            ref={resetModalRef}
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
            data-testid="reset-password-modal"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 id="reset-modal-title" className="modal-title">
                    Reset Initial Password
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={handleCloseResetModal}
                    data-testid="btn-close-reset-modal"
                  />
                </div>
                <form onSubmit={handleResetPasswordSubmit}>
                  <div className="modal-body">
                    <p className="text-muted small mb-3">
                      Assign a new initial password for{" "}
                      <strong>{user?.name}</strong>. The user will be required
                      to set a new password upon their next sign-in.
                    </p>

                    <div className="mb-3">
                      <label
                        htmlFor="newInitialPassword"
                        className="form-label fw-bold small"
                      >
                        New Initial Password{" "}
                        <span className="text-danger" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="newInitialPassword"
                        type="password"
                        className={`form-control ${
                          resetPasswordError ? "is-invalid" : ""
                        }`}
                        value={resetPasswordInput}
                        onChange={(e) => {
                          setResetPasswordInput(e.target.value);
                          if (resetPasswordError) setResetPasswordError(null);
                        }}
                        placeholder="Minimum 8 characters"
                        disabled={resetSubmitting}
                        autoFocus
                        aria-invalid={Boolean(resetPasswordError)}
                        aria-describedby={
                          resetPasswordError
                            ? "newInitialPassword-error newInitialPassword-help"
                            : "newInitialPassword-help"
                        }
                        data-testid="input-new-initial-password"
                      />
                      {resetPasswordError && (
                        <div
                          id="newInitialPassword-error"
                          className="invalid-feedback d-block"
                          data-testid="reset-password-error"
                        >
                          {resetPasswordError}
                        </div>
                      )}
                      <div id="newInitialPassword-help" className="form-text">
                        Minimum 8 characters required.
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCloseResetModal}
                      disabled={resetSubmitting}
                      data-testid="btn-cancel-reset-modal"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={resetSubmitting}
                      data-testid="btn-submit-reset-password"
                    >
                      {resetSubmitting ? "Updating..." : "Reset Password"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default UserEditDrawer;
