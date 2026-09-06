import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
  triggerRef,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  const confirmBtnClass =
    confirmVariant === "danger"
      ? "btn-outline-danger"
      : `btn-${confirmVariant}`;

  // Focus management: set focus inside modal ONLY upon transitioning to open,
  // and restore focus to trigger when closing.
  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        document.body.classList.remove("modal-open");
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
          previousActiveElement.current = null;
        }
      }
      return;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      document.body.classList.add("modal-open");
      previousActiveElement.current =
        (document.activeElement as HTMLElement) ?? triggerRef?.current ?? null;

      const timer = setTimeout(() => {
        if (
          dialogRef.current &&
          !dialogRef.current.contains(document.activeElement)
        ) {
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            dialogRef.current.focus();
          }
        }
      }, 10);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isOpen, triggerRef]);

  // Keyboard navigation: Escape key closes, Tab key is trapped inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancelRef.current();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute("disabled"));

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

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
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalNode = (
    <>
      <div
        className="modal show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        ref={dialogRef}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content zen-surface">
            <div className="modal-header border-bottom">
              <h2 className="modal-title h5 mb-0" id="confirm-dialog-title">
                {title}
              </h2>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onCancel}
              />
            </div>
            <div className="modal-body">
              {message && <p className="mb-3">{message}</p>}
              {children}
            </div>
            <div className="modal-footer border-top">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={`btn ${confirmBtnClass}`}
                disabled={confirmDisabled}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" onClick={onCancel} />
    </>
  );

  return typeof document !== "undefined"
    ? createPortal(modalNode, document.body)
    : modalNode;
}

export default ConfirmDialog;
