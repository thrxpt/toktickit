import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import UserManagement from "../../src/pages/admin/UserManagement";
import type { AdminUserData } from "../../src/pages/admin/UserEditDrawer";
import type { AuthenticatedUser } from "../../src/types/auth";

const mockAdminUser: AuthenticatedUser = {
  id: 10,
  name: "Administrator",
  email: "admin@toktickit.com",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
};

vi.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => ({
    user: mockAdminUser,
    loading: false,
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("../../src/auth/useAuth", () => ({
  useAuth: () => ({
    user: mockAdminUser,
    loading: false,
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

const mockUsers: AdminUserData[] = [
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@example.ac.th",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Michael Brown",
    email: "michael.brown@toktickit.com",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-02T00:00:00.000Z",
  },
  {
    id: 3,
    name: "Daniel Okafor",
    email: "daniel.okafor@example.ac.th",
    role: "REQUESTER",
    isActive: false,
    mustChangePassword: false,
    createdAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: 10,
    name: "Administrator",
    email: "admin@toktickit.com",
    role: "ADMINISTRATOR",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-04T00:00:00.000Z",
  },
];

describe("UI-11 — Admin User Management displays user list and search filter (AC-16, FR-15)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders page title, '+ Create User' button, table headers, and user rows with role and status badges", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/admin/users")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockUsers,
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    // Initial loading indicator
    expect(screen.getByText("Loading users...")).toBeInTheDocument();

    // Data loaded
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "User Management" })).toBeInTheDocument();
    });

    expect(screen.getByTestId("btn-create-user")).toBeInTheDocument();

    // Table column headers
    expect(screen.getByRole("columnheader", { name: "Full Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Email Address" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();

    // User rows and contents
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("jennifer.anderson@example.ac.th")).toBeInTheDocument();
    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    expect(screen.getByText("michael.brown@toktickit.com")).toBeInTheDocument();
    expect(screen.getByText("Daniel Okafor")).toBeInTheDocument();
    expect(screen.getByText("daniel.okafor@example.ac.th")).toBeInTheDocument();

    // Role badges with semantic classes
    const requesterBadges = screen.getAllByText("Requester", { selector: "span.badge" });
    expect(requesterBadges[0]).toHaveClass("zen-badge-role-requester");

    const staffBadge = screen.getByText("IT Staff", { selector: "span.badge" });
    expect(staffBadge).toHaveClass("zen-badge-role-staff");

    const adminBadge = screen.getByText("Administrator", { selector: "span.badge" });
    expect(adminBadge).toHaveClass("zen-badge-role-admin");

    // Status badges (Active and Inactive)
    const activeBadges = screen.getAllByText("Active");
    expect(activeBadges[0]).toHaveClass("zen-badge-user-active");

    const inactiveBadge = screen.getByText("Inactive");
    expect(inactiveBadge).toHaveClass("zen-badge-user-inactive");
  });

  it("filters user list by search query and role filter", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("search=Michael")) {
        return Promise.resolve({
          ok: true,
          json: async () => [mockUsers[1]],
        } as Response);
      }
      if (url.includes("role=IT_STAFF")) {
        return Promise.resolve({
          ok: true,
          json: async () => [mockUsers[1]],
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockUsers,
      } as Response);
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    });

    // Type search
    const searchInput = screen.getByTestId("input-search-users");
    fireEvent.change(searchInput, { target: { value: "Michael" } });

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
      expect(screen.queryByText("Jennifer Anderson")).not.toBeInTheDocument();
    });

    // Clear search and filter by role
    fireEvent.change(searchInput, { target: { value: "" } });
    const roleSelect = screen.getByTestId("select-filter-role");
    fireEvent.change(roleSelect, { target: { value: "IT_STAFF" } });

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
      expect(screen.queryByText("Jennifer Anderson")).not.toBeInTheDocument();
    });
  });
});

describe("UI-12 — Admin user creation displays validation error on duplicate email (AC-17, BR-31)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens create user drawer and displays field-level error on duplicate email rejection", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";

      if (url.includes("/api/admin/users") && method === "GET") {
        return Promise.resolve({
          ok: true,
          json: async () => mockUsers,
        } as Response);
      }

      if (url === "/api/admin/users" && method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            error: {
              code: "DUPLICATE_EMAIL",
              message: "A user with this email address already exists.",
              fields: {
                email: "A user with this email address already exists.",
              },
            },
          }),
        } as Response);
      }

      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-create-user")).toBeInTheDocument();
    });

    // Click "+ Create User"
    fireEvent.click(screen.getByTestId("btn-create-user"));

    // Drawer should open in Create mode
    expect(screen.getByRole("heading", { name: "Create User" })).toBeInTheDocument();

    // Fill form fields
    fireEvent.change(screen.getByTestId("input-user-name"), {
      target: { value: "Duplicate User" },
    });
    fireEvent.change(screen.getByTestId("input-user-email"), {
      target: { value: "jennifer.anderson@example.ac.th" },
    });
    fireEvent.change(screen.getByTestId("input-user-initial-password"), {
      target: { value: "InitialPassword123!" },
    });

    // Submit form
    fireEvent.click(screen.getByTestId("btn-save-user"));

    // Verify duplicate email field error displays
    await waitFor(() => {
      expect(
        screen.getByText("A user with this email address already exists."),
      ).toBeInTheDocument();
    });
  });
});

describe("UI-13 — Admin edit user disables deactivation toggle on self & last admin (AC-18, AC-19)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disables active toggle and deactivate button on self with tooltip explanation when multiple active admins exist", async () => {
    const usersWithMultipleAdmins = [
      ...mockUsers,
      {
        id: 11,
        name: "Second Administrator",
        email: "second.admin@toktickit.com",
        role: "ADMINISTRATOR" as const,
        isActive: true,
        mustChangePassword: false,
        createdAt: "2026-09-05T00:00:00.000Z",
      },
    ];

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/admin/users")) {
        return Promise.resolve({
          ok: true,
          json: async () => usersWithMultipleAdmins,
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-10")).toBeInTheDocument();
    });

    // Edit self (user id 10, currentAdmin id 10)
    fireEvent.click(screen.getByTestId("btn-edit-user-10"));

    expect(screen.getByRole("heading", { name: "Edit User" })).toBeInTheDocument();

    // Active toggle switch is disabled
    const activeSwitch = screen.getByTestId("switch-user-active");
    expect(activeSwitch).toBeDisabled();

    // Deactivate button is disabled
    const deactButton = screen.getByTestId("btn-toggle-deactivate");
    expect(deactButton).toBeDisabled();

    // Tooltip message is displayed
    expect(
      screen.getByText(/You cannot deactivate your own account/i),
    ).toBeInTheDocument();
  });

  it("disables active toggle and role dropdown on sole active Administrator", async () => {
    // Only 1 admin in mockUsers
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/admin/users")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockUsers,
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-10")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-edit-user-10"));

    // Role dropdown is disabled
    const roleSelect = screen.getByTestId("select-user-role");
    expect(roleSelect).toBeDisabled();

    // Explanatory text is displayed
    expect(
      screen.getByText("Cannot deactivate or reassign the last active Administrator."),
    ).toBeInTheDocument();
  });
});

describe("UI-14 — Admin resets initial password from edit drawer (AC-20, BR-33)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens reset modal, captures new password, submits request, and displays success feedback", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";

      if (url.includes("/api/admin/users") && method === "GET") {
        return Promise.resolve({
          ok: true,
          json: async () => mockUsers,
        } as Response);
      }

      if (url === "/api/admin/users/1/reset-password" && method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message:
              "Initial password updated. User will be required to change password at next login.",
          }),
        } as Response);
      }

      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-1")).toBeInTheDocument();
    });

    // Edit Jennifer Anderson
    fireEvent.click(screen.getByTestId("btn-edit-user-1"));

    // Click "Reset Initial Password"
    const openResetBtn = screen.getByTestId("btn-open-reset-password");
    fireEvent.click(openResetBtn);

    // Modal dialog opens
    expect(screen.getByRole("heading", { name: "Reset Initial Password" })).toBeInTheDocument();

    // Fill new password
    const newPassInput = screen.getByTestId("input-new-initial-password");
    fireEvent.change(newPassInput, { target: { value: "NewTempPassword789!" } });

    // Submit modal
    const submitResetBtn = screen.getByTestId("btn-submit-reset-password");
    fireEvent.click(submitResetBtn);

    // Success message is displayed
    await waitFor(() => {
      expect(
        screen.getByText(
          "Initial password updated. User will be required to change password at next login.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("restores focus to trigger button when reset password modal is cancelled", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/admin/users")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockUsers,
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-edit-user-1"));

    const openResetBtn = screen.getByTestId("btn-open-reset-password");
    fireEvent.click(openResetBtn);

    expect(screen.getByRole("heading", { name: "Reset Initial Password" })).toBeInTheDocument();

    const cancelBtn = screen.getByTestId("btn-cancel-reset-modal");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("reset-password-modal")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(openResetBtn);
    });
  });
});
