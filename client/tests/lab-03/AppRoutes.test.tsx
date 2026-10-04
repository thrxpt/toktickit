import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../src/App";
import type { AuthenticatedUser } from "../../src/types/auth";

describe("AppRoutes — Lab 3 routing, authentication guards, and role access (FR-02, FR-06, BR-02, AC-02, AC-03)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated visitor from /tickets to /login (FR-02, W1)", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({
            error: { code: "UNAUTHENTICATED", message: "Authentication required." },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/tickets"]}>
        <App />
      </MemoryRouter>,
    );

    // Should redirect to /login and render the Login card
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "TokTickIT" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    });
  });

  it("redirects authenticated user with mustChangePassword: true from /tickets to /change-password (BR-02, AC-02, W2)", async () => {
    const user: AuthenticatedUser = {
      id: 1,
      name: "Marcus Chen",
      email: "marcus.chen@example.ac.th",
      role: "REQUESTER",
      mustChangePassword: true,
    };

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ user }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/tickets"]}>
        <App />
      </MemoryRouter>,
    );

    // Should divert to /change-password
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Change Your Password" })).toBeInTheDocument();
    });
  });

  it("allows authenticated Requester directly to /tickets without selector bounce (AC-03, FR-06)", async () => {
    const user: AuthenticatedUser = {
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.ac.th",
      role: "REQUESTER",
      mustChangePassword: false,
    };

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ user }),
        } as Response);
      }
      if (url.startsWith("/api/tickets")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [],
            meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/tickets"]}>
        <App />
      </MemoryRouter>,
    );

    // Should render My Tickets directly with user name in header
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
      expect(screen.getByText("Requester")).toBeInTheDocument();
    });
  });

  it("renders Access Denied when IT Staff attempts to access /tickets (BR-14, BR-15, FR-20)", async () => {
    const user: AuthenticatedUser = {
      id: 2,
      name: "Michael Brown",
      email: "michael.brown@toktickit.com",
      role: "IT_STAFF",
      mustChangePassword: false,
    };

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ user }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/tickets"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.getByText("You do not have permission to access this page.")).toBeInTheDocument();
    });
  });

  it("clears localStorage and session state upon logout (AC-05, BR-11, B4)", async () => {
    localStorage.setItem("toktickit_requester_id", "1");

    const user: AuthenticatedUser = {
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@example.ac.th",
      role: "REQUESTER",
      mustChangePassword: false,
    };

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ user }),
        } as Response);
      }
      if (url === "/api/auth/logout") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ message: "Logged out successfully." }),
        } as Response);
      }
      if (url.startsWith("/api/tickets")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [],
            meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    render(
      <MemoryRouter initialEntries={["/tickets"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    });

    // Open profile dropdown and click Logout
    const profileBtn = screen.getByLabelText("User profile");
    fireEvent.click(profileBtn);

    const logoutBtn = screen.getByRole("button", { name: "Logout" });
    fireEvent.click(logoutBtn);

    // After logout, redirects to /login and localStorage is purged
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "TokTickIT" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
      expect(localStorage.getItem("toktickit_requester_id")).toBeNull();
    });
  });
});
