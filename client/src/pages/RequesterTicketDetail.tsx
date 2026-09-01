import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import apiFetch from '../api/client'
import Badge from '../components/Badge'
import ReadOnlyField from '../components/ReadOnlyField'
import StateBlock from '../components/StateBlock'
import { useRequester } from '../context/RequesterContext'
import type { TicketDetail } from '../types/ticket'
import { formatDate } from '../utils/date'

export function RequesterTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const { selectedRequester } = useRequester()

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)

  const fetchTicket = useCallback(() => {
    if (!id || !selectedRequester) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(false)
    setNotFound(false)

    apiFetch(`/api/tickets/${id}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true)
          setTicket(null)
          return
        }
        if (!res.ok) {
          throw new Error('Failed to fetch ticket')
        }
        const data: TicketDetail = await res.json()
        setTicket(data)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error)?.name === 'AbortError') {
          return
        }
        setError(true)
        setTicket(null)
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [id, selectedRequester])

  useEffect(() => {
    const abort = fetchTicket()
    return () => {
      if (abort) abort()
    }
  }, [fetchTicket])

  if (loading) {
    return (
      <div className="container zen-container py-4">
        <StateBlock variant="loading" message="Loading ticket details…" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="container zen-container py-4">
        <div className="card text-center py-5">
          <div className="card-body">
            <div
              className="rounded-circle bg-body-secondary text-body-secondary d-inline-flex align-items-center justify-content-center p-3 mb-3"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
              </svg>
            </div>
            <h2 className="h3 mb-2">Ticket Not Found</h2>
            <p className="text-body-secondary mb-4">
              This ticket does not exist or you do not have permission to view it.
            </p>
            <Link to="/tickets" className="btn btn-primary">
              Back to My Tickets
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="container zen-container py-4">
        <StateBlock
          variant="error"
          message="Unable to load ticket details. Please try again."
          onRetry={fetchTicket}
        />
      </div>
    )
  }

  return (
    <div className="container zen-container py-4">
      {/* Page Header (ui-spec.md §5.4) */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h2 mb-1">Ticket Details</h1>
          <p className="text-body-secondary mb-0">
            View support request details.
          </p>
        </div>
        <div>
          <Link
            to="/tickets"
            className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"
              />
            </svg>
            Back to My Tickets
          </Link>
        </div>
      </div>

      {/* Ticket Panel (AC-29, FR-10, ui-spec.md §5.4, §7) */}
      <div className="card">
        <div className="card-body">
          <div className="row g-3">
            {/* Row 1: System info & Classification */}
            <div className="col-12 col-md-6 col-lg-3">
              <ReadOnlyField
                id="ticket-number"
                label="Ticket No."
                value={ticket.ticketNumber}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <ReadOnlyField
                id="ticket-date"
                label="Ticket Date"
                value={formatDate(ticket.createdAt)}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <ReadOnlyField
                id="ticket-category"
                label="Category"
                value={ticket.category.name}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <ReadOnlyField
                id="ticket-related-system"
                label="Related System"
                value={ticket.relatedSystem.name}
              />
            </div>

            {/* Row 2: Requester, Priority, Status */}
            <div className="col-12 col-md-6 col-lg-6">
              <ReadOnlyField
                id="ticket-requester"
                label="Requester"
                value={ticket.requester.name}
              />
            </div>
            <div className="col-12 col-md-3 col-lg-3">
              <ReadOnlyField id="ticket-priority" label="Requested Priority">
                <Badge value={ticket.requestedPriority} />
              </ReadOnlyField>
            </div>
            <div className="col-12 col-md-3 col-lg-3">
              <ReadOnlyField id="ticket-status" label="Current Status">
                <Badge value={ticket.status} />
              </ReadOnlyField>
            </div>

            {/* Row 3: Summary (full width) */}
            <div className="col-12">
              <ReadOnlyField
                id="ticket-summary"
                label="Summary"
                value={ticket.summary}
              />
            </div>

            {/* Row 4: Description (full width) */}
            <div className="col-12">
              <ReadOnlyField
                id="ticket-description"
                label="Description"
                value={ticket.description}
                multiline
                className="mb-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RequesterTicketDetail
