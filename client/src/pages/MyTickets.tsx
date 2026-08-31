import React, { useEffect, useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import apiFetch from '../api/client'
import Badge from '../components/Badge'
import Pagination from '../components/Pagination'
import StateBlock from '../components/StateBlock'
import Toolbar from '../components/Toolbar'
import { useRequester } from '../context/RequesterContext'
import type { TicketListItem, TicketListMeta } from '../types/ticket'

interface CategoryOption {
  id: number
  name: string
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoString
  }
}

export function MyTickets() {
  const { selectedRequester } = useRequester()
  const [searchParams, setSearchParams] = useSearchParams()

  const searchInputId = useId()
  const categorySelectId = useId()
  const prioritySelectId = useId()
  const statusSelectId = useId()

  // URL state
  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const requestedPriority = searchParams.get('requestedPriority') || ''
  const status = searchParams.get('status') || ''
  const sort = searchParams.get('sort') || 'createdAt'
  const order = searchParams.get('order') || 'desc'
  const page = parseInt(searchParams.get('page') || '1', 10) || 1
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10) || 10

  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [tickets, setTickets] = useState<TicketListItem[]>([])
  const [meta, setMeta] = useState<TicketListMeta>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Local search text for smooth typing
  const [searchInput, setSearchInput] = useState(search)

  // Sync searchInput if search param changes externally
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  // Load active categories for filter dropdown
  useEffect(() => {
    let active = true
    apiFetch('/api/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CategoryOption[]) => {
        if (active) {
          setCategories(data)
        }
      })
      .catch(() => {
        // Categories fetch error is handled gracefully
      })
    return () => {
      active = false
    }
  }, [])

  const fetchTickets = () => {
    if (!selectedRequester) return

    setLoading(true)
    setError(false)

    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (categoryId) params.set('categoryId', categoryId)
    if (requestedPriority) params.set('requestedPriority', requestedPriority)
    if (status) params.set('status', status)
    if (sort) params.set('sort', sort)
    if (order) params.set('order', order)
    if (page > 1) params.set('page', String(page))
    if (pageSize !== 10) params.set('pageSize', String(pageSize))

    const queryString = params.toString()
    const url = `/api/tickets${queryString ? `?${queryString}` : ''}`

    apiFetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch tickets')
        }
        return res.json()
      })
      .then((json: { data: TicketListItem[]; meta: TicketListMeta }) => {
        setTickets(json.data || [])
        setMeta(
          json.meta || {
            page: 1,
            pageSize: 10,
            totalItems: 0,
            totalPages: 0,
          },
        )
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchTickets()
  }, [
    selectedRequester?.id,
    search,
    categoryId,
    requestedPriority,
    status,
    sort,
    order,
    page,
    pageSize,
  ])

  // Parameter update helper
  const updateParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    })
    setSearchParams(next)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParam({ search: searchInput.trim() || null, page: '1' })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchInput(val)
    if (val === '') {
      updateParam({ search: null, page: '1' })
    }
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParam({ categoryId: e.target.value || null, page: '1' })
  }

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParam({ requestedPriority: e.target.value || null, page: '1' })
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParam({ status: e.target.value || null, page: '1' })
  }

  const handleClearFilters = () => {
    setSearchInput('')
    const next = new URLSearchParams()
    if (sort !== 'createdAt') next.set('sort', sort)
    if (order !== 'desc') next.set('order', order)
    if (pageSize !== 10) next.set('pageSize', String(pageSize))
    setSearchParams(next)
  }

  const handleSort = (field: 'ticketNumber' | 'createdAt' | 'updatedAt') => {
    if (sort === field) {
      updateParam({ order: order === 'asc' ? 'desc' : 'asc', page: '1' })
    } else {
      updateParam({ sort: field, order: 'asc', page: '1' })
    }
  }

  const handlePageChange = (newPage: number) => {
    updateParam({ page: newPage > 1 ? String(newPage) : null })
  }

  const hasActiveFilters = Boolean(
    search.trim() || categoryId || requestedPriority || status,
  )

  const renderSortIndicator = (
    field: 'ticketNumber' | 'createdAt' | 'updatedAt',
  ) => {
    if (sort !== field) return null
    return (
      <span className="ms-1" aria-hidden="true">
        {order === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  const getSortAria = (
    field: 'ticketNumber' | 'createdAt' | 'updatedAt',
  ): 'ascending' | 'descending' | 'none' => {
    if (sort !== field) return 'none'
    return order === 'asc' ? 'ascending' : 'descending'
  }

  // Calculate showing X to Y of N
  const fromCount = meta.totalItems === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1
  const toCount =
    meta.totalItems === 0
      ? 0
      : Math.min(meta.page * meta.pageSize, meta.totalItems)

  const filterControls = (
    <div className="row g-2 align-items-center">
      <div className="col-12 col-md-6 col-lg-5">
        <form onSubmit={handleSearchSubmit}>
          <div className="input-group">
            <input
              id={searchInputId}
              type="search"
              className="form-control"
              placeholder="Search by ticket number or summary…"
              aria-label="Search by ticket number or summary"
              value={searchInput}
              onChange={handleSearchChange}
            />
            {searchInput && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label="Clear search"
                title="Clear search"
                onClick={() => {
                  setSearchInput('')
                  updateParam({ search: null, page: '1' })
                }}
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="col-12 col-md-6 col-lg-3">
        <select
          id={categorySelectId}
          className="form-select"
          aria-label="Filter by category"
          value={categoryId}
          onChange={handleCategoryChange}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-12 col-md-6 col-lg-2">
        <select
          id={prioritySelectId}
          className="form-select"
          aria-label="Filter by priority"
          value={requestedPriority}
          onChange={handlePriorityChange}
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>
      <div className="col-12 col-md-6 col-lg-2">
        <select
          id={statusSelectId}
          className="form-select"
          aria-label="Filter by status"
          value={status}
          onChange={handleStatusChange}
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h1 className="h2 mb-1">My Tickets</h1>
          <p className="text-body-secondary mb-0">
            View and track all of your support requests.
          </p>
        </div>
        <div className="d-flex gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
          <Link to="/tickets/new" className="btn btn-primary">
            Create Ticket
          </Link>
        </div>
      </div>

      {/* Desktop & Tablet Filters Toolbar (>=768px) */}
      <div className="d-none d-md-block">
        <Toolbar className="mb-4">{filterControls}</Toolbar>
      </div>

      {/* Mobile Collapsible Filters Disclosure (<768px) */}
      <details className="d-md-none mb-3">
        <summary className="btn btn-outline-secondary w-100 mb-2 text-start">
          Filters
        </summary>
        <Toolbar className="mb-3">{filterControls}</Toolbar>
      </details>

      {/* States: Loading, Error, Empty, No-Results, or Data */}
      {loading ? (
        <StateBlock variant="loading" message="Loading tickets…" />
      ) : error ? (
        <StateBlock
          variant="error"
          title="Something went wrong"
          message="Unable to load tickets. Please try again."
          onRetry={fetchTickets}
        />
      ) : meta.totalItems === 0 && !hasActiveFilters ? (
        <StateBlock
          variant="empty"
          title="No tickets yet"
          message="You have not created any support tickets yet."
          action={
            <Link to="/tickets/new" className="btn btn-primary">
              Create Ticket
            </Link>
          }
        />
      ) : tickets.length === 0 ? (
        <StateBlock
          variant="no-results"
          title="No matching tickets"
          message="No tickets matched your search or filter criteria."
          onClearFilters={handleClearFilters}
        />
      ) : (
        <>
          {/* Desktop & Tablet Table (>=768px) */}
          <div className="card d-none d-md-block mb-4 shadow-sm border">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th
                      scope="col"
                      aria-sort={getSortAria('ticketNumber')}
                      style={{ width: '16%' }}
                    >
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none p-0 fw-semibold text-body d-inline-flex align-items-center"
                        onClick={() => handleSort('ticketNumber')}
                        aria-label="Sort by Ticket Number"
                      >
                        Ticket No.
                        {renderSortIndicator('ticketNumber')}
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={getSortAria('createdAt')}
                      style={{ width: '14%' }}
                    >
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none p-0 fw-semibold text-body d-inline-flex align-items-center"
                        onClick={() => handleSort('createdAt')}
                        aria-label="Sort by Created Date"
                      >
                        Created Date
                        {renderSortIndicator('createdAt')}
                      </button>
                    </th>
                    <th scope="col" style={{ width: '26%' }}>
                      Summary
                    </th>
                    <th scope="col" style={{ width: '12%' }}>
                      Category
                    </th>
                    <th scope="col" style={{ width: '10%' }}>
                      Requested Priority
                    </th>
                    <th scope="col" style={{ width: '10%' }}>
                      Current Status
                    </th>
                    <th
                      scope="col"
                      className="d-none d-lg-table-cell"
                      aria-sort={getSortAria('updatedAt')}
                      style={{ width: '12%' }}
                    >
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none p-0 fw-semibold text-body d-inline-flex align-items-center"
                        onClick={() => handleSort('updatedAt')}
                        aria-label="Sort by Last Updated"
                      >
                        Last Updated
                        {renderSortIndicator('updatedAt')}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="fw-semibold text-decoration-none"
                          style={{ color: 'var(--zen-secondary)' }}
                        >
                          {ticket.ticketNumber}
                        </Link>
                      </td>
                      <td className="text-body-secondary">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td>
                        <span className="text-body">{ticket.summary}</span>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {ticket.category.name}
                        </span>
                      </td>
                      <td>
                        <Badge value={ticket.requestedPriority} />
                      </td>
                      <td>
                        <Badge value={ticket.status} />
                      </td>
                      <td className="d-none d-lg-table-cell text-body-secondary">
                        {formatDate(ticket.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards Layout (<768px, AC-43) */}
          <div className="d-md-none mb-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="card mb-3 shadow-sm border"
                data-testid="ticket-card"
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="fw-semibold text-decoration-none fs-6"
                      style={{ color: 'var(--zen-secondary)' }}
                    >
                      {ticket.ticketNumber}
                    </Link>
                    <Badge value={ticket.status} />
                  </div>
                  <div className="fw-semibold mb-2 text-body">
                    {ticket.summary}
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2 text-body-secondary small pt-1 border-top">
                    <span>{ticket.category.name}</span>
                    <span>•</span>
                    <Badge value={ticket.requestedPriority} />
                    <span>•</span>
                    <span>{formatDate(ticket.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer with Showing count and Pagination */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 pt-2">
            <div className="text-body-secondary small">
              Showing {fromCount} to {toCount} of {meta.totalItems} tickets
            </div>
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default MyTickets
