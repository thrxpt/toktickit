import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import StaffTicketDetail from "../../src/pages/staff/StaffTicketDetail";
import type { AuthenticatedUser } from "../../src/types/auth";
import type { StaffTicketDetailDto } from "../../src/types/ticket";

const mockStaffUser: AuthenticatedUser = {
  id: 2,
  name: "Michael Brown",
  email: "michael.brown@toktickit.com",
  role: "IT_STAFF",
  mustChangePassword: false,
};

vi.mock("../../src/auth/useAuth", () => ({
  useAuth: () => ({
    user: mockStaffUser,
    loading: false,
    logout: vi.fn(),
    refreshUser: vi.fn(),
    isLegacyTest: false,
  }),
}));

const mockAssignees = [
  { id: 2, name: "Michael Brown", role: "IT_STAFF" },
  { id: 3, name: "Sarah Johnson", role: "IT_STAFF" },
  { id: 4, name: "David Lee", role: "IT_STAFF" },
];

const mockNewUnassignedTicket: StaffTicketDetailDto = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  summary: "Laptop battery draining quickly",
  description: "Battery discharges from 100% to 0% in under 30 minutes.",
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 6, name: "Corporate Laptop" },
  requester: {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@example.ac.th",
  },
  ticketOwner: null,
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  status: "NEW",
  resolvedByRequester: false,
  createdAt: "2026-09-10T08:15:00.000Z",
  updatedAt: "2026-09-10T09:30:00.000Z",
  attachments: [
    {
      id: 1,
      originalFilename: "battery-report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 102400,
      uploadedBy: { id: 1, name: "Jennifer Anderson" },
      createdAt: "2026-09-10T08:16:00.000Z",
      contentUrl: "/api/attachments/1/content",
    },
  ],
  publicCommentsCount: 0,
  internalNotesCount: 0,
};

const mockOpenAssignedTicket: StaffTicketDetailDto = {
  id: 102,
  ticketNumber: "TKT-2026-000102",
  summary: "VPN access denied from home",
  description: "Cannot connect to corporate VPN after network upgrade.",
  category: { id: 4, name: "Network" },
  relatedSystem: { id: 5, name: "VPN Gateway" },
  requester: {
    id: 3,
    name: "Marcus Chen",
    email: "marcus.chen@example.ac.th",
  },
  ticketOwner: { id: 3, name: "Sarah Johnson" },
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  status: "OPEN",
  resolvedByRequester: true,
  createdAt: "2026-09-11T10:00:00.000Z",
  updatedAt: "2026-09-11T11:00:00.000Z",
  attachments: [],
  publicCommentsCount: 2,
  internalNotesCount: 1,
};

function renderComponent(ticketId = "101") {
  return render(
    <MemoryRouter initialEntries={[`/staff/tickets/${ticketId}`]}>
      <Routes>
        <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
        <Route path="/staff/queue" element={<div>Ticket Queue Screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("UI-07 — IT Staff clicks Claim on unassigned ticket (AC-11, BR-23)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders unassigned ticket and claims ownership, updating owner and auto-advancing NEW to OPEN", async () => {
    let currentTicket = { ...mockNewUnassignedTicket };

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/staff/assignees")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAssignees,
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/101/owner`) && init?.method === "PATCH") {
        const body = JSON.parse(init.body as string);
        expect(body.ownerId).toBe(mockStaffUser.id);
        currentTicket = {
          ...currentTicket,
          ticketOwner: { id: mockStaffUser.id, name: mockStaffUser.name },
          status: "OPEN",
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            ticketId: 101,
            ticketOwnerId: mockStaffUser.id,
            status: "OPEN",
            message: "Ticket ownership updated.",
          }),
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/101`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => currentTicket,
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    renderComponent("101");

    // Loading state
    expect(screen.getByText(/Loading ticket details/i)).toBeInTheDocument();

    // Data loaded
    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });

    // Check header and requester details
    expect(screen.getByText("Laptop battery draining quickly")).toBeInTheDocument();
    expect(screen.getAllByText(/Jennifer Anderson/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/jennifer.anderson@example.ac.th/i)).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();

    // Back to Queue button
    expect(screen.getByRole("link", { name: /Back to Queue/i })).toBeInTheDocument();

    // Claim button is present for unassigned ticket
    const claimButton = screen.getByRole("button", { name: /Claim/i });
    expect(claimButton).toBeInTheDocument();

    // Click Claim
    fireEvent.click(claimButton);

    // Verify claim PATCH triggered and status auto-advanced to OPEN
    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument();
      // Owner select now shows Michael Brown
      const ownerSelect = screen.getByRole("combobox", { name: /Ticket Owner/i }) as HTMLSelectElement;
      expect(ownerSelect.value).toBe(String(mockStaffUser.id));
    });
  });

  it("allows reassigning ownership via the owner select dropdown", async () => {
    let currentTicket = { ...mockOpenAssignedTicket };

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/staff/assignees")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAssignees,
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/102/owner`) && init?.method === "PATCH") {
        const body = JSON.parse(init.body as string);
        expect(body.ownerId).toBe(4); // David Lee
        currentTicket = {
          ...currentTicket,
          ticketOwner: { id: 4, name: "David Lee" },
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            ticketId: 102,
            ticketOwnerId: 4,
            status: "OPEN",
            message: "Ticket ownership updated.",
          }),
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/102`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => currentTicket,
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    renderComponent("102");

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000102")).toBeInTheDocument();
    });

    const ownerSelect = screen.getByRole("combobox", { name: /Ticket Owner/i }) as HTMLSelectElement;
    expect(ownerSelect.value).toBe("3"); // Sarah Johnson

    // Change owner to David Lee (id 4)
    fireEvent.change(ownerSelect, { target: { value: "4" } });

    await waitFor(() => {
      expect(ownerSelect.value).toBe("4");
    });
  });
});

describe("UI-08 — IT Staff modifies IT Priority and status dropdown (AC-12, AC-13)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("updates IT Priority to CRITICAL and displays save feedback", async () => {
    let currentTicket = { ...mockOpenAssignedTicket };

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/staff/assignees")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAssignees,
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/102/priority`) && init?.method === "PATCH") {
        const body = JSON.parse(init.body as string);
        expect(body.itPriority).toBe("CRITICAL");
        currentTicket = {
          ...currentTicket,
          itPriority: "CRITICAL",
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            ticketId: 102,
            itPriority: "CRITICAL",
            message: "IT Priority updated.",
          }),
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/102`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => currentTicket,
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    renderComponent("102");

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000102")).toBeInTheDocument();
    });

    const prioritySelect = screen.getByRole("combobox", { name: /IT Priority/i }) as HTMLSelectElement;
    expect(prioritySelect.value).toBe("MEDIUM");

    // Change to CRITICAL
    fireEvent.change(prioritySelect, { target: { value: "CRITICAL" } });

    await waitFor(() => {
      expect(prioritySelect.value).toBe("CRITICAL");
      expect(screen.getAllByText("Critical").length).toBeGreaterThan(0);
    });
  });

  it("offers only permitted status transitions according to BR-22", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/staff/assignees")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAssignees,
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/102`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockOpenAssignedTicket, // status: OPEN
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    renderComponent("102");

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000102")).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole("combobox", { name: /Current Status|Status/i }) as HTMLSelectElement;
    const optionValues = Array.from(statusSelect.options).map((opt) => opt.value);

    // OPEN permitted transitions: IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED (plus current OPEN)
    expect(optionValues).toContain("OPEN");
    expect(optionValues).toContain("IN_PROGRESS");
    expect(optionValues).toContain("WAITING_FOR_REQUESTER");
    expect(optionValues).toContain("RESOLVED");
    expect(optionValues).toContain("CANCELLED");

    // Forbidden from OPEN: NEW, CLOSED, REOPENED
    expect(optionValues).not.toContain("NEW");
    expect(optionValues).not.toContain("CLOSED");
    expect(optionValues).not.toContain("REOPENED");
  });

  it("executes status transition and updates status badge", async () => {
    let currentTicket = { ...mockOpenAssignedTicket };

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/staff/assignees")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAssignees,
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/102/status`) && init?.method === "PATCH") {
        const body = JSON.parse(init.body as string);
        expect(body.status).toBe("IN_PROGRESS");
        currentTicket = {
          ...currentTicket,
          status: "IN_PROGRESS",
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            ticketId: 102,
            status: "IN_PROGRESS",
            message: "Status updated successfully.",
          }),
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/102`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => currentTicket,
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    renderComponent("102");

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000102")).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole("combobox", { name: /Current Status|Status/i }) as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: "IN_PROGRESS" } });

    await waitFor(() => {
      expect(statusSelect.value).toBe("IN_PROGRESS");
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });
  });

  it("renders resolution indication banner when resolvedByRequester is true", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/staff/assignees")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAssignees,
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/102`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockOpenAssignedTicket, // resolvedByRequester: true
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    renderComponent("102");

    await waitFor(() => {
      expect(screen.getByText(/problem appears resolved/i)).toBeInTheDocument();
    });
  });

  it("renders attachments with download link", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/staff/assignees")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAssignees,
        } as Response);
      }

      if (url.includes(`/api/staff/tickets/101`)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockNewUnassignedTicket,
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    renderComponent("101");

    await waitFor(() => {
      expect(screen.getByText("battery-report.pdf")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Download/i })).toHaveAttribute(
        "href",
        "/api/attachments/1/content",
      );
    });
  });

  it("renders error state when ticket fails to load (e.g. 404)", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/staff/assignees")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAssignees,
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({
          error: { code: "TICKET_NOT_FOUND", message: "Ticket not found" },
        }),
      } as Response);
    });

    renderComponent("999");

    await waitFor(() => {
      expect(screen.getByText(/Ticket Not Found|not found/i)).toBeInTheDocument();
    });
  });
});
