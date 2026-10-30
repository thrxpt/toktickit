import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import RequesterTicketDetail from "../../src/pages/RequesterTicketDetail";
import StaffTicketDetail from "../../src/pages/staff/StaffTicketDetail";

const user = { id: 2, name: "Michael Brown", role: "IT_STAFF" };
vi.mock("../../src/auth/useAuth", () => ({ useAuth: () => ({ user }) }));
vi.mock("../../src/auth/AuthContext", () => ({ useAuth: () => ({ user }) }));
const ticket = {
  id: 42, version: 0, ticketNumber: "TKT-2026-000042", summary: "Concurrent editing",
  description: "Keep the pending choice and comment.", status: "OPEN", itPriority: "MEDIUM",
  requestedPriority: "MEDIUM", requester: { id: 1, name: "Jennifer", email: "jennifer@example.com" },
  category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Laptop" },
  ticketOwner: null, resolvedByRequester: false, attachments: [], publicCommentsCount: 0,
  internalNotesCount: 0, createdAt: "2026-10-29T10:00:00Z", updatedAt: "2026-10-29T10:00:00Z",
};
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("UI-09 — conflict recovery (AC-20, FR-20)", () => {
  it("preserves an unsent comment and priority choice across conflict and reload, then retries at the latest version", async () => {
    let version = 0;
    const writes: object[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith("/actions")) return response([]);
      if (input.endsWith("/assignees") || input.endsWith("/comments")) return response([]);
      if (init?.method === "PATCH") {
        writes.push(JSON.parse(init.body as string));
        if (writes.length === 1) {
          version = 1;
          return response({ error: { code: "STALE_UPDATE" } }, 409);
        }
        return response({ itPriority: "HIGH", ticketVersion: 2 });
      }
      return response({ ...ticket, version });
    }));
    render(<MemoryRouter initialEntries={["/staff/tickets/42"]}><Routes>
      <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
    </Routes></MemoryRouter>);
    await screen.findByText(ticket.ticketNumber);
    fireEvent.click(screen.getByRole("tab", { name: /public comments/i }));
    const comment = screen.getByRole("textbox");
    fireEvent.change(comment, { target: { value: "Unsent troubleshooting details" } });
    fireEvent.change(screen.getByLabelText("IT Priority"), { target: { value: "HIGH" } });
    await screen.findByText(/someone else updated this ticket/i);
    expect(writes).toEqual([{ itPriority: "HIGH", expectedVersion: 0 }]);
    expect(comment).toHaveValue("Unsent troubleshooting details");
    fireEvent.click(screen.getByRole("button", { name: "Reload ticket" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry change" })).toBeEnabled());
    expect(screen.getByRole("textbox")).toHaveValue("Unsent troubleshooting details");
    expect(screen.getByText(/pending IT Priority: High/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry change" }));
    await waitFor(() => expect(writes).toEqual([
      { itPriority: "HIGH", expectedVersion: 0 }, { itPriority: "HIGH", expectedVersion: 1 },
    ]));
    await screen.findByText("IT Priority updated.");
  });
});


describe("UI-09 — Requester resolution indication (AC-08, AC-20, FR-06)", () => {
  it("reloads after a stale indication without losing comment text, then submits the refreshed version", async () => {
    let version = 0;
    const writes: object[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith("/actions")) return response([]);
      if (input.endsWith("/comments")) return response([]);
      if (input.endsWith("/resolve-indication") && init?.method === "POST") {
        writes.push(JSON.parse(init.body as string));
        if (writes.length === 1) {
          version = 1;
          return response({ error: { code: "STALE_UPDATE" } }, 409);
        }
        return response({ resolvedByRequester: true, ticketVersion: 2 });
      }
      return response({ ...ticket, version, attachments: { active: [], removed: [] } });
    }));
    render(<MemoryRouter initialEntries={["/tickets/42"]}><Routes>
      <Route path="/tickets/:id" element={<RequesterTicketDetail />} />
    </Routes></MemoryRouter>);
    await screen.findByText(ticket.ticketNumber);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "My unsent comment" } });
    fireEvent.click(screen.getByRole("button", { name: "Problem Appears Resolved" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Problem Resolved" }));
    await screen.findByText(/someone else updated this ticket/i);
    expect(writes).toEqual([{ expectedVersion: 0 }]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reload ticket" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Problem Appears Resolved" })).toBeEnabled());
    expect(screen.getByRole("textbox")).toHaveValue("My unsent comment");
    fireEvent.click(screen.getByRole("button", { name: "Problem Appears Resolved" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Problem Resolved" }));
    await screen.findByText(/you indicated this problem appears resolved/i);
    expect(writes).toEqual([{ expectedVersion: 0 }, { expectedVersion: 1 }]);
  });
});

describe("UI-09 — Staff mutation versions (AC-08, AC-20, FR-06)", () => {
  it.each([
    { field: "owner", label: "Ticket Owner", value: "2", pending: "Pending Ticket Owner: Michael Brown", payload: { ownerId: 2 }, result: { ticketOwnerId: 2, status: "OPEN" } },
    { field: "status", label: "Current Status", value: "IN_PROGRESS", pending: "Pending Current Status: In Progress", payload: { status: "IN_PROGRESS" }, result: { status: "IN_PROGRESS" } },
  ])("keeps a $field choice recoverable and retries after reload", async ({ label, value, pending, payload, result }) => {
    let version = 0;
    const writes: object[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith("/actions")) return response([]);
      if (input.endsWith("/assignees")) return response([{ ...user }]);
      if (init?.method === "PATCH") {
        writes.push(JSON.parse(init.body as string));
        if (writes.length === 1) {
          version = 1;
          return response({ error: { code: "STALE_UPDATE" } }, 409);
        }
        return response({ ...result, ticketVersion: 2 });
      }
      return response({ ...ticket, version });
    }));
    render(<MemoryRouter initialEntries={["/staff/tickets/42"]}><Routes>
      <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
    </Routes></MemoryRouter>);
    await screen.findByText(ticket.ticketNumber);
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    await screen.findByText(/someone else updated this ticket/i);
    expect(screen.getByText(pending)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry change" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reload ticket" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry change" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Retry change" }));
    await waitFor(() => expect(writes).toEqual([
      { ...payload, expectedVersion: 0 }, { ...payload, expectedVersion: 1 },
    ]));
    await waitFor(() => expect(screen.queryByText(pending)).not.toBeInTheDocument());
  });

  it("uses the returned ticketVersion for the next mutation without requiring a reload", async () => {
    const writes: object[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith("/actions")) return response([]);
      if (input.endsWith("/assignees")) return response([]);
      if (init?.method === "PATCH") {
        const payload = JSON.parse(init.body as string);
        writes.push(payload);
        return response({ ...payload, ticketVersion: writes.length });
      }
      return response(ticket);
    }));
    render(<MemoryRouter initialEntries={["/staff/tickets/42"]}><Routes>
      <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
    </Routes></MemoryRouter>);
    await screen.findByText(ticket.ticketNumber);
    fireEvent.change(screen.getByLabelText("IT Priority"), { target: { value: "HIGH" } });
    await screen.findByText("IT Priority updated.");
    fireEvent.change(screen.getByLabelText("Current Status"), { target: { value: "IN_PROGRESS" } });
    await screen.findByText("Ticket status updated.");
    expect(writes).toEqual([
      { itPriority: "HIGH", expectedVersion: 0 }, { status: "IN_PROGRESS", expectedVersion: 1 },
    ]);
  });
});
