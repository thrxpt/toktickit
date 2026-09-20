import React, { useEffect, useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import apiFetch from "../../api/client";
import Badge from "../../components/Badge";
import Pagination from "../../components/Pagination";
import StateBlock from "../../components/StateBlock";
import type {
  ITPriority,
  StaffQueueResponse,
  StaffQueueTicketItem,
  TicketStatus,
} from "../../types/ticket";
import { formatDate } from "../../utils/date";

interface CategoryOption {
  id: number;
  name: string;
}

interface StaffMemberOption {
  id: number;
  name: string;
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_FOR_REQUESTER", label: "Waiting for Requester" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
  { value: "REOPENED", label: "Reopened" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS: { value: ITPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

type SortableField =
  | "createdAt"
  | "ticketNumber"
  | "itPriority"
  | "status"
  | "updatedAt";

export function StaffTicketQueue() {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchInputId = useId();
  const categorySelectId = useId();
  const statusSelectId = useId();
  const prioritySelectId = useId();
  const ownerSelectId = useId();
  const pageSizeSelectId = useId();

  // URL state
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";
  const priority = searchParams.get("priority") || "";
  const owner = searchParams.get("owner") || "";
  const sortBy = (searchParams.get("sortBy") as SortableField) || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
  const page = parseInt(searchParams.get("page") || "1", 10) || 1;
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10) || 10;

  // Local state
  const [searchInput, setSearchInput] = useState(search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberOption[]>([]);
  const [tickets, setTickets] = useState<StaffQueueTicketItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Synchronize local search input if URL search changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Load active categories for filter dropdown
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/categories", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CategoryOption[]) => {
        if (!controller.signal.aborted && Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((err: unknown) => {
        if (
          controller.signal.aborted ||
          (err as Error)?.name === "AbortError"
        ) {
          return;
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Load active staff members for owner filter dropdown
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/staff/assignees", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: StaffMemberOption[]) => {
        if (!controller.signal.aborted && Array.isArray(data)) {
          setStaffMembers(data);
        }
      })
      .catch((err: unknown) => {
        if (
          controller.signal.aborted ||
          (err as Error)?.name === "AbortError"
        ) {
          return;
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Fetch queue data from server
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (owner) params.set("owner", owner);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 10) params.set("pageSize", String(pageSize));

    const queryString = params.toString();
    const endpoint = queryString
      ? `/api/staff/tickets?${queryString}`
      : "/api/staff/tickets";

    apiFetch(endpoint, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json() as Promise<StaffQueueResponse>;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setTickets(data.items || []);
          setPagination(
            data.pagination || {
              page: 1,
              pageSize: 10,
              totalItems: 0,
              totalPages: 0,
            },
          );
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (
          controller.signal.aborted ||
          (err as Error)?.name === "AbortError"
        ) {
          return;
        }
        setError(true);
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [
    search,
    category,
    status,
    priority,
    owner,
    sortBy,
    sortOrder,
    page,
    pageSize,
    retryCount,
  ]);

  // Helper to update search params while preserving unchanged keys
  const updateParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam({ search: searchInput.trim() || null, page: "1" });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParam({ category: e.target.value || null, page: "1" });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParam({ status: e.target.value || null, page: "1" });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParam({ priority: e.target.value || null, page: "1" });
  };

  const handleOwnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParam({ owner: e.target.value || null, page: "1" });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    const next = new URLSearchParams();
    if (sortBy !== "createdAt") next.set("sortBy", sortBy);
    if (sortOrder !== "desc") next.set("sortOrder", sortOrder);
    if (pageSize !== 10) next.set("pageSize", String(pageSize));
    setSearchParams(next);
  };

  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      updateParam({
        sortOrder: sortOrder === "asc" ? "desc" : "asc",
        page: "1",
      });
    } else {
      updateParam({ sortBy: field, sortOrder: "asc", page: "1" });
    }
  };

  const handleSortKeyDown = (
    e: React.KeyboardEvent,
    field: SortableField,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSort(field);
    }
  };

  const handlePageChange = (newPage: number) => {
    updateParam({ page: newPage > 1 ? String(newPage) : null });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value;
    updateParam({ pageSize: newSize !== "10" ? newSize : null, page: "1" });
  };

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  const activeDrawerFilterCount = [category, status, priority, owner].filter(
    Boolean,
  ).length;
  const hasActiveFilters = Boolean(
    search.trim() || category || status || priority || owner,
  );

  const renderSortIndicator = (field: SortableField) => {
    if (sortBy !== field) return null;
    return (
      <span className="ms-1" aria-hidden="true">
        {sortOrder === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const getSortAria = (
    field: SortableField,
  ): "ascending" | "descending" | "none" => {
    if (sortBy !== field) return "none";
    return sortOrder === "asc" ? "ascending" : "descending";
  };

  // Showing X to Y of N
  const fromCount =
    pagination.totalItems === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const toCount =
    pagination.totalItems === 0
      ? 0
      : Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className="container py-4">
      {/* Page Title & Toolbar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h2 mb-1">Ticket Queue</h1>
          <p className="text-muted mb-0">
            Monitor, triage, and manage organization-wide support requests.
          </p>
        </div>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="card mb-4 shadow-sm border-0">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Search Bar */}
            <div className="col-12 col-md-7 col-lg-8">
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
                        setSearchInput("");
                        updateParam({ search: null, page: "1" });
                      }}
                    >
                      ✕
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary">
                    Search
                  </button>
                </div>
              </form>
            </div>

            {/* Filter Toggle Button */}
            <div className="col-12 col-md-5 col-lg-4 text-md-end">
              <button
                type="button"
                className={`btn ${filtersOpen ? "btn-secondary" : "btn-outline-secondary"} w-100 w-md-auto`}
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-expanded={filtersOpen}
                aria-controls="filterDrawer"
              >
                Filters
                {activeDrawerFilterCount > 0 && (
                  <span
                    className="badge bg-primary text-white ms-2"
                    aria-label={`${activeDrawerFilterCount} active filters`}
                  >
                    {activeDrawerFilterCount}
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn-link text-decoration-none text-danger ms-2 p-0"
                  onClick={handleClearFilters}
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Filter Drawer */}
          {filtersOpen && (
            <div
              id="filterDrawer"
              className="mt-3 pt-3 border-top"
              data-testid="filter-drawer"
            >
              <div className="row g-3">
                {/* Category Dropdown */}
                <div className="col-12 col-sm-6 col-md-3">
                  <label htmlFor={categorySelectId} className="form-label">
                    Category
                  </label>
                  <select
                    id={categorySelectId}
                    className="form-select"
                    aria-label="Filter by category"
                    value={category}
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

                {/* Status Dropdown */}
                <div className="col-12 col-sm-6 col-md-3">
                  <label htmlFor={statusSelectId} className="form-label">
                    Status
                  </label>
                  <select
                    id={statusSelectId}
                    className="form-select"
                    aria-label="Filter by status"
                    value={status}
                    onChange={handleStatusChange}
                  >
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* IT Priority Dropdown */}
                <div className="col-12 col-sm-6 col-md-3">
                  <label htmlFor={prioritySelectId} className="form-label">
                    IT Priority
                  </label>
                  <select
                    id={prioritySelectId}
                    className="form-select"
                    aria-label="Filter by IT priority"
                    value={priority}
                    onChange={handlePriorityChange}
                  >
                    <option value="">All Priorities</option>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Owner Dropdown */}
                <div className="col-12 col-sm-6 col-md-3">
                  <label htmlFor={ownerSelectId} className="form-label">
                    Owner
                  </label>
                  <select
                    id={ownerSelectId}
                    className="form-select"
                    aria-label="Filter by owner"
                    value={owner}
                    onChange={handleOwnerChange}
                  >
                    <option value="">All Owners</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="me">Assigned to Me</option>
                    {staffMembers.map((sm) => (
                      <option key={sm.id} value={String(sm.id)}>
                        {sm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="d-flex justify-content-end mt-3 gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <StateBlock variant="loading" message="Loading ticket queue…" />
      ) : error ? (
        <StateBlock
          variant="error"
          title="Unable to load ticket queue"
          message="Failed to fetch tickets from server. Please try again."
          onRetry={handleRetry}
        />
      ) : tickets.length === 0 ? (
        hasActiveFilters ? (
          <StateBlock
            variant="no-results"
            title="No matching tickets"
            message="No tickets matched your search or filter criteria."
            onClearFilters={handleClearFilters}
          />
        ) : (
          <StateBlock
            variant="empty"
            title="Ticket queue is empty"
            message="There are currently no tickets in the system."
          />
        )
      ) : (
        <>
          {/* Desktop & Tablet Table View (>= 768px, condensed on tablet 768-991px per ui-spec §5) */}
          <div className="card shadow-sm border-0 d-none d-md-block mb-3">
            <div className="table-responsive">
              <table
                className="table table-hover align-middle mb-0"
                aria-label="IT Staff Ticket Queue"
              >
                <thead className="table-light">
                  <tr>
                    <th
                      scope="col"
                      className="zen-col-ticket-no zen-sortable-header"
                      tabIndex={0}
                      onClick={() => handleSort("ticketNumber")}
                      onKeyDown={(e) => handleSortKeyDown(e, "ticketNumber")}
                      aria-sort={getSortAria("ticketNumber")}
                    >
                      Ticket No.{renderSortIndicator("ticketNumber")}
                    </th>
                    <th
                      scope="col"
                      className="zen-col-date zen-sortable-header d-none d-lg-table-cell"
                      tabIndex={0}
                      onClick={() => handleSort("createdAt")}
                      onKeyDown={(e) => handleSortKeyDown(e, "createdAt")}
                      aria-sort={getSortAria("createdAt")}
                    >
                      Created Date{renderSortIndicator("createdAt")}
                    </th>
                    <th scope="col">Summary</th>
                    <th scope="col" className="zen-col-category">
                      Category
                    </th>
                    <th scope="col" className="zen-col-priority d-none d-lg-table-cell">
                      Req. Priority
                    </th>
                    <th
                      scope="col"
                      className="zen-col-priority zen-sortable-header"
                      tabIndex={0}
                      onClick={() => handleSort("itPriority")}
                      onKeyDown={(e) => handleSortKeyDown(e, "itPriority")}
                      aria-sort={getSortAria("itPriority")}
                    >
                      IT Priority{renderSortIndicator("itPriority")}
                    </th>
                    <th
                      scope="col"
                      className="zen-col-status zen-sortable-header"
                      tabIndex={0}
                      onClick={() => handleSort("status")}
                      onKeyDown={(e) => handleSortKeyDown(e, "status")}
                      aria-sort={getSortAria("status")}
                    >
                      Status{renderSortIndicator("status")}
                    </th>
                    <th scope="col" className="zen-col-owner">
                      Owner
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      data-testid={`queue-row-${t.id}`}
                    >
                      <td>
                        <Link
                          to={`/staff/tickets/${t.id}`}
                          className="fw-semibold text-decoration-none"
                        >
                          {t.ticketNumber}
                        </Link>
                      </td>
                      <td className="text-body-secondary small d-none d-lg-table-cell">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="fw-medium text-truncate zen-summary-truncate">
                        {t.summary}
                      </td>
                      <td>{t.categoryName}</td>
                      <td className="d-none d-lg-table-cell">
                        <Badge value={t.requestedPriority} />
                      </td>
                      <td>
                        <Badge value={t.itPriority} />
                      </td>
                      <td>
                        <Badge value={t.status} />
                      </td>
                      <td>
                        {t.ticketOwner ? (
                          <span className="fw-medium">{t.ticketOwner.name}</span>
                        ) : (
                          <span className="text-muted fst-italic">
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (< 768px per ui-spec §4.4, §5) */}
          <div className="d-md-none d-flex flex-column gap-3 mb-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="card shadow-sm border-0"
                data-testid={`queue-card-${t.id}`}
              >
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Link
                      to={`/staff/tickets/${t.id}`}
                      className="fw-bold text-decoration-none h6 mb-0"
                    >
                      {t.ticketNumber}
                    </Link>
                    <span className="text-muted small">
                      {formatDate(t.createdAt)}
                    </span>
                  </div>

                  <h2 className="h6 fw-semibold text-body mb-2">{t.summary}</h2>

                  <div className="text-muted small mb-2">
                    Category: <span className="text-body">{t.categoryName}</span>
                  </div>

                  <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                    <div>
                      <span className="small text-muted me-1">Status:</span>
                      <Badge value={t.status} />
                    </div>
                    <div>
                      <span className="small text-muted me-1">Req:</span>
                      <Badge value={t.requestedPriority} />
                    </div>
                    <div>
                      <span className="small text-muted me-1">IT:</span>
                      <Badge value={t.itPriority} />
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <span className="small">
                      <span className="text-muted">Owner: </span>
                      {t.ticketOwner ? (
                        <span className="fw-medium">{t.ticketOwner.name}</span>
                      ) : (
                        <span className="text-muted fst-italic">
                          Unassigned
                        </span>
                      )}
                    </span>
                    <Link
                      to={`/staff/tickets/${t.id}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination & Count Controls */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 pt-2">
            <div className="text-muted small">
              Showing {fromCount} to {toCount} of {pagination.totalItems} tickets
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <label
                  htmlFor={pageSizeSelectId}
                  className="form-label mb-0 small text-muted text-nowrap"
                >
                  Page size:
                </label>
                <select
                  id={pageSizeSelectId}
                  className="form-select form-select-sm w-auto"
                  aria-label="Page size"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StaffTicketQueue;
