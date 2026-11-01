import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
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
        { to: "/dashboard", label: "Dashboard", end: true },
        { to: "/tickets", label: "My Tickets", end: true },
        { to: "/tickets/new", label: "Create Ticket", end: false },
      ];
    case "IT_STAFF":
      return [
        { to: "/dashboard", label: "Dashboard", end: true },
        { to: "/staff/queue", label: "Ticket Queue", end: false },
      ];
    case "ADMINISTRATOR":
      return [
        { to: "/dashboard", label: "Dashboard", end: true },
        { to: "/staff/queue", label: "Ticket Queue", end: false },
        { to: "/admin/users", label: "Users", end: false },
      ];
    default:
      return [];
  }
}

export function AppShell({
  children,
  breadcrumbs,
  user: propUser,
  onLogout: propOnLogout,
}: AppShellProps) {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  let auth: ReturnType<typeof useAuth> | undefined;
  try {
    auth = useAuth();
  } catch {
    // Standalone shell previews supply the user through props.
  }
  const activeUser = propUser !== undefined ? propUser : auth?.user;
  const logoutRef = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const navLinks = getNavLinksForRole(activeUser?.role);

  const handleLogout = async () => {
    if (logoutRef.current) return;
    logoutRef.current = true;
    setLoggingOut(true);
    setLogoutError(null);
    setProfileOpen(false);
    try {
      if (propOnLogout) propOnLogout();
      else {
        await auth?.logout();
        navigate("/login", { replace: true });
      }
    } catch {
      setLogoutError("Unable to sign out. Please try again.");
    } finally {
      logoutRef.current = false;
      setLoggingOut(false);
    }
  };

  const brandTarget = activeUser
    ? getDefaultRouteForRole(activeUser.role)
    : "/login";

  return (
    <div className="min-vh-100 d-flex flex-column bg-body">
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
              {activeUser ? (
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
                  <div className="dropdown position-relative" ref={dropdownRef}>
                    <button
                      type="button"
                      className="btn btn-sm text-white d-flex align-items-center gap-1 border border-white-50 ms-1"
                      disabled={loggingOut}
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
                <Link to="/login" className="btn btn-outline-light">Sign In</Link>
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
        {logoutError && <div className="alert alert-danger" role="alert">{logoutError}</div>}
        {children}
      </main>
    </div>
  );
}

export default AppShell;
