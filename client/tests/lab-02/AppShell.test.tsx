import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../../src/App";
import { requester } from "../helpers/RequesterSession";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

function sessionFetch(authenticated: boolean) {
  globalThis.fetch = vi.fn(async (input) => {
    const url = String(input);
    if (url === "/api/auth/me") return new Response(JSON.stringify({ user: authenticated ? requester : null }), { status: authenticated ? 200 : 401 });
    if (url === "/api/auth/logout") {
      authenticated = false;
      return new Response("{}");
    }
    if (url.startsWith("/api/tickets")) return new Response(JSON.stringify({ data: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }));
    return new Response("[]");
  });
}

describe("UI-04–UI-07 — session-only identity replaces selector state (Lab 4 BR-30)", () => {
  it.each(["1", "5"])("requires login despite persisted Requester id %s", async (id) => {
    localStorage.setItem("toktickit_requester_id", id);
    sessionFetch(false);
    render(<MemoryRouter initialEntries={["/tickets"]}><App /></MemoryRouter>);
    await screen.findByRole("button", { name: "Sign In" });
    expect(screen.queryByRole("heading", { name: "My Tickets" })).not.toBeInTheDocument();
    expect(localStorage.getItem("toktickit_requester_id")).toBeNull();
  });

  it("restores session identity and removes protected Ticket state on logout", async () => {
    sessionFetch(true);
    render(<MemoryRouter initialEntries={["/tickets"]}><App /></MemoryRouter>);
    await screen.findByRole("heading", { name: "My Tickets" });
    expect(screen.getByText(requester.name)).toBeInTheDocument();
    expect(screen.queryByText("Change Requester")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "User profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await screen.findByRole("button", { name: "Sign In" });
    await waitFor(() => expect(screen.queryByRole("heading", { name: "My Tickets" })).not.toBeInTheDocument());
    expect(vi.mocked(fetch).mock.calls.every(([, init]) => !new Headers(init?.headers).has("X-Requester-Id"))).toBe(true);
  });
});

it("FR-19/FR-20 — keeps the session visible when Logout fails and offers a safe retry", async () => {
  sessionFetch(true);
  const original = globalThis.fetch;
  let failLogout = true;
  globalThis.fetch = vi.fn((input, init) => {
    if (String(input) === "/api/auth/logout" && failLogout) {
      failLogout = false;
      return Promise.reject(new TypeError("network internals"));
    }
    return original(input, init);
  });
  render(<MemoryRouter initialEntries={["/tickets"]}><App /></MemoryRouter>);
  await screen.findByRole("heading", { name: "My Tickets" });
  fireEvent.click(screen.getByRole("button", { name: "User profile" }));
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));
  await screen.findByText("Unable to sign out. Please try again.");
  expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
  expect(screen.queryByText(/network internals/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "User profile" }));
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));
  await screen.findByRole("button", { name: "Sign In" });
});
