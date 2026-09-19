import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import StaffTicketQueue from "../../src/pages/staff/StaffTicketQueue";
import App from "../../src/App";
import type { StaffQueueTicketItem, StaffQueueResponse } from "../../src/types/ticket";
import type { AuthenticatedUser } from "../../src/types/auth";

const mockStaffUser: AuthenticatedUser = {
  id: 2,
  name: "Michael Brown",
  email: "michael.brown@toktickit.com",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const mockTickets: StaffQueueTicketItem[] = [
  {
    id: 101,
    ticketNumber: "TKT-2026-000101",
    summary: "Wi-Fi connection drops in Building C",
    categoryName: "Network",
    requestedPriority: "HIGH",
    itPriority: "CRITICAL",
    status: "OPEN",
    ticketOwner: {
      id: 2,
      name: "Michael Brown",
    },
    requester: {
      id: 1,
      name: "Jennifer Anderson",
    },
    resolvedByRequester: false,
    createdAt: "2026-09-10T08:15:00.000Z",
    updatedAt: "2026-09-10T09:30:00.000Z",
  },
  {
    id: 102,
    ticketNumber: "TKT-2026-000102",
    summary: "Printer toner empty in Lab 3",
    categoryName: "Hardware",
    requestedPriority: "LOW",
    itPriority: "LOW",
    status: "NEW",
    ticketOwner: null,
    requester: {
      id: 3,
      name: "Marcus Chen",
    },
    resolvedByRequester: false,
    createdAt: "2026-09-11T10:00:00.000Z",
    updatedAt: "2026-09-11T10:00:00.000Z",
  },
];

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 4, name: "Network" },
];

describe("UI-06 — IT Staff Queue renders table, search filter, and pagination (AC-10, FR-09)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders page header, search input, filters toggle, and table columns", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/categories")) {
        return Promise.resolve({ ok: true, json: async () => mockCategories } as Response);
      }
      if (url.startsWith("/api/staff/tickets")) {
        const payload: StaffQueueResponse = {
          items: mockTickets,
          pagination: {
            page: 1,
            pageSize: 10,
            totalItems: 2,
            totalPages: 1,
          },
        };
        return Promise.resolve({ ok: true, json: async () => payload } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <StaffTicketQueue />
      </MemoryRouter>,
    );

    // Initial loading state
    expect(screen.getByText("Loading ticket queue…")).toBeInTheDocument();

    // Data loaded
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    });

    // Check search input and filters button
    expect(
      screen.getByRole("searchbox", { name: "Search by ticket number or summary" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();

    // Check table headers
    expect(screen.getByRole("columnheader", { name: /Ticket No\./ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Created Date/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Req. Priority" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /IT Priority/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Status/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Owner" })).toBeInTheDocument();

    // Check ticket row contents
    expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Wi-Fi connection drops in Building C").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Network").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Michael Brown").length).toBeGreaterThan(0);

    // Check unassigned ticket display
    expect(screen.getAllByText("TKT-2026-000102").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);

    // Check pagination count display
    expect(screen.getByText("Showing 1 to 2 of 2 tickets")).toBeInTheDocument();
  });

  it("submits search query and triggers API request with search parameter", async () => {
    let capturedUrl = "";
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/staff/tickets")) {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [mockTickets[0]],
            pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <StaffTicketQueue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByRole("searchbox", {
      name: "Search by ticket number or summary",
    });
    fireEvent.change(searchInput, { target: { value: "Building C" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(capturedUrl).toContain("search=Building+C");
    });
  });

  it("toggles filter drawer and displays active filter count badge", async () => {
    let capturedUrl = "";
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/categories")) {
        return Promise.resolve({ ok: true, json: async () => mockCategories } as Response);
      }
      if (url.startsWith("/api/staff/tickets")) {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: mockTickets,
            pagination: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <StaffTicketQueue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThan(0);
    });

    // Open filter drawer
    const filtersBtn = screen.getByRole("button", { name: "Filters" });
    fireEvent.click(filtersBtn);

    expect(screen.getByTestId("filter-drawer")).toBeInTheDocument();

    // Select category filter
    const categorySelect = screen.getByRole("combobox", { name: "Filter by category" });
    fireEvent.change(categorySelect, { target: { value: "4" } });

    await waitFor(() => {
      expect(capturedUrl).toContain("category=4");
    });

    // Active filter badge shows count 1
    expect(screen.getByLabelText("1 active filters")).toBeInTheDocument();

    // Select status filter
    const statusSelect = screen.getByRole("combobox", { name: "Filter by status" });
    fireEvent.change(statusSelect, { target: { value: "OPEN" } });

    await waitFor(() => {
      expect(capturedUrl).toContain("status=OPEN");
    });

    // Active filter badge shows count 2
    expect(screen.getByLabelText("2 active filters")).toBeInTheDocument();

    // Select owner filter: unassigned
    const ownerSelect = screen.getByRole("combobox", { name: "Filter by owner" });
    fireEvent.change(ownerSelect, { target: { value: "unassigned" } });

    await waitFor(() => {
      expect(capturedUrl).toContain("owner=unassigned");
    });

    // Active filter badge shows count 3
    expect(screen.getByLabelText("3 active filters")).toBeInTheDocument();

    // Click "Clear Filters" in drawer
    const clearFiltersBtn = screen.getByRole("button", { name: "Clear Filters" });
    fireEvent.click(clearFiltersBtn);

    await waitFor(() => {
      expect(capturedUrl).not.toContain("category=");
      expect(capturedUrl).not.toContain("status=");
      expect(capturedUrl).not.toContain("owner=");
    });
  });

  it("updates sort parameters when column headers are clicked", async () => {
    let capturedUrl = "";
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/staff/tickets")) {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: mockTickets,
            pagination: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <StaffTicketQueue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThan(0);
    });

    // Click Ticket No. header
    const ticketNoHeader = screen.getByRole("columnheader", { name: /Ticket No\./ });
    fireEvent.click(ticketNoHeader);

    await waitFor(() => {
      expect(capturedUrl).toContain("sortBy=ticketNumber");
      expect(capturedUrl).toContain("sortOrder=asc");
    });

    // Click again to toggle order to desc
    fireEvent.click(screen.getByRole("columnheader", { name: /Ticket No\./ }));

    await waitFor(() => {
      expect(capturedUrl).toContain("sortBy=ticketNumber");
      expect(capturedUrl).toContain("sortOrder=desc");
    });
  });

  it("handles pagination changes and page size selector", async () => {
    let capturedUrl = "";
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/staff/tickets")) {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: mockTickets,
            pagination: { page: 1, pageSize: 10, totalItems: 25, totalPages: 3 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <StaffTicketQueue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Showing 1 to 10 of 25 tickets")).toBeInTheDocument();
    });

    // Click page 2
    const page2Button = screen.getByRole("button", { name: "Page 2" });
    fireEvent.click(page2Button);

    await waitFor(() => {
      expect(capturedUrl).toContain("page=2");
    });

    // Change page size to 20
    const pageSizeSelect = screen.getByRole("combobox", { name: "Page size" });
    fireEvent.change(pageSizeSelect, { target: { value: "20" } });

    await waitFor(() => {
      expect(capturedUrl).toContain("pageSize=20");
    });
  });

  it("renders empty state when no tickets exist in the system", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/staff/tickets")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [],
            pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <StaffTicketQueue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Ticket queue is empty")).toBeInTheDocument();
      expect(
        screen.getByText("There are currently no tickets in the system."),
      ).toBeInTheDocument();
    });
  });

  it("renders no-results state with 'Clear Filters' when search or filters match nothing (BR-31)", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/staff/tickets")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [],
            pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/staff/queue?search=nonexistent"]}>
        <StaffTicketQueue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("No matching tickets")).toBeInTheDocument();
      expect(
        screen.getByText("No tickets matched your search or filter criteria."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Clear Filters" }),
      ).toBeInTheDocument();
    });
  });

  it("renders error state when API request fails and retries on click", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/staff/tickets")) {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ ok: false, status: 500 } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: mockTickets,
            pagination: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/staff/queue"]}>
        <StaffTicketQueue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Unable to load ticket queue")).toBeInTheDocument();
    });

    // Click Retry
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThan(0);
    });
  });

  it("redirects /queue to /staff/queue in AppRoutes", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ user: mockStaffUser }),
        } as Response);
      }
      if (url.startsWith("/api/staff/tickets")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [],
            pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/queue"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    });
  });
});
