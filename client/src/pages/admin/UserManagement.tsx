import { useCallback, useEffect, useState } from "react";

import apiFetch from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Badge from "../../components/Badge";
import StateBlock from "../../components/StateBlock";
import UserEditDrawer, { type AdminUserData } from "./UserEditDrawer";

export function UserManagement() {
  const auth = useAuth();
  const currentAdmin = auth.user;

  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [activeAdminCount, setActiveAdminCount] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  // Debounce search input to prevent rapid UI flashes (ui-spec.md §4.7)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserData | null>(null);

  // Success alert
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(async (searchQuery = "", roleQuery = "") => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }
      if (roleQuery) {
        params.set("role", roleQuery);
      }

      const queryString = params.toString();
      const url = `/api/admin/users${queryString ? `?${queryString}` : ""}`;
      const res = await apiFetch(url);

      if (!res.ok) {
        setError(true);
        return;
      }

      const data = (await res.json()) as AdminUserData[];
      setUsers(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAdminCount = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/users?role=ADMINISTRATOR");
      if (res.ok) {
        const admins = (await res.json()) as AdminUserData[];
        setActiveAdminCount(
          admins.filter((u) => u.role === "ADMINISTRATOR" && u.isActive).length,
        );
      }
    } catch {
      // Fallback default
    }
  }, []);

  // Fetch full active admin count on mount
  useEffect(() => {
    refreshAdminCount();
  }, [refreshAdminCount]);

  // Fetch users when debounced search or role filter changes
  useEffect(() => {
    fetchUsers(debouncedSearch, roleFilter);
  }, [debouncedSearch, roleFilter, fetchUsers]);

  const handleOpenCreate = () => {
    setSelectedUser(null);
    setIsDrawerOpen(true);
    setBannerMessage(null);
  };

  const handleOpenEdit = (user: AdminUserData) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
    setBannerMessage(null);
  };

  const handleUserSaved = (_savedUser: AdminUserData) => {
    setBannerMessage(
      selectedUser
        ? "User updated successfully."
        : "User created successfully.",
    );
    // Refresh user list and admin count
    fetchUsers(debouncedSearch, roleFilter);
    refreshAdminCount();
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setRoleFilter("");
  };

  const hasActiveFilters = Boolean(searchInput.trim() || roleFilter);

  return (
    <div className="container py-4" data-testid="user-management-page">
      {/* Top Bar Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h2 mb-1">User Management</h1>
          <p className="text-muted mb-0">
            Manage employee accounts, role assignments, and authentication
            credentials.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center gap-2"
            onClick={handleOpenCreate}
            data-testid="btn-create-user"
          >
            <span>+</span> Create User
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div
          className="alert alert-success alert-dismissible fade show mb-4"
          role="alert"
          data-testid="user-management-banner"
        >
          {bannerMessage}
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setBannerMessage(null)}
          />
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card mb-4 border shadow-sm">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-md-6 col-lg-5">
              <label htmlFor="userSearch" className="visually-hidden">
                Search users by name or email
              </label>
              <div className="input-group">
                <span
                  className="input-group-text bg-white text-muted"
                  aria-hidden="true"
                >
                  🔍
                </span>
                <input
                  id="userSearch"
                  type="text"
                  className="form-control"
                  placeholder="Search users by name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  data-testid="input-search-users"
                />
              </div>
            </div>

            {/* Role Filter Dropdown */}
            <div className="col-12 col-md-4 col-lg-3">
              <label htmlFor="userRoleFilter" className="visually-hidden">
                Filter by Role
              </label>
              <select
                id="userRoleFilter"
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                data-testid="select-filter-role"
              >
                <option value="">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>

            {/* Clear filters shortcut if active */}
            {hasActiveFilters && (
              <div className="col-12 col-md-auto ms-md-auto">
                <button
                  type="button"
                  className="btn btn-link text-muted p-0 text-decoration-none"
                  onClick={handleClearFilters}
                  data-testid="btn-clear-filters"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Table / State Blocks */}
      {loading ? (
        <StateBlock
          variant="loading"
          message="Loading users..."
        />
      ) : error ? (
        <StateBlock
          variant="error"
          title="Unable to load users"
          message="Failed to connect to the user management directory."
          onRetry={() => fetchUsers(debouncedSearch, roleFilter)}
        />
      ) : users.length === 0 ? (
        hasActiveFilters ? (
          <StateBlock
            variant="no-results"
            title="No matching users found"
            message="No users match the specified search or role filter criteria."
            onClearFilters={handleClearFilters}
          />
        ) : (
          <StateBlock
            variant="empty"
            title="No users found"
            message="No user accounts are registered in TokTickIT."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
              >
                + Create User
              </button>
            }
          />
        )
      ) : (
        <div className="card border shadow-sm overflow-hidden">
          <div className="table-responsive">
            <table
              className="table table-hover align-middle mb-0"
              data-testid="users-table"
            >
              <thead className="table-light">
                <tr>
                  <th scope="col" className="ps-3">
                    Full Name
                  </th>
                  <th scope="col">Email Address</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end pe-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} data-testid={`user-row-${u.id}`}>
                    <td className="ps-3 fw-semibold">{u.name}</td>
                    <td className="text-muted">{u.email}</td>
                    <td>
                      <Badge value={u.role} />
                    </td>
                    <td>
                      <Badge value={u.isActive ? "ACTIVE" : "INACTIVE"} />
                    </td>
                    <td className="text-end pe-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleOpenEdit(u)}
                        data-testid={`btn-edit-user-${u.id}`}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-white border-top py-2 px-3 text-muted small">
            Showing {users.length} {users.length === 1 ? "user" : "users"}
          </div>
        </div>
      )}

      {/* Slide-in Drawer / Modal */}
      <UserEditDrawer
        isOpen={isDrawerOpen}
        user={selectedUser}
        currentAdminId={currentAdmin?.id}
        activeAdminCount={activeAdminCount}
        onClose={() => setIsDrawerOpen(false)}
        onSaved={handleUserSaved}
      />
    </div>
  );
}

export default UserManagement;
