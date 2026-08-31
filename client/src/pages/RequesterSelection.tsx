import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ReferenceSelect from '../components/ReferenceSelect'
import StateBlock from '../components/StateBlock'
import { useRequester } from '../context/RequesterContext'

export function RequesterSelection() {
  const navigate = useNavigate()
  const {
    selectedRequester,
    requesters,
    loading,
    error,
    setRequester,
    reloadRequesters,
  } = useRequester()

  const [selectedId, setSelectedId] = useState<string>(
    selectedRequester ? String(selectedRequester.id) : '',
  )

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    const chosen = requesters.find((r) => String(r.id) === selectedId)
    if (chosen) {
      setRequester(chosen)
      navigate('/tickets')
    }
  }

  const handleCancel = () => {
    navigate('/tickets')
  }

  return (
    <div className="py-4">
      <div
        className="card mx-auto shadow-sm border"
        style={{ maxWidth: '560px' }}
      >
        <div className="card-body p-4 p-md-5">
          {/* Person-with-gear mark on a --zen-pale circle */}
          <div
            className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: 'var(--zen-pale)',
              color: 'var(--zen-primary)',
            }}
            aria-hidden="true"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>

          <h1 className="h4 card-title text-center mb-2">
            Select Development Requester
          </h1>

          <p className="text-body-secondary text-center small mb-4">
            Select a Development Requester to test requester-specific ticket
            behavior. This is not a login screen. Authentication and
            role-based access will be introduced in Lab 3.
          </p>

          <hr className="my-4" />

          {loading ? (
            <StateBlock variant="loading" message="Loading requesters…" />
          ) : error ? (
            <StateBlock
              variant="error"
              title="Unable to load requesters"
              message={error}
              onRetry={reloadRequesters}
            />
          ) : requesters.length === 0 ? (
            <StateBlock
              variant="empty"
              title="No active requesters"
              message="Run `pnpm --filter server prisma db seed` to seed development data."
            />
          ) : (
            <form onSubmit={handleContinue}>
              <ReferenceSelect
                id="requester-select"
                label="Development Requester"
                required
                options={requesters}
                placeholder="Select a requester…"
                value={selectedId}
                onChange={(val) => setSelectedId(val)}
                className="mb-3"
              />

              {/* Info callout */}
              <div
                className="alert alert-info py-2 px-3 mb-3 small d-flex align-items-center gap-2"
                role="status"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Only active development requesters are shown.</span>
              </div>

              {/* Shield callout */}
              <div
                className="alert alert-secondary py-2 px-3 mb-4 small d-flex align-items-center gap-2"
                role="note"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Authentication coming in Lab 3.</span>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedId}
                >
                  Continue
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default RequesterSelection
