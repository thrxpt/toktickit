import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dashboard from "../../src/pages/Dashboard";
import UserManagement from "../../src/pages/admin/UserManagement";
import AppShell from "../../src/components/AppShell";
const { user } = vi.hoisted(() => ({
  user: {
    id: 2,
    name: "Michael",
    email: "staff@example.com",
    role: "IT_STAFF",
    mustChangePassword: false,
  },
}));
vi.mock("../../src/auth/AuthContext", () => ({ useAuth: () => ({ user }) }));
const metrics = {
  unassigned: 3,
  ownedByMe: 2,
  byStatus: {
    NEW: 3,
    OPEN: 0,
    IN_PROGRESS: 0,
    WAITING_FOR_REQUESTER: 0,
    RESOLVED: 0,
    CLOSED: 0,
    REOPENED: 0,
    CANCELLED: 0,
  },
  byPriority: { LOW: 1, MEDIUM: 2, HIGH: 0, CRITICAL: 0 },
  recentlyUpdated: [],
};
const response = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;
afterEach(() => {
  vi.unstubAllGlobals();
  user.role = "IT_STAFF";
});
describe("UI-01, UI-03, UI-10, UI-12 — AC-13, AC-14, AC-15, AC-17", () => {
  it("renders every status/priority including zeros and the documented drill-downs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(metrics)),
    );
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("link", { name: "Unassigned, 3, view list" }),
    ).toHaveAttribute("href", "/staff/queue?owner=unassigned");
    for (const status of Object.keys(metrics.byStatus))
      expect(
        screen.getByRole("link", {
          name: new RegExp(`^${status.replaceAll("_", " ")},`),
        }),
      ).toHaveAttribute("href", `/staff/queue?status=${status}`);
    for (const priority of Object.keys(metrics.byPriority))
      expect(
        screen.getByRole("link", { name: new RegExp(`^${priority},`) }),
      ).toHaveAttribute("href", `/staff/queue?priority=${priority}`);
  });
  it("offers retry on safe failure and no retry on forbidden", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({}, 500))
      .mockResolvedValueOnce(response({}, 403));
    vi.stubGlobal("fetch", fetch);
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("status", { name: "Loading dashboard" }),
    ).toHaveAttribute("aria-busy", "true");
    fireEvent.click(await screen.findByRole("button", { name: "Try Again" }));
    await screen.findByText("You do not have access to this dashboard.");
    expect(
      screen.queryByRole("button", { name: "Try Again" }),
    ).not.toBeInTheDocument();
  });
  it("keeps staff metrics visible when Administrator account counts fail", async () => {
    user.role = "ADMINISTRATOR";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(metrics)),
    );
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    await screen.findByText("Accounts unavailable");
    expect(
      screen.getByRole("link", { name: "Unassigned, 3, view list" }),
    ).toBeInTheDocument();
  });
  it("links account roles to URL-synchronized User Management and Total clears the filter", async () => {
    user.role = "ADMINISTRATOR";
    const fetch = vi.fn(async (input: string) =>
      input.includes("dashboard")
        ? response({
            ...metrics,
            userCounts: {
              total: 9,
              active: 8,
              inactive: 1,
              byRole: { REQUESTER: 6, IT_STAFF: 2, ADMINISTRATOR: 1 },
            },
          })
        : response([]),
    );
    vi.stubGlobal("fetch", fetch);
    function Users() {
      const navigate = useNavigate();
      return (
        <>
          <button onClick={() => navigate("/admin/users?role=IT_STAFF")}>
            Staff role
          </button>
          <button onClick={() => navigate("/admin/users")}>
            Total accounts
          </button>
          <UserManagement />
        </>
      );
    }
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin/users" element={<Users />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("link", { name: "Total, 9, view list" }),
    ).toHaveAttribute("href", "/admin/users");
    expect(
      screen.queryByRole("link", { name: /^Active,/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /^Inactive,/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("link", { name: "REQUESTER, 6, view list" }),
    );
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(([url]) =>
          url.includes("/admin/users?role=REQUESTER"),
        ),
      ).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: "Staff role" }));
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(([url]) =>
          url.includes("/admin/users?role=IT_STAFF"),
        ),
      ).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: "Total accounts" }));
    await waitFor(() =>
      expect(fetch.mock.calls.at(-1)?.[0]).toBe("/api/admin/users"),
    );
  });
  it.each(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"])(
    "marks Dashboard active for %s",
    (role) => {
      user.role = role;
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppShell />
        </MemoryRouter>,
      );
      expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    },
  );
});
