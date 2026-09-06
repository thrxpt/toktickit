import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import {
  formatFileSize,
  isPermittedFileType,
  MAX_FILE_SIZE,
} from "../utils/file";

export interface AttachmentUploaderProps {
  activeCount: number;
  maxCount?: number;
  disabled?: boolean;
  selectedFiles?: File[];
  onFilesSelected?: (files: File[]) => void;
  onRemoveSelectedFile?: (index: number) => void;
  onUploadDirect?: (file: File) => Promise<void>;
  fileErrors?: Record<string, string>;
  onDismissError?: (filename: string) => void;
}

export function AttachmentUploader({
  activeCount,
  maxCount = 5,
  disabled = false,
  selectedFiles = [],
  onFilesSelected,
  onRemoveSelectedFile,
  onUploadDirect,
  fileErrors: externalFileErrors,
  onDismissError: externalOnDismissError,
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileErrors = { ...clientErrors, ...externalFileErrors };
  const isLimitReached = activeCount >= maxCount;
  const isUploaderDisabled = disabled || isLimitReached || isUploading;

  const handleDismissError = (filename: string) => {
    setClientErrors((prev) => {
      const next = { ...prev };
      delete next[filename];
      return next;
    });
    externalOnDismissError?.(filename);
  };

  const processFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    const newErrors: Record<string, string> = { ...fileErrors };
    const validFilesToAdd: File[] = [];
    let currentCount = activeCount + selectedFiles.length;

    for (const file of rawFiles) {
      if (!isPermittedFileType(file)) {
        newErrors[file.name] =
          "Unsupported file type. Permitted: JPG, PNG, WEBP, PDF.";
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        newErrors[file.name] = "Each file must be 5 MB or smaller.";
        continue;
      }

      if (currentCount >= maxCount) {
        newErrors[file.name] =
          "Attachment limit reached (maximum 5 active attachments).";
        continue;
      }

      // File is valid
      delete newErrors[file.name];
      validFilesToAdd.push(file);
      currentCount++;
    }

    setClientErrors((prev) => ({ ...prev, ...newErrors }));

    if (validFilesToAdd.length > 0) {
      if (onUploadDirect) {
        setIsUploading(true);
        try {
          for (const file of validFilesToAdd) {
            await onUploadDirect(file);
          }
        } finally {
          setIsUploading(false);
        }
      } else if (onFilesSelected) {
        onFilesSelected([...selectedFiles, ...validFilesToAdd]);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!isUploaderDisabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isUploaderDisabled && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="attachment-uploader">
      {/* Upload Zone */}
      <div
        className={`card border-2 border-dashed p-4 text-center ${
          isDragging ? "border-primary bg-light" : "border-secondary-subtle"
        } ${isUploaderDisabled ? "bg-body-secondary opacity-75" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="attachment-file-input"
          data-testid="attachment-file-input"
          className="d-none"
          multiple
          disabled={isUploaderDisabled}
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleInputChange}
        />

        <div className="d-flex flex-column align-items-center justify-content-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            fill="currentColor"
            className={`mb-2 ${isUploaderDisabled ? "text-secondary" : "text-primary"}`}
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
            <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z" />
          </svg>

          {isLimitReached ? (
            <p className="fw-semibold text-secondary mb-1">
              Attachment limit reached ({maxCount} of {maxCount} active). Remove
              an attachment to upload another.
            </p>
          ) : isUploading ? (
            <div className="d-flex align-items-center gap-2 mb-1">
              <span
                className="spinner-border spinner-border-sm text-primary"
                role="status"
              />
              <span className="fw-semibold">Uploading attachment…</span>
            </div>
          ) : (
            <>
              <p className="mb-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm me-2"
                  disabled={isUploaderDisabled}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose files
                </button>
                <span className="text-body-secondary">
                  or drag and drop here
                </span>
              </p>
              <p className="small text-body-secondary mb-0">
                Permitted types: JPG, PNG, WEBP, PDF (max 5 MB per file). Up to{" "}
                {maxCount} active files.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Per-File Error Notices (BR-41, UI-21) */}
      {Object.keys(fileErrors).length > 0 && (
        <div className="mt-3">
          {Object.entries(fileErrors).map(([fileName, errorMsg]) => (
            <div
              key={fileName}
              className="alert alert-danger d-flex align-items-center justify-content-between py-2 px-3 mb-2"
              role="alert"
            >
              <div className="d-flex align-items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
                <span>
                  <strong>{fileName}</strong>: {errorMsg}
                </span>
              </div>
              <button
                type="button"
                className="btn-close btn-sm"
                aria-label="Dismiss error"
                onClick={() => handleDismissError(fileName)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Selected (Pending) Files List (e.g. on Create Ticket) */}
      {selectedFiles.length > 0 && (
        <div className="mt-3">
          <h6 className="text-body-secondary mb-2">
            Selected Files ({selectedFiles.length})
          </h6>
          <ul className="list-group">
            {selectedFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="list-group-item d-flex align-items-center justify-content-between py-2 px-3"
              >
                <div className="d-flex align-items-center gap-2 text-truncate">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="text-secondary flex-shrink-0"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
                  </svg>
                  <span className="fw-medium text-truncate" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-body-secondary small flex-shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                {onRemoveSelectedFile && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => onRemoveSelectedFile(index)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AttachmentUploader;
