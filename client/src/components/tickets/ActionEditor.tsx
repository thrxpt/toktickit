import { useEffect, useRef, useState } from "react";
import apiFetch from "../../api/client";
import type { ActionTakenDto } from "../../types/ticket";
import ReadOnlyField from "../ReadOnlyField";
import ConflictAlert from "./ConflictAlert";

interface Props {
  ticketId: number;
  version: number;
  action: ActionTakenDto | null;
  disabled?: boolean;
  onSaved: (version: number) => void;
  onCancel: () => void;
  onReload?: () => Promise<void>;
}
export const actionDateTime = (date: string) =>
  new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function ActionEditor({
  ticketId,
  version,
  action,
  disabled,
  onSaved,
  onCancel,
  onReload,
}: Props) {
  const [description, setDescription] = useState(action?.description ?? "");
  const [result, setResult] = useState(action?.result ?? "");
  const [followUpRequired, setFollowUpRequired] = useState(
    action?.followUpRequired ?? false,
  );
  const [followUpNote, setFollowUpNote] = useState(action?.followUpNote ?? "");
  const [attachmentNotes, setAttachmentNotes] = useState(
    action?.attachmentNotes ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [reloading, setReloading] = useState(false);
  const inFlight = useRef(false);
  const firstField = useRef<HTMLTextAreaElement>(null);
  const recoveryFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!saving && !reloading && recoveryFocus.current) {
      if (document.activeElement === document.body)
        recoveryFocus.current.focus();
      recoveryFocus.current = null;
    }
  }, [saving, reloading]);
  useEffect(() => {
    firstField.current?.focus();
  }, []);

  const reload = async () => {
    if (!onReload || reloading) return;
    setReloading(true);
    try {
      await onReload();
      setNeedsReload(false);
      setConflict(false);
    } catch {
      setError("Unable to reload Ticket. Please try again.");
    } finally {
      setReloading(false);
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current || needsReload || disabled) return;
    const validation: Record<string, string> = {};
    for (const [key, value, max, required] of [
      ["description", description, 2000, true],
      ["result", result, 2000, true],
      ["followUpNote", followUpNote, 2000, followUpRequired],
      ["attachmentNotes", attachmentNotes, 1000, false],
    ] as const) {
      if (key === "followUpNote" && !followUpRequired) continue;
      if (required && !value.trim())
        validation[key] =
          key === "followUpNote"
            ? "Supply a follow-up note exactly when follow-up is required."
            : "Too small: expected string to have >=1 characters";
      else if (value.trim().length > max)
        validation[key] =
          `Too big: expected string to have <=${max} characters`;
    }
    setErrors(validation);
    if (Object.keys(validation).length) return;
    recoveryFocus.current = event.currentTarget.contains(document.activeElement)
      ? (document.activeElement as HTMLElement)
      : null;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/tickets/${ticketId}/actions${action ? `/${action.id}` : ""}`,
        {
          method: action ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: description.trim(),
            result: result.trim(),
            followUpRequired,
            followUpNote: followUpRequired ? followUpNote.trim() : null,
            attachmentNotes: attachmentNotes.trim() || null,
            expectedVersion: version,
          }),
        },
      );
      const data = await res.json().catch(() => null);
      if (res.status === 409 && data?.error?.code === "STALE_UPDATE") {
        setNeedsReload(true);
        setConflict(true);
        return;
      }
      if (!res.ok) {
        setErrors(data?.error?.fields ?? {});
        setError(
          data?.error?.message ||
            "Unable to save Action Taken. Please try again.",
        );
        return;
      }
      if (!Number.isInteger(data?.ticketVersion)) {
        setError("Unable to save Action Taken. Please try again.");
        return;
      }
      onSaved(data.ticketVersion);
    } catch {
      setError("Unable to save Action Taken. Please try again.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  const fields = [
    {
      key: "description",
      label: "Description",
      value: description,
      set: setDescription,
      max: 2000,
      required: true,
    },
    {
      key: "result",
      label: "Result",
      value: result,
      set: setResult,
      max: 2000,
      required: true,
    },
    ...(followUpRequired
      ? [
          {
            key: "followUpNote",
            label: "Follow-up Note",
            value: followUpNote,
            set: setFollowUpNote,
            max: 2000,
            required: true,
          },
        ]
      : []),
    {
      key: "attachmentNotes",
      label: "Attachment Notes",
      value: attachmentNotes,
      set: setAttachmentNotes,
      max: 1000,
      required: false,
    },
  ];
  return (
    <form
      onSubmit={submit}
      noValidate
      className="border rounded p-3 mb-4"
      aria-label={action ? "Edit Action Taken" : "Record Action"}
    >
      <h3 className="h5">{action ? "Edit Action Taken" : "Record Action"}</h3>
      {action && (
        <>
          <ReadOnlyField
            id="action-performer"
            label="Performed by"
            value={action.performedBy.name}
          />
          <ReadOnlyField
            id="action-date"
            label="Action Date/Time"
            value={actionDateTime(action.createdAt)}
          />
        </>
      )}
      {conflict && (
        <ConflictAlert
          onReload={() => void reload()}
          onDismiss={() => setConflict(false)}
        />
      )}
      {needsReload && !conflict && (
        <button
          type="button"
          className="btn btn-primary mb-3"
          onClick={() => void reload()}
        >
          Reload ticket
        </button>
      )}
      {error && (
        <div role="alert" className="alert alert-danger">
          {error}
        </div>
      )}
      <fieldset disabled={saving || reloading}>
        {fields.map((field) => (
          <div key={field.key} className="mb-3">
            <label htmlFor={`action-${field.key}`} className="form-label">
              {field.label}
              {field.required ? " *" : ""}
            </label>
            <textarea
              ref={field.key === "description" ? firstField : undefined}
              id={`action-${field.key}`}
              className={`form-control ${errors[field.key] ? "is-invalid" : ""}`}
              rows={3}
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              required={field.required}
              aria-invalid={!!errors[field.key]}
              aria-describedby={`action-${field.key}-hint action-${field.key}-error`}
            />
            <div id={`action-${field.key}-hint`} className="form-text">
              {field.value.length.toLocaleString()} /{" "}
              {field.max.toLocaleString()} characters
              {field.key === "attachmentNotes" &&
                ". Describe the file to look for; this does not upload anything."}
            </div>
            <div id={`action-${field.key}-error`} className="invalid-feedback">
              {errors[field.key]}
            </div>
            {field.key === "result" && (
              <div className="form-check form-switch mb-3">
                <input
                  id="action-followup"
                  type="checkbox"
                  role="switch"
                  className="form-check-input"
                  checked={followUpRequired}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setFollowUpRequired((value) => !value);
                    }
                  }}
                  onChange={(e) => setFollowUpRequired(e.target.checked)}
                />
                <label htmlFor="action-followup" className="form-check-label">
                  Follow-Up Required
                </label>
              </div>
            )}
          </div>
        ))}
        <div className="d-flex flex-wrap gap-2">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || needsReload || disabled}
          >
            {saving && (
              <span
                className="spinner-border spinner-border-sm me-2"
                aria-hidden="true"
              />
            )}
            {saving ? "Saving…" : "Save Action"}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
