import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { useRequester } from "../context/RequesterContext";
import type { AuthenticatedUser, UserRole } from "../types/auth";
import { getDefaultRouteForRole } from "../utils/navigation";
import { Badge } from "./Badge";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface AppShellProps {
  children?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  user?: AuthenticatedUser | null;
  onLogout?: () => void;
  requesterName?: string;
  onChangeRequester?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getNavLinksForRole(
  role?: UserRole,
): { to: string; label: string; end: boolean }[] {
  switch (role) {
    case "REQUESTER":
      return [
        { to: "/tickets", label: "My Tickets", end: true },
        { to: "/tickets/new", label: "Create Ticket", end: false },
      ];
    case "IT_STAFF":
      return [{ to: "/staff/queue", label: "Ticket Queue", end: false }];
    case "ADMINISTRATOR":
      return [{ to: "/admin/users", label: "Users", end: false }];
    default:
      return [
        { to: "/tickets", label: "My Tickets", end: true },
        { to: "/tickets/new", label: "Create Ticket", end: false },
      ];
  }
}

export function AppShell({
  children,
  breadcrumbs,
  user: propUser,
  onLogout: propOnLogout,
  requesterName: propRequesterName,
  onChangeRequester,
}: AppShellProps) {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  let contextUser: AuthenticatedUser | null = null;
  let contextLogout: (() => Promise<void>) | undefined;
  try {
    const auth = useAuth();
    contextUser = auth.user;
    contextLogout = auth.logout;
  } catch {
    // Rendered outside AuthProvider in an isolated test
  }

  let contextRequesterName: string | undefined;
  try {
    const requesterCtx = useRequester();
    contextRequesterName = requesterCtx.selectedRequester?.name;
  } catch {
    // Rendered outside RequesterProvider
  }

  const activeUser = propUser !== undefined ? propUser : contextUser;
  const isLab3Auth = activeUser !== null && activeUser !== undefined;
  const requesterName =
    propRequesterName || contextRequesterName || "Development Requester";

  const navLinks = getNavLinksForRole(activeUser?.role);

  const handleLogout = async () => {
    setProfileOpen(false);
    if (propOnLogout) {
      propOnLogout();
    } else if (contextLogout) {
      await contextLogout();
      navigate("/login", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  const brandTarget = activeUser
    ? getDefaultRouteForRole(activeUser.role)
    : "/tickets";

  return (
    <div className="min-vh-100 d-flex flex-column bg-body">
      {/* Persistent quiet notice (Lab 2 mode only) */}
      {!isLab3Auth && (
        <aside
          className="zen-notice py-1 text-center"
          role="note"
          aria-label="Development notice"
        >
          <div className="container px-3">
            Development Requester is a testing mechanism, not authentication.
          </div>
        </aside>
      )}

      {/* Zen Green Header */}
      <header className="zen-header text-white shadow-sm">
        <nav className="navbar navbar-expand-md navbar-dark p-0">
          <div
            className="container py-2 d-flex align-items-center justify-content-between"
            style={{ maxWidth: "1200px" }}
          >
            <div className="d-flex align-items-center">
              {/* Brand Logo & Wordmark */}
              <Link to={brandTarget} className="zen-brand me-4 fs-5">
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
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `zen-nav-link ${isActive ? "active" : ""}`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Right side: User/Requester Profile + Mobile Toggler */}
            <div className="d-flex align-items-center gap-2">
              {isLab3Auth ? (
                <div className="d-flex align-items-center gap-2">
                  {/* User Initial Badge Avatar */}
                  <span className="zen-avatar" aria-hidden="true">
                    {getInitials(activeUser.name)}
                  </span>

                  {/* User Full Name */}
                  <span className="d-none d-sm-inline fw-medium text-white me-1">
                    {activeUser.name}
                  </span>

                  {/* Role Badge */}
                  <Badge value={activeUser.role} />

                  {/* Profile Dropdown */}
                  <div className="dropdown position-relative">
                    <button
                      type="button"
                      className="btn btn-sm text-white d-flex align-items-center gap-1 border border-white-50 ms-1"
                      aria-label="User profile"
                      aria-expanded={profileOpen}
                      onClick={() => setProfileOpen((prev) => !prev)}
                    >
                      <span className="small" aria-hidden="true">
                        ▾
                      </span>
                    </button>

                    {profileOpen && (
                      <ul className="dropdown-menu dropdown-menu-end show position-absolute mt-1 shadow">
                        <li>
                          <span className="dropdown-item-text text-muted small">
                            {activeUser.email}
                          </span>
                        </li>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <button
                            type="button"
                            className="dropdown-item text-danger"
                            onClick={handleLogout}
                          >
                            Logout
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                /* Lab 2 Fallback: Requester Profile Menu */
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
                    <span
                      className="d-inline-block text-truncate"
                      style={{ maxWidth: "160px" }}
                    >
                      {requesterName}
                    </span>
                    <span className="small" aria-hidden="true">
                      ▾
                    </span>
                  </button>

                  {profileOpen && (
                    <ul className="dropdown-menu dropdown-menu-end show position-absolute mt-1 shadow">
                      <li>
                        <span className="dropdown-item-text text-muted small">
                          Acting as <strong>{requesterName}</strong>
                        </span>
                      </li>
                      <li>
                        <hr className="dropdown-divider" />
                      </li>
                      <li>
                        {onChangeRequester ? (
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => {
                              setProfileOpen(false);
                              onChangeRequester();
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
              )}

              {/* Mobile Navbar Toggler */}
              {navLinks.length > 0 && (
                <button
                  type="button"
                  className="navbar-toggler d-md-none border-white-50 p-1"
                  aria-label="Toggle navigation"
                  aria-expanded={navOpen}
                  onClick={() => setNavOpen((prev) => !prev)}
                >
                  <span className="navbar-toggler-icon" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Collapsible Nav */}
          {navOpen && navLinks.length > 0 && (
            <div className="d-md-none w-100 border-top border-white-50 px-3 py-2">
              <div className="d-flex flex-column gap-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `zen-nav-link py-2 ${isActive ? "active" : ""}`
                    }
                    onClick={() => setNavOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="breadcrumb"
          className="container pt-3"
          style={{ maxWidth: "1200px" }}
        >
          <ol className="breadcrumb mb-0">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li
                  key={crumb.label}
                  className={`breadcrumb-item ${isLast ? "active" : ""}`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {isLast || !crumb.to ? (
                    crumb.label
                  ) : (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Main Content */}
      <main
        className="container my-4 flex-grow-1"
        style={{ maxWidth: "1200px" }}
      >
        {children}
      </main>
    </div>
  );
}

export default AppShell;
