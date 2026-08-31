import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { apiFetch } from '../api/client'
import FormField from '../components/FormField'
import ReferenceSelect, { type ReferenceOption } from '../components/ReferenceSelect'
import StateBlock from '../components/StateBlock'
import SubmitButton from '../components/SubmitButton'
import { useRequester } from '../context/RequesterContext'

interface CreatedTicket {
  id: number
  ticketNumber: string
  summary: string
  description?: string
}

export function CreateTicket() {
  const { selectedRequester } = useRequester()

  const [categories, setCategories] = useState<ReferenceOption[]>([])
  const [relatedSystems, setRelatedSystems] = useState<ReferenceOption[]>([])
  const [loadingReferences, setLoadingReferences] = useState(true)
  const [referenceError, setReferenceError] = useState<string | null>(null)

  const [categoryId, setCategoryId] = useState<string>('')
  const [relatedSystemId, setRelatedSystemId] = useState<string>('')
  const [requestedPriority, setRequestedPriority] = useState<string>('MEDIUM')
  const [summary, setSummary] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [createdTicket, setCreatedTicket] = useState<CreatedTicket | null>(null)

  const loadReferenceData = () => {
    setLoadingReferences(true)
    setReferenceError(null)

    Promise.all([
      fetch('/api/categories').then((res) => {
        if (!res.ok) throw new Error('Failed to load categories')
        return res.json()
      }),
      fetch('/api/related-systems').then((res) => {
        if (!res.ok) throw new Error('Failed to load related systems')
        return res.json()
      }),
    ])
      .then(([fetchedCategories, fetchedRelatedSystems]) => {
        setCategories(fetchedCategories)
        setRelatedSystems(fetchedRelatedSystems)
      })
      .catch(() => {
        setReferenceError('Unable to load category or related system options.')
      })
      .finally(() => {
        setLoadingReferences(false)
      })
  }

  useEffect(() => {
    loadReferenceData()
  }, [])

  const resetForm = () => {
    setCategoryId('')
    setRelatedSystemId('')
    setRequestedPriority('MEDIUM')
    setSummary('')
    setDescription('')
    setErrors({})
    setApiError(null)
    setCreatedTicket(null)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    // Enforce busy state in handler (BR-24, AC-16)
    if (submitting) return

    const fieldErrors: Record<string, string> = {}

    const trimmedSummary = summary.trim()
    if (!trimmedSummary || trimmedSummary.length < 5) {
      fieldErrors.summary = 'Summary must be at least 5 characters.'
    } else if (trimmedSummary.length > 150) {
      fieldErrors.summary = 'Summary must not exceed 150 characters.'
    }

    const trimmedDescription = description.trim()
    if (!trimmedDescription || trimmedDescription.length < 10) {
      fieldErrors.description = 'Description must be at least 10 characters.'
    } else if (trimmedDescription.length > 4000) {
      fieldErrors.description = 'Description must not exceed 4000 characters.'
    }

    if (!categoryId) {
      fieldErrors.categoryId = 'Category is required.'
    }

    if (!relatedSystemId) {
      fieldErrors.relatedSystemId = 'Related system is required.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setApiError(null)
    setSubmitting(true)

    try {
      const response = await apiFetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: trimmedSummary,
          description: trimmedDescription,
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          requestedPriority,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (errorData?.error?.fields) {
          // Field-level validation errors render beneath fields, not as a top banner
          setErrors(errorData.error.fields)
        } else {
          setApiError(
            errorData?.error?.message || 'Unable to create ticket. Please try again.',
          )
        }
        return
      }

      const ticket: CreatedTicket = await response.json()
      setCreatedTicket(ticket)
    } catch {
      setApiError('Unable to reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: '1200px' }}>
      <div className="mb-4">
        <h1 className="h2 mb-1">Create Ticket</h1>
        <p className="text-body-secondary mb-0">
          Describe what needs attention and submit a support Ticket.
        </p>
      </div>

      {referenceError && (
        <StateBlock
          variant="error"
          message={referenceError}
          onRetry={loadReferenceData}
          className="mb-4"
        />
      )}

      <div className="card">
        <div className="card-body">
          {createdTicket ? (
            /* Success Panel (FR-07, AC-08, ui-spec.md §5.2) */
            <div className="text-center py-5" data-testid="success-panel">
              <div
                className="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center p-3 mb-3"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
                </svg>
              </div>
              <h2 className="h3 mb-2">Ticket Created Successfully</h2>
              <p className="text-body-secondary mb-3">
                Your Ticket has been recorded with official number:
              </p>
              <div
                className="display-6 font-monospace text-primary fw-bold mb-4"
                data-testid="ticket-number-display"
              >
                {createdTicket.ticketNumber}
              </div>
              <div className="d-flex justify-content-center gap-3">
                <Link to={`/tickets/${createdTicket.id}`} className="btn btn-primary">
                  View Ticket
                </Link>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={resetForm}
                >
                  Create Another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* 1. System-generated, read-only row (ui-spec.md §5.2, §7, STYLE-03) */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6 col-lg-3">
                  <FormField
                    id="ticketNumber"
                    label="Ticket No."
                    readOnly
                    readOnlyValue="Generated on submission"
                  />
                </div>
                <div className="col-12 col-md-6 col-lg-3">
                  <FormField
                    id="ticketDate"
                    label="Ticket Date"
                    readOnly
                    readOnlyValue="Set on submission"
                  />
                </div>
                <div className="col-12 col-md-12 col-lg-6">
                  <FormField
                    id="requester"
                    label="Requester"
                    readOnly
                    readOnlyValue={selectedRequester?.name || ''}
                  />
                </div>
              </div>

              {/* 2. Classification — Category & Related System side by side */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <ReferenceSelect
                    id="categoryId"
                    label="Category"
                    required
                    options={categories}
                    value={categoryId}
                    onChange={(val) => {
                      setCategoryId(val)
                      if (errors.categoryId) {
                        setErrors((prev) => ({ ...prev, categoryId: undefined }))
                      }
                    }}
                    placeholder="Select category…"
                    loading={loadingReferences}
                    error={errors.categoryId}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <ReferenceSelect
                    id="relatedSystemId"
                    label="Related System"
                    required
                    options={relatedSystems}
                    value={relatedSystemId}
                    onChange={(val) => {
                      setRelatedSystemId(val)
                      if (errors.relatedSystemId) {
                        setErrors((prev) => ({ ...prev, relatedSystemId: undefined }))
                      }
                    }}
                    placeholder="Select related system…"
                    loading={loadingReferences}
                    error={errors.relatedSystemId}
                  />
                </div>
              </div>

              {/* 3. Priority — Requested Priority, MEDIUM preselected (BR-14) */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <FormField
                    id="requestedPriority"
                    label="Requested Priority"
                    required
                    error={errors.requestedPriority}
                  >
                    <select
                      id="requestedPriority"
                      className="form-select"
                      value={requestedPriority}
                      onChange={(e) => {
                        setRequestedPriority(e.target.value)
                        if (errors.requestedPriority) {
                          setErrors((prev) => ({ ...prev, requestedPriority: undefined }))
                        }
                      }}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </FormField>
                </div>
              </div>

              {/* 4. Content — Summary and Description */}
              <div className="mb-3">
                <FormField
                  id="summary"
                  label="Summary"
                  required
                  error={errors.summary}
                  helperText="Between 5 and 150 characters"
                >
                  <input
                    id="summary"
                    type="text"
                    className="form-control"
                    value={summary}
                    onChange={(e) => {
                      setSummary(e.target.value)
                      if (errors.summary) {
                        setErrors((prev) => ({ ...prev, summary: undefined }))
                      }
                    }}
                    placeholder="Brief summary of the problem"
                  />
                </FormField>
              </div>

              <div className="mb-3">
                <FormField
                  id="description"
                  label="Description"
                  required
                  error={errors.description}
                  helperText="Between 10 and 4000 characters"
                >
                  <textarea
                    id="description"
                    className="form-control"
                    rows={6}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      if (errors.description) {
                        setErrors((prev) => ({ ...prev, description: undefined }))
                      }
                    }}
                    placeholder="Detailed description of the problem, steps to reproduce, etc."
                  />
                </FormField>
              </div>

              {/* 5. Error StateBlock above actions on API failure (BR-25, AC-17) */}
              {apiError && (
                <div className="mb-3">
                  <StateBlock
                    variant="error"
                    title="Submission Failed"
                    message={apiError}
                    onRetry={() => handleSubmit()}
                  />
                </div>
              )}

              {/* 6. Actions, bottom right: Cancel secondary, Create Ticket primary */}
              <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                <Link to="/tickets" className="btn btn-outline-secondary">
                  Cancel
                </Link>
                <SubmitButton
                  loading={submitting}
                  busyLabel="Submitting…"
                >
                  Create Ticket
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateTicket
