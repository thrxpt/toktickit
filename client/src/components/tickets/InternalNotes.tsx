import React, { useCallback, useEffect, useState } from "react";

import apiFetch from "../../api/client";
import Badge from "../Badge";
import StateBlock from "../StateBlock";
import type { InternalNoteDto } from "../../types/ticket";
import { formatDate } from "../../utils/date";
import { getUserInitials } from "../../utils/user";

interface InternalNotesProps {
  ticketId: number;
  onNoteCountChange?: (count: number) => void;
}

export function InternalNotes({
  ticketId,
  onNoteCountChange,
}: InternalNotesProps) {
  const [notes, setNotes] = useState<InternalNoteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/tickets/${ticketId}/notes`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `Failed to load notes (${res.status})`,
        );
      }
      const data = (await res.json()) as InternalNoteDto[];
      setNotes(data);
      onNoteCountChange?.(data.length);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to load internal notes",
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId, onNoteCountChange]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 2000 || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await apiFetch(`/api/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `Failed to post note (${res.status})`,
        );
      }

      const created = (await res.json()) as InternalNoteDto;
      const updated = [...notes, created];
      setNotes(updated);
      setContent("");
      onNoteCountChange?.(updated.length);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Unable to save internal note",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isLengthValid =
    content.trim().length > 0 && content.trim().length <= 2000;
  const charCount = content.length;

  return (
    <div className="internal-notes-container">
      {/* Prominent Amber Warning Callout Banner (ui-spec §4.5, STYLE-05) */}
      <div
        className="alert zen-notes-warning d-flex align-items-center mb-4 p-3 rounded"
        role="note"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          fill="currentColor"
          className="me-2 flex-shrink-0"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        </svg>
        <div>
          <strong>Private IT Staff Notes — Strictly invisible to Requesters</strong>
        </div>
      </div>

      {/* Existing Internal Notes Feed (BR-28: chronological order) */}
      <div className="mb-4">
        {loading && (
          <StateBlock variant="loading" message="Loading internal notes…" />
        )}

        {error && (
          <StateBlock
            variant="error"
            title="Failed to Load Notes"
            message={error}
            onRetry={loadNotes}
          />
        )}

        {!loading && !error && notes.length === 0 && (
          <StateBlock variant="empty" message="No internal notes yet." />
        )}

        {!loading && !error && notes.length > 0 && (
          <div className="d-flex flex-column gap-3">
            {notes.map((note) => (
              <div key={note.id} className="card zen-note-card shadow-sm border">
                <div className="card-header bg-transparent py-2 d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <span className="zen-avatar" aria-hidden="true">
                      {getUserInitials(note.author.name)}
                    </span>
                    <span className="fw-semibold text-body">
                      {note.author.name}
                    </span>
                    <Badge value={note.author.role} />
                  </div>
                  <span className="text-muted small">
                    {formatDate(note.createdAt)}
                  </span>
                </div>
                <div className="card-body py-3">
                  <p className="mb-0 text-body text-break zen-readonly-multiline border-0 bg-transparent p-0 min-vh-0">
                    {note.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Internal Note Form */}
      <div className="card shadow-sm border">
        <div className="card-header bg-white py-2">
          <h3 className="h6 mb-0">Add Internal Note</h3>
        </div>
        <div className="card-body">
          {submitError && (
            <div className="alert alert-danger mb-3" role="alert">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="internal-note-input" className="visually-hidden">
                Add Internal Note
              </label>
              <textarea
                id="internal-note-input"
                className={`form-control ${charCount > 2000 ? "is-invalid" : ""}`.trim()}
                rows={3}
                placeholder="Write a private operational note..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={submitting}
                aria-invalid={charCount > 2000 ? "true" : undefined}
                aria-describedby={
                  charCount > 2000
                    ? "internal-note-error internal-note-counter"
                    : "internal-note-counter"
                }
              />
              {charCount > 2000 && (
                <div id="internal-note-error" className="invalid-feedback d-block">
                  Internal note cannot exceed 2,000 characters.
                </div>
              )}
              <div className="d-flex justify-content-between align-items-center mt-1">
                <small
                  id="internal-note-counter"
                  className={
                    charCount > 2000 ? "text-danger fw-bold" : "text-muted"
                  }
                >
                  {charCount.toLocaleString()} / 2,000 characters
                </small>
              </div>
            </div>

            <div className="d-flex justify-content-end">
              <button
                type="submit"
                className="btn btn-warning text-dark fw-semibold"
                disabled={!isLengthValid || submitting}
              >
                {submitting ? "Saving…" : "Save Internal Note"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InternalNotes;
