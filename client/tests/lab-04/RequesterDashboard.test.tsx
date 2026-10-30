import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dashboard from "../../src/pages/Dashboard";
import MyTickets from "../../src/pages/MyTickets";
const auth = vi.hoisted(() => ({ user: { id: 1, name: "Jennifer", role: "REQUESTER" } as { id: number; name: string; role: string } | null }));
vi.mock("../../src/auth/AuthContext", () => ({ useAuth: () => auth }));
const response = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;
afterEach(() => {
  vi.unstubAllGlobals();
  auth.user = { id: 1, name: "Jennifer", role: "REQUESTER" };
});
describe("UI-02, UI-11 — AC-12, AC-15, AC-16", () => {
  it("shows zero cards, empty lists and Create Ticket, and opens the grouped list", async () => {
    const fetch = vi.fn(async (input: string) => {
      if (input.includes("/dashboard/"))
        return response({
          openTickets: 0,
          waitingForRequester: 0,
          recentlyUpdated: [],
          recentlyResolved: [],
        });
      if (input.includes("/categories")) return response([]);
      return response({
        data: [],
        meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
      });
    });
    vi.stubGlobal("fetch", fetch);
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tickets" element={<MyTickets />} />
        </Routes>
      </MemoryRouter>,
    );
    const open = await screen.findByRole("link", {
      name: "Open Tickets, 0, view list",
    });
    expect(open).toHaveAttribute("href", "/tickets?statusGroup=open");
    expect(
      screen.getByRole("link", { name: "Waiting for You, 0, view list" }),
    ).toHaveAttribute("href", "/tickets?status=WAITING_FOR_REQUESTER");
    expect(
      screen.getAllByText(
        "No Tickets yet. Create one when something needs IT.",
      ),
    ).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Create Ticket" })).toHaveAttribute(
      "href",
      "/tickets/new",
    );
    fireEvent.click(open);
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(([url]) => url.includes("statusGroup=open")),
      ).toBe(true),
    );
    fireEvent.change(screen.getAllByLabelText("Filter by status")[0], {
      target: { value: "NEW" },
    });
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([url]) => url.includes("status=NEW") && !url.includes("statusGroup"),
        ),
      ).toBe(true),
    );
  });
});

it("UI-11 — retains group and recent ordering on pagination and switches groups without a conflicting status", async () => {
  const fetch = vi.fn(async (input: string) =>
    response(
      input.includes("categories")
        ? []
        : {
            data: [
              {
                id: 12,
                version: 0,
                ticketNumber: "TKT-2026-000012",
                summary: "Resolved laptop",
                status: "RESOLVED",
                requestedPriority: "LOW",
                category: { id: 1, name: "Hardware" },
                relatedSystem: { id: 1, name: "Laptop" },
                createdAt: "2026-10-30T12:00:00Z",
                updatedAt: "2026-10-31T12:00:00Z",
              },
            ],
            meta: { page: 1, pageSize: 10, totalItems: 21, totalPages: 3 },
          },
    ),
  );
  vi.stubGlobal("fetch", fetch);
  render(
    <MemoryRouter
      initialEntries={[
        "/tickets?statusGroup=resolved&sort=updatedAt&order=desc",
      ]}
    >
      <MyTickets />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(
      fetch.mock.calls.some(
        ([url]) =>
          url.includes("statusGroup=resolved") &&
          url.includes("sort=updatedAt") &&
          url.includes("order=desc"),
      ),
    ).toBe(true),
  );
  fireEvent.click(screen.getAllByRole("button", { name: "Next page" })[0]);
  await waitFor(() => {
    const url = fetch.mock.calls.at(-1)?.[0] || "";
    expect(url).toContain("page=2");
    expect(url).toContain("statusGroup=resolved");
    expect(url).toContain("sort=updatedAt");
    expect(url).toContain("order=desc");
  });
  const status = screen.getAllByLabelText("Filter by status")[0];
  fireEvent.change(status, { target: { value: "NEW" } });
  await waitFor(() =>
    expect(fetch.mock.calls.at(-1)?.[0]).toContain("status=NEW"),
  );
  fireEvent.change(status, { target: { value: "open" } });
  await waitFor(() =>
    expect(fetch.mock.calls.at(-1)?.[0]).toContain("statusGroup=open"),
  );
  expect(fetch.mock.calls.at(-1)?.[0]).not.toContain("status=NEW");
});

it("UI-10 — requires a session even when a browser retains Development Requester storage", async () => {
  auth.user = null;
  localStorage.setItem("toktickit_requester_id", "1");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<MemoryRouter initialEntries={["/dashboard"]}><Routes><Route path="/dashboard" element={<Dashboard />} /><Route path="/login" element={<h1>Sign In</h1>} /></Routes></MemoryRouter>);
  expect(await screen.findByRole("heading", { name: "Sign In" })).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  localStorage.clear();
});
