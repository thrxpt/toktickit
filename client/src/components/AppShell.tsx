import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface AppShellProps {
  children?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  requesterName?: string
  onChangeRequester?: () => void
}

export function AppShell({
  children,
  breadcrumbs,
  requesterName = 'Development Requester',
  onChangeRequester,
}: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="min-vh-100 d-flex flex-column bg-body">
      {/* Persistent quiet notice (BR-03) */}
      <aside
        className="zen-notice py-1 text-center"
        role="note"
        aria-label="Development notice"
      >
        <div className="container px-3">
          Development Requester is a testing mechanism, not authentication.
        </div>
      </aside>

      {/* Zen Green Header */}
      <header className="zen-header text-white shadow-sm">
        <nav className="navbar navbar-expand-md navbar-dark p-0">
          <div
            className="container py-2 d-flex align-items-center justify-content-between"
            style={{ maxWidth: '1200px' }}
          >
            <div className="d-flex align-items-center">
              {/* Brand Logo & Wordmark */}
              <Link to="/tickets" className="zen-brand me-4 fs-5">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>TokTickIT</span>
              </Link>

              {/* Desktop Nav */}
              <div className="d-none d-md-flex align-items-center gap-2">
                <NavLink
                  to="/tickets"
                  end
                  className={({ isActive }) =>
                    `zen-nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  My Tickets
                </NavLink>
                <NavLink
                  to="/tickets/new"
                  className={({ isActive }) =>
                    `zen-nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  Create Ticket
                </NavLink>
              </div>
            </div>

            {/* Right side: Requester Profile + Mobile Toggler */}
            <div className="d-flex align-items-center gap-2">
              {/* Profile Menu */}
              <div className="dropdown position-relative">
                <button
                  type="button"
                  className="btn btn-sm text-white d-flex align-items-center gap-1 border border-white-50"
                  aria-label="Requester profile"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((prev) => !prev)}
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
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="d-inline-block text-truncate" style={{ maxWidth: '160px' }}>
                    {requesterName}
                  </span>
                  <span className="small" aria-hidden="true">▾</span>
                </button>

                {profileOpen && (
                  <ul className="dropdown-menu dropdown-menu-end show position-absolute mt-1 shadow">
                    <li>
                      <span className="dropdown-item-text text-muted small">
                        Signed in as <strong>{requesterName}</strong>
                      </span>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      {onChangeRequester ? (
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setProfileOpen(false)
                            onChangeRequester()
                          }}
                        >
                          Change Requester
                        </button>
                      ) : (
                        <Link
                          to="/select-requester"
                          className="dropdown-item"
                          onClick={() => setProfileOpen(false)}
                        >
                          Change Requester
                        </Link>
                      )}
                    </li>
                  </ul>
                )}
              </div>

              {/* Mobile Navbar Toggler */}
              <button
                type="button"
                className="navbar-toggler d-md-none border-white-50 p-1"
                aria-label="Toggle navigation"
                aria-expanded={navOpen}
                onClick={() => setNavOpen((prev) => !prev)}
              >
                <span className="navbar-toggler-icon" />
              </button>
            </div>
          </div>

          {/* Mobile Collapsible Nav */}
          {navOpen && (
            <div className="d-md-none w-100 border-top border-white-50 px-3 py-2">
              <div className="d-flex flex-column gap-1">
                <NavLink
                  to="/tickets"
                  end
                  className={({ isActive }) =>
                    `zen-nav-link py-2 ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setNavOpen(false)}
                >
                  My Tickets
                </NavLink>
                <NavLink
                  to="/tickets/new"
                  className={({ isActive }) =>
                    `zen-nav-link py-2 ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setNavOpen(false)}
                >
                  Create Ticket
                </NavLink>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Breadcrumbs (if provided) */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb" className="container pt-3" style={{ maxWidth: '1200px' }}>
          <ol className="breadcrumb mb-0">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <li
                  key={crumb.label}
                  className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {isLast || !crumb.to ? (
                    crumb.label
                  ) : (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      {/* Main Content */}
      <main className="container my-4 flex-grow-1" style={{ maxWidth: '1200px' }}>
        {children}
      </main>
    </div>
  )
}

export default AppShell
