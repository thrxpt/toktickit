import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RequesterTicketDetail from "../../src/pages/RequesterTicketDetail";
import type { AuthenticatedUser } from "../../src/types/auth";
import type { TicketDetail } from "../../src/types/ticket";

const mockRequesterUser: AuthenticatedUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.ac.th",
  role: "REQUESTER",
  mustChangePassword: false,
};

vi.mock("../../src/auth/useAuth", () => ({
  useAuth: () => ({
    user: mockRequesterUser,
    loading: false,
    logout: vi.fn(),
    refreshUser: vi.fn(),
    isLegacyTest: false,
  }),
}));

const mockUnresolvedTicket: TicketDetail = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  summary: "Laptop battery drains quickly",
  description: "My laptop battery is draining fast even in sleep mode.",
  requestedPriority: "MEDIUM",
  status: "OPEN",
  resolvedByRequester: false,
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 6, name: "Corporate Laptop" },
  requester: { id: 1, name: "Jennifer Anderson" },
  createdAt: "2026-09-10T08:15:00.000Z",
  updatedAt: "2026-09-10T09:30:00.000Z",
  attachments: {
    active: [],
    removed: [],
  },
};

const mockResolvedTicket: TicketDetail = {
  ...mockUnresolvedTicket,
  resolvedByRequester: true,
};

function renderComponent(ticketId = "42") {
  return render(
    <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
      <Routes>
        <Route path="/tickets/:id" element={<RequesterTicketDetail />} />
        <Route path="/tickets" element={<div>My Tickets Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("UI-05 — Requester clicks Problem Appears Resolved (AC-09, FR-08)", () => {
  beforeEach(() => {
    localStorage.setItem("toktickit_requester_id", "1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("shows confirm dialog, sends resolution indication, displays success alert, and disables button", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/tickets/42/comments")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        } as Response);
      }

      if (url.includes("/api/tickets/42/resolve-indication") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 42,
            resolvedByRequester: true,
            message:
              "Problem indicated as resolved. IT Staff will review and formally close the ticket.",
          }),
        } as Response);
      }

      if (url.includes("/api/tickets/42")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockUnresolvedTicket,
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    renderComponent("42");

    // Wait for ticket to load
    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000042")).toBeInTheDocument();
    });

    // "Problem Appears Resolved" button is present and enabled
    const resolveBtn = screen.getByRole("button", {
      name: /problem appears resolved/i,
    });
    expect(resolveBtn).toBeEnabled();

    // Click button to open confirmation dialog
    fireEvent.click(resolveBtn);

    // Confirmation dialog appears (AC-09, UI-05)
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /confirm problem resolution/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/are you sure this problem appears resolved/i),
    ).toBeInTheDocument();

    // Confirm in dialog
    const confirmBtn = screen.getByRole("button", {
      name: /yes, problem resolved/i,
    });
    fireEvent.click(confirmBtn);

    // Dialog closes, resolution banner displays, and button is disabled
    await waitFor(() => {
      expect(
        screen.getByText(
          /you indicated this problem appears resolved\. it staff will review and formally close the ticket\./i,
        ),
      ).toBeInTheDocument();
    });

    expect(resolveBtn).toBeDisabled();
  });

  it("renders disabled button and persistent banner when ticket was already indicated resolved", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/tickets/42/comments")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        } as Response);
      }

      if (url.includes("/api/tickets/42")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResolvedTicket,
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    renderComponent("42");

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000042")).toBeInTheDocument();
    });

    // Banner is visible on load
    expect(
      screen.getByText(
        /you indicated this problem appears resolved\. it staff will review and formally close the ticket\./i,
      ),
    ).toBeInTheDocument();

    // Button is disabled
    const resolveBtn = screen.getByRole("button", {
      name: /problem appears resolved/i,
    });
    expect(resolveBtn).toBeDisabled();
  });
});
