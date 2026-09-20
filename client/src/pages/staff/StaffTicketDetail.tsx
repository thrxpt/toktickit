import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import apiFetch from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import Badge from "../../components/Badge";
import ReadOnlyField from "../../components/ReadOnlyField";
import StateBlock from "../../components/StateBlock";
import type {
  ITPriority,
  StaffTicketDetailDto,
  TicketStatus,
} from "../../types/ticket";
import { formatDate } from "../../utils/date";
import { formatFileSize } from "../../utils/file";
import { getPermittedTransitions } from "../../utils/status-machine";

interface AssigneeOption {
  id: number;
  name: string;
  role: string;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

const IT_PRIORITY_OPTIONS: { value: ITPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export function StaffTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<StaffTicketDetailDto | null>(null);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"comments" | "notes" | "attachments">("attachments");
  const [savingOwner, setSavingOwner] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const [ticketRes, assigneesRes] = await Promise.all([
        apiFetch(`/api/staff/tickets/${id}`),
        apiFetch(`/api/staff/assignees`),
      ]);

      if (ticketRes.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!ticketRes.ok) {
        const errorData = await ticketRes.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `Failed to load ticket (${ticketRes.status})`,
        );
      }

      const ticketData = (await ticketRes.json()) as StaffTicketDetailDto;
      setTicket(ticketData);

      if (assigneesRes.ok) {
        const assigneesData = (await assigneesRes.json()) as AssigneeOption[];
        setAssignees(assigneesData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to reach server");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Shared owner update helper (AC-11, BR-18, BR-23)
  const updateOwner = async (newOwnerId: number | null, successMessage?: string) => {
    if (!ticket) return;
    const selectedAssignee = newOwnerId
      ? assignees.find((a) => a.id === newOwnerId) ??
        (user?.id === newOwnerId ? { id: user.id, name: user.name } : null)
      : null;

    setSavingOwner(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch(`/api/staff/tickets/${ticket.id}/owner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: newOwnerId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to update ticket owner.");
      }

      const data = await res.json();
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              ticketOwner:
                newOwnerId && selectedAssignee
                  ? { id: selectedAssignee.id, name: selectedAssignee.name }
                  : null,
              status: data.status,
            }
          : null,
      );
      showFeedback(
        successMessage ?? (newOwnerId ? "Owner updated." : "Ticket unassigned."),
      );
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update owner.",
      );
    } finally {
      setSavingOwner(false);
    }
  };

  // Claim unassigned ticket (AC-11, BR-23)
  const handleClaim = () => {
    if (user) {
      updateOwner(user.id, "Ticket claimed successfully.");
    }
  };

  // Reassign or unassign owner (AC-11, BR-18)
  const handleOwnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newOwnerId = value ? parseInt(value, 10) : null;
    updateOwner(newOwnerId);
  };

  // Update IT Priority (AC-12, BR-19, BR-20)
  const handlePriorityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!ticket) return;
    const newPriority = e.target.value as ITPriority;

    setSavingPriority(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch(`/api/staff/tickets/${ticket.id}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itPriority: newPriority }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to update IT Priority.");
      }

      setTicket((prev) => (prev ? { ...prev, itPriority: newPriority } : null));
      showFeedback("IT Priority updated.");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update IT Priority.");
    } finally {
      setSavingPriority(false);
    }
  };

  // Execute validated status transition (AC-13, BR-21, BR-22)
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!ticket) return;
    const newStatus = e.target.value as TicketStatus;
    if (newStatus === ticket.status) return;

    setSavingStatus(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch(`/api/staff/tickets/${ticket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to transition status.");
      }

      setTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      showFeedback("Ticket status updated.");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to transition status.");
    } finally {
      setSavingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-4">
        <StateBlock variant="loading" message="Loading ticket details…" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container py-4">
        <StateBlock
          variant="empty"
          title="Ticket Not Found"
          message="The requested ticket does not exist or has been removed."
        />
        <div className="text-center mt-3">
          <Link to="/staff/queue" className="btn btn-primary">
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container py-4">
        <StateBlock
          variant="error"
          title="Failed to Load Ticket"
          message={error || "Could not retrieve ticket details."}
          onRetry={loadData}
        />
        <div className="text-center mt-3">
          <Link to="/staff/queue" className="btn btn-secondary">
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  const permittedTransitions = getPermittedTransitions(ticket.status);

  return (
    <div className="container py-4">
      {/* Back to Queue navigation */}
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <Link to="/staff/queue" className="btn btn-outline-secondary btn-sm">
          ← Back to Queue
        </Link>
        {feedbackMessage && (
          <span className="badge bg-success py-2 px-3">{feedbackMessage}</span>
        )}
      </div>

      {errorMessage && (
        <div className="alert alert-danger alert-dismissible mb-3" role="alert">
          {errorMessage}
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setErrorMessage(null)}
          />
        </div>
      )}

      {/* Ticket Header */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white py-3 border-bottom">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h1 className="h3 mb-0">{ticket.ticketNumber}</h1>
                <Badge value={ticket.status} />
              </div>
              <p className="text-muted mb-0 small">
                Reported by{" "}
                <span className="fw-semibold">{ticket.requester.name}</span> (
                <a href={`mailto:${ticket.requester.email}`}>
                  {ticket.requester.email}
                </a>
                ) on {formatDate(ticket.createdAt)}
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <span className="small text-muted">IT Priority:</span>
              <Badge value={ticket.itPriority} />
            </div>
          </div>
        </div>

        {/* Operational Attributes Grid */}
        <div className="card-body bg-light-subtle">
          <div className="row g-3">
            {/* Ticket Owner Control */}
            <div className="col-12 col-md-4">
              <label htmlFor="staff-ticket-owner" className="form-label fw-bold small text-secondary">
                Ticket Owner
              </label>
              <div className="d-flex align-items-center gap-2">
                <select
                  id="staff-ticket-owner"
                  aria-label="Ticket Owner"
                  className="form-select form-select-sm"
                  value={ticket.ticketOwner?.id ?? ""}
                  onChange={handleOwnerChange}
                  disabled={savingOwner}
                >
                  <option value="">Unassigned</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </option>
                  ))}
                </select>
                {ticket.ticketOwner === null && (
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm text-nowrap"
                    onClick={handleClaim}
                    disabled={savingOwner}
                  >
                    {savingOwner ? "Claiming…" : "Claim"}
                  </button>
                )}
              </div>
            </div>

            {/* IT Priority Control */}
            <div className="col-12 col-md-4">
              <label htmlFor="staff-ticket-priority" className="form-label fw-bold small text-secondary">
                IT Priority
              </label>
              <div className="d-flex align-items-center gap-2">
                <select
                  id="staff-ticket-priority"
                  aria-label="IT Priority"
                  className="form-select form-select-sm"
                  value={ticket.itPriority}
                  onChange={handlePriorityChange}
                  disabled={savingPriority}
                >
                  {IT_PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {savingPriority && (
                  <span className="spinner-border spinner-border-sm text-secondary" role="status" />
                )}
              </div>
            </div>

            {/* Current Status Control */}
            <div className="col-12 col-md-4">
              <label htmlFor="staff-ticket-status" className="form-label fw-bold small text-secondary">
                Current Status
              </label>
              <div className="d-flex align-items-center gap-2">
                <select
                  id="staff-ticket-status"
                  aria-label="Current Status"
                  className="form-select form-select-sm"
                  value={ticket.status}
                  onChange={handleStatusChange}
                  disabled={savingStatus || permittedTransitions.length === 0}
                >
                  <option value={ticket.status}>
                    {STATUS_LABELS[ticket.status]} (Current)
                  </option>
                  {permittedTransitions.map((nextStatus) => (
                    <option key={nextStatus} value={nextStatus}>
                      {STATUS_LABELS[nextStatus]}
                    </option>
                  ))}
                </select>
                {savingStatus && (
                  <span className="spinner-border spinner-border-sm text-secondary" role="status" />
                )}
              </div>
            </div>

            {/* Read-only Context Attributes */}
            <div className="col-12 col-md-4">
              <span className="form-label fw-bold small text-secondary d-block">
                Requested Priority
              </span>
              <Badge value={ticket.requestedPriority} />
            </div>

            <div className="col-12 col-md-4">
              <span className="form-label fw-bold small text-secondary d-block">
                Category
              </span>
              <span className="text-body">{ticket.category.name}</span>
            </div>

            <div className="col-12 col-md-4">
              <span className="form-label fw-bold small text-secondary d-block">
                Related System
              </span>
              <span className="text-body">{ticket.relatedSystem.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Requester Resolution Feedback Banner (AC-09, BR-24) */}
      {ticket.resolvedByRequester && (
        <div className="alert alert-info d-flex align-items-center mb-4" role="status">
          <span className="me-2">💡</span>
          <div>
            <strong>Requester Resolution Notice:</strong> Requester has indicated this problem appears resolved. IT Staff will review and formally close the ticket.
          </div>
        </div>
      )}

      {/* Ticket Content: Summary & Description */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h2 className="h5 mb-0">Ticket Details</h2>
        </div>
        <div className="card-body">
          <ReadOnlyField
            id="staff-ticket-summary"
            label="Summary"
            value={ticket.summary}
          />
          <ReadOnlyField
            id="staff-ticket-description"
            label="Description"
            value={ticket.description}
            multiline
            className="mb-0"
          />
        </div>
      </div>

      {/* Tabbed Activity & Discussions Panel */}
      <div className="card shadow-sm">
        <div className="card-header bg-white p-0 border-bottom">
          <ul className="nav nav-tabs card-header-tabs m-0 px-3 pt-2" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                type="button"
                className={`nav-link ${activeTab === "attachments" ? "active fw-bold" : ""}`}
                onClick={() => setActiveTab("attachments")}
                role="tab"
                aria-selected={activeTab === "attachments"}
              >
                Attachments ({ticket.attachments.length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                className={`nav-link ${activeTab === "comments" ? "active fw-bold" : ""}`}
                onClick={() => setActiveTab("comments")}
                role="tab"
                aria-selected={activeTab === "comments"}
              >
                Public Comments ({ticket.publicCommentsCount})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                className={`nav-link ${activeTab === "notes" ? "active fw-bold" : ""}`}
                onClick={() => setActiveTab("notes")}
                role="tab"
                aria-selected={activeTab === "notes"}
              >
                Internal Notes ({ticket.internalNotesCount})
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          {/* Attachments Tab */}
          {activeTab === "attachments" && (
            <div>
              {ticket.attachments.length === 0 ? (
                <p className="text-muted mb-0 py-3 text-center">
                  No attachments uploaded for this ticket.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>File Name</th>
                        <th>Size</th>
                        <th>Uploaded By</th>
                        <th>Upload Date</th>
                        <th>Status</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticket.attachments.map((att) => (
                        <tr key={att.id}>
                          <td className="fw-medium">{att.originalFilename}</td>
                          <td>{formatFileSize(att.sizeBytes)}</td>
                          <td>{att.uploadedBy.name}</td>
                          <td>{formatDate(att.createdAt)}</td>
                          <td>
                            <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">
                              Active
                            </span>
                          </td>
                          <td className="text-end">
                            <a
                              href={att.contentUrl || `/api/attachments/${att.id}/content`}
                              download={att.originalFilename}
                              className="btn btn-outline-primary btn-sm"
                            >
                              Download
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Public Comments Tab (Placeholder for Issue 19) */}
          {activeTab === "comments" && (
            <div className="py-3 text-center text-muted">
              <p className="mb-0">
                Public Comments thread will be available in Issue 19.
              </p>
            </div>
          )}

          {/* Internal Notes Tab (Placeholder for Issue 19) */}
          {activeTab === "notes" && (
            <div>
              <div className="alert alert-warning mb-3 d-flex align-items-center" role="note">
                <span className="me-2">🔒</span>
                <div>
                  <strong>Private IT Staff Notes:</strong> Strictly invisible to Requesters.
                </div>
              </div>
              <div className="py-3 text-center text-muted">
                <p className="mb-0">
                  Internal Notes discussion will be available in Issue 19.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StaffTicketDetail;
