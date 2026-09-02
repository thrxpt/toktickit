import { useEffect, useRef, useState } from "react";

import apiFetch from "../api/client";
import ConfirmDialog from "./ConfirmDialog";
import AttachmentUploader from "./AttachmentUploader";
import type { AttachmentDto } from "../types/ticket";
import { formatDate } from "../utils/date";
import { formatFileSize, isImageAttachment } from "../utils/file";

export interface AttachmentSectionProps {
  ticketId: number;
  attachments: {
    active: AttachmentDto[];
    removed: AttachmentDto[];
  };
  onAttachmentRemoved?: (removed: AttachmentDto) => void;
  onAttachmentAdded?: (added: AttachmentDto) => void;
  readOnly?: boolean;
}

export function AttachmentSection({
  ticketId,
  attachments,
  onAttachmentRemoved,
  onAttachmentAdded,
  readOnly = false,
}: AttachmentSectionProps) {
  const [removalTarget, setRemovalTarget] = useState<AttachmentDto | null>(
    null,
  );
  const [removalReason, setRemovalReason] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);

  const [previewAttachment, setPreviewAttachment] =
    useState<AttachmentDto | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<number, string>>(
    {},
  );
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const active = attachments.active;
  const removed = attachments.removed;

  const previewDialogRef = useRef<HTMLDivElement | null>(null);
  const previewPreviousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap, Escape key handling, and return focus for Image Preview Modal (ui-spec.md §3)
  useEffect(() => {
    if (previewAttachment) {
      previewPreviousActiveElement.current =
        (document.activeElement as HTMLElement) ?? null;

      const timer = setTimeout(() => {
        if (previewDialogRef.current) {
          const focusable =
            previewDialogRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            );
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            previewDialogRef.current.focus();
          }
        }
      }, 10);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          handleClosePreview();
          return;
        }

        if (e.key === "Tab" && previewDialogRef.current) {
          const focusable = Array.from(
            previewDialogRef.current.querySelectorAll<HTMLElement>(
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
        clearTimeout(timer);
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else if (previewPreviousActiveElement.current) {
      previewPreviousActiveElement.current.focus();
      previewPreviousActiveElement.current = null;
    }
  }, [previewAttachment]);

  // Clean up preview object URL on close or unmount
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const handleOpenRemoval = (att: AttachmentDto) => {
    setRemovalTarget(att);
    setRemovalReason("");
    setRemovalError(null);
  };

  const handleCloseRemoval = () => {
    setRemovalTarget(null);
    setRemovalReason("");
    setRemovalError(null);
  };

  const handleConfirmRemoval = async () => {
    if (!removalTarget || !removalReason.trim()) return;

    setIsRemoving(true);
    setRemovalError(null);

    try {
      const res = await apiFetch(
        `/api/attachments/${removalTarget.id}/removal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: removalReason.trim() }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg =
          errorData?.error?.fields?.reason ||
          errorData?.error?.message ||
          "Failed to remove attachment.";
        setRemovalError(errorMsg);
        return;
      }

      const updatedRemoved: AttachmentDto = await res.json();
      onAttachmentRemoved?.(updatedRemoved);
      handleCloseRemoval();
    } catch {
      setRemovalError("Failed to remove attachment. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDownload = async (att: AttachmentDto) => {
    setDownloadingId(att.id);
    setDownloadErrors((prev) => {
      const next = { ...prev };
      delete next[att.id];
      return next;
    });

    try {
      const res = await apiFetch(`/api/attachments/${att.id}/content`);
      if (!res.ok) {
        throw new Error("Download failed");
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = att.originalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Unavailable state with inline retry (ui-spec.md §6)
      setDownloadErrors((prev) => ({
        ...prev,
        [att.id]: "Download failed. Please try again.",
      }));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenPreview = async (att: AttachmentDto) => {
    setPreviewAttachment(att);
    setPreviewLoading(true);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    try {
      const res = await apiFetch(`/api/attachments/${att.id}/content`);
      if (!res.ok) {
        throw new Error("Failed to load image preview");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewBlobUrl(objectUrl);
    } catch {
      // Fallback
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewAttachment(null);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  const handleDirectUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg =
          errorData?.error?.fields?.file ||
          errorData?.error?.message ||
          "Upload failed.";
        setUploadErrors((prev) => ({
          ...prev,
          [file.name]: errorMsg,
        }));
        return;
      }

      const added: AttachmentDto = await res.json();
      setUploadErrors((prev) => {
        const next = { ...prev };
        delete next[file.name];
        return next;
      });
      onAttachmentAdded?.(added);
    } catch {
      setUploadErrors((prev) => ({
        ...prev,
        [file.name]: "Upload failed due to a network error.",
      }));
    }
  };

  return (
    <div className="card mt-4">
      <div className="card-body">
        {/* Header (ui-spec.md §5.4) */}
        <h3 className="h5 mb-3">Attachments ({active.length} of 5)</h3>

        {/* Active Attachments List */}
        {active.length > 0 && (
          <ul className="list-group mb-4">
            {active.map((att) => (
              <li
                key={att.id}
                className="list-group-item d-flex flex-wrap align-items-center justify-content-between gap-3 py-3"
              >
                <div className="d-flex align-items-center gap-3 min-w-0">
                  <div
                    className="text-primary flex-shrink-0"
                    aria-hidden="true"
                  >
                    {isImageAttachment(att.mimeType, att.originalFilename) ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                        <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="fw-semibold text-truncate"
                      title={att.originalFilename}
                    >
                      {att.originalFilename}
                    </div>
                    <div className="small text-body-secondary">
                      {formatFileSize(att.sizeBytes)} • Uploaded by{" "}
                      {att.uploadedBy.name} on {formatDate(att.createdAt)}
                    </div>
                    {/* Inline retry on download failure (ui-spec.md §6 Unavailable state) */}
                    {downloadErrors[att.id] && (
                      <div className="text-danger small mt-1 d-flex align-items-center gap-2">
                        <span>{downloadErrors[att.id]}</span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-danger fw-semibold"
                          onClick={() => handleDownload(att)}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  {isImageAttachment(att.mimeType, att.originalFilename) && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => handleOpenPreview(att)}
                    >
                      Preview
                    </button>
                  )}
                  <a
                    href={`/api/attachments/${att.id}/content`}
                    download={att.originalFilename}
                    className={`btn btn-outline-primary btn-sm ${downloadingId === att.id ? "disabled" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleDownload(att);
                    }}
                  >
                    {downloadingId === att.id ? "Downloading…" : "Download"}
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleOpenRemoval(att)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Removed Attachments List (BR-39, AC-36) */}
        {removed.length > 0 && (
          <div className="border-top pt-3 mt-3 text-body-secondary">
            <h4 className="h6 text-body-secondary mb-3">Removed Attachments</h4>
            <ul className="list-group list-group-flush opacity-75">
              {removed.map((att) => (
                <li
                  key={att.id}
                  className="list-group-item bg-transparent text-body-secondary py-2 px-0"
                >
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div className="min-w-0">
                      <span
                        className="fw-medium text-decoration-line-through me-2 text-truncate"
                        title={att.originalFilename}
                      >
                        {att.originalFilename}
                      </span>
                      <span className="small">
                        ({formatFileSize(att.sizeBytes)})
                      </span>
                      <div className="small mt-1">
                        Removed by {att.removedBy?.name ?? att.uploadedBy.name}{" "}
                        on {formatDate(att.removedAt!)}
                      </div>
                      {att.removalReason && (
                        <div className="small fst-italic mt-1 text-muted">
                          Reason: {att.removalReason}
                        </div>
                      )}
                    </div>
                    {/* Note: NO download or preview control rendered for removed attachments (BR-39, AC-36) */}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Uploader Section */}
        {!readOnly && (
          <div className="mt-4">
            <AttachmentUploader
              activeCount={active.length}
              maxCount={5}
              onUploadDirect={handleDirectUpload}
              fileErrors={uploadErrors}
              onDismissError={(name) => {
                setUploadErrors((prev) => {
                  const next = { ...prev };
                  delete next[name];
                  return next;
                });
              }}
            />
          </div>
        )}
      </div>

      {/* Removal Confirmation Dialog (BR-22, BR-42, AC-38) */}
      <ConfirmDialog
        isOpen={removalTarget !== null}
        title="Remove Attachment"
        confirmLabel={isRemoving ? "Removing…" : "Remove"}
        confirmVariant="danger"
        confirmDisabled={!removalReason.trim() || isRemoving}
        onConfirm={handleConfirmRemoval}
        onCancel={handleCloseRemoval}
      >
        <p className="mb-3">
          Are you sure you want to remove{" "}
          <strong>{removalTarget?.originalFilename}</strong>? This action will
          record who removed it and why, and the file will no longer be
          downloadable.
        </p>

        {removalError && (
          <div className="alert alert-danger py-2 px-3 mb-3" role="alert">
            {removalError}
          </div>
        )}

        <div className="mb-2">
          <label htmlFor="removal-reason" className="form-label fw-semibold">
            Reason for removal <span className="text-danger">*</span>
          </label>
          <textarea
            id="removal-reason"
            className="form-control"
            rows={3}
            placeholder="Explain why this attachment is being removed…"
            value={removalReason}
            onChange={(e) => setRemovalReason(e.target.value)}
            disabled={isRemoving}
            required
          />
          <div className="form-text">
            Required. Up to 200 characters explaining the removal.
          </div>
        </div>
      </ConfirmDialog>

      {/* Image Preview Modal */}
      {previewAttachment && (
        <>
          <div
            className="modal show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-modal-title"
            ref={previewDialogRef}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content zen-surface">
                <div className="modal-header border-bottom">
                  <h2 className="modal-title h5 mb-0" id="preview-modal-title">
                    {previewAttachment.originalFilename}
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={handleClosePreview}
                  />
                </div>
                <div className="modal-body text-center p-3">
                  {previewLoading ? (
                    <div className="py-5">
                      <span
                        className="spinner-border text-primary"
                        role="status"
                      />
                      <p className="text-body-secondary mt-2 mb-0">
                        Loading preview…
                      </p>
                    </div>
                  ) : previewBlobUrl ? (
                    <img
                      src={previewBlobUrl}
                      alt={previewAttachment.originalFilename}
                      className="img-fluid rounded border"
                    />
                  ) : (
                    <p className="text-body-secondary py-5 mb-0">
                      Unable to load preview.
                    </p>
                  )}
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleDownload(previewAttachment)}
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleClosePreview}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show" onClick={handleClosePreview} />
        </>
      )}
    </div>
  );
}

export default AttachmentSection;
