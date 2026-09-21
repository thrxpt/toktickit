import React, { useCallback, useEffect, useState } from "react";

import apiFetch from "../../api/client";
import Badge from "../Badge";
import StateBlock from "../StateBlock";
import type { CommentDto } from "../../types/ticket";
import { formatDate } from "../../utils/date";

interface PublicCommentsProps {
  ticketId: number;
  onCommentCountChange?: (count: number) => void;
}

export function PublicComments({
  ticketId,
  onCommentCountChange,
}: PublicCommentsProps) {
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/tickets/${ticketId}/comments`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `Failed to load comments (${res.status})`,
        );
      }
      const data = (await res.json()) as CommentDto[];
      setComments(data);
      onCommentCountChange?.(data.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load comments");
    } finally {
      setLoading(false);
    }
  }, [ticketId, onCommentCountChange]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 2000 || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await apiFetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `Failed to post comment (${res.status})`,
        );
      }

      const created = (await res.json()) as CommentDto;
      const updated = [...comments, created];
      setComments(updated);
      setContent("");
      onCommentCountChange?.(updated.length);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Unable to post comment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isLengthValid = content.trim().length > 0 && content.length <= 2000;
  const charCount = content.length;

  return (
    <div className="public-comments-container">
      {/* Existing Comments Feed (BR-28: chronological order) */}
      <div className="mb-4">
        {loading && (
          <StateBlock variant="loading" message="Loading comments…" />
        )}

        {error && (
          <StateBlock
            variant="error"
            title="Failed to Load Comments"
            message={error}
            onRetry={loadComments}
          />
        )}

        {!loading && !error && comments.length === 0 && (
          <div className="text-center py-4 text-muted bg-light rounded border">
            <p className="mb-0">No public comments yet.</p>
          </div>
        )}

        {!loading && !error && comments.length > 0 && (
          <div className="d-flex flex-column gap-3">
            {comments.map((comment) => (
              <div key={comment.id} className="card shadow-sm border">
                <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="zen-avatar" aria-hidden="true">
                      {comment.author.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="fw-semibold text-body">
                      {comment.author.name}
                    </span>
                    <Badge value={comment.author.role} />
                  </div>
                  <span className="text-muted small">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <div className="card-body py-3">
                  <p className="mb-0 text-body" style={{ whiteSpace: "pre-wrap" }}>
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Public Comment Form */}
      <div className="card shadow-sm border">
        <div className="card-header bg-white py-2">
          <h3 className="h6 mb-0">Add Public Comment</h3>
        </div>
        <div className="card-body">
          {submitError && (
            <div className="alert alert-danger mb-3" role="alert">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="public-comment-input" className="visually-hidden">
                Add Public Comment
              </label>
              <textarea
                id="public-comment-input"
                className="form-control"
                rows={3}
                placeholder="Write a public comment..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={submitting}
              />
              <div className="d-flex justify-content-between align-items-center mt-1">
                <small
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
                className="btn btn-primary"
                disabled={!isLengthValid || submitting}
              >
                {submitting ? "Posting…" : "Post Comment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PublicComments;
