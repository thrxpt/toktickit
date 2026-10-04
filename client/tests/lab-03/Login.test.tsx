import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../src/auth/AuthContext";
import Login from "../../src/pages/Login";

function renderLogin(initialEntry = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/tickets" element={<div>My Tickets Screen</div>} />
          <Route path="/staff/queue" element={<div>Staff Queue Screen</div>} />
          <Route
            path="/change-password"
            element={<div>Change Password Screen</div>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("UI-01 — Login form submission, busy state, and inactive account alert (AC-01, AC-04)", () => {
  beforeEach(() => {
    localStorage.clear();
    // Default mock: unauthenticated session
    globalThis.fetch = vi
      .fn()
      .mockImplementation((input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/auth/me") {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ error: { code: "UNAUTHENTICATED" } }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validates empty fields and blocks submission before network request", async () => {
    renderLogin();

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();

    // No POST /api/auth/login was sent
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      "/api/auth/login",
      expect.anything(),
    );
  });

  it("toggles password visibility between password and text", async () => {
    renderLogin();

    const passwordInput = screen.getByLabelText(/^Password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByRole("button", { name: /Show password/i });
    fireEvent.click(toggleBtn);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: /Hide password/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("shows in-flight spinner and disabled state during submission", async () => {
    let resolveLogin: (res: Response) => void;
    const loginPromise = new Promise<Response>((resolve) => {
      resolveLogin = resolve;
    });

    globalThis.fetch = vi
      .fn()
      .mockImplementation((input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/auth/me") {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({}),
          } as Response);
        }
        if (url === "/api/auth/login") {
          return loginPromise;
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      });

    renderLogin();

    const emailInput = screen.getByLabelText(/^Email/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.click(submitBtn);

    // Button shows busy indicator
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/Signing In…/i)).toBeInTheDocument();

    // Resolve login
    resolveLogin!({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      }),
    } as Response);

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it("renders inline alert for invalid credentials and preserves email input", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/auth/me") {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({}),
          } as Response);
        }
        if (url === "/api/auth/login") {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({
              error: {
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password.",
              },
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      });

    renderLogin();

    const emailInput = screen.getByLabelText(/^Email/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "BadPassword!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Invalid email or password.");
    });

    // Email value is preserved
    expect(emailInput).toHaveValue("wrong@example.com");
    // Submit button is re-enabled
    expect(submitBtn).not.toBeDisabled();
  });

  it("renders inline alert for inactive/deactivated accounts (AC-04)", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/auth/me") {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({}),
          } as Response);
        }
        if (url === "/api/auth/login") {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({
              error: {
                code: "ACCOUNT_INACTIVE",
                message:
                  "Account is deactivated. Please contact an administrator.",
              },
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      });

    renderLogin();

    const emailInput = screen.getByLabelText(/^Email/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: "inactive@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(
        "Account is deactivated. Please contact an administrator.",
      );
    });
  });

  it("redirects to role default view upon successful login", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/auth/me") {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({}),
          } as Response);
        }
        if (url === "/api/auth/login") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              user: {
                id: 1,
                name: "Jennifer Anderson",
                email: "jennifer.anderson@example.ac.th",
                role: "REQUESTER",
                mustChangePassword: false,
              },
              token: "mock-jwt-token",
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      });

    renderLogin();

    const emailInput = screen.getByLabelText(/^Email/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });

    fireEvent.change(emailInput, {
      target: { value: "jennifer.anderson@example.ac.th" },
    });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("My Tickets Screen")).toBeInTheDocument();
    });
  });

  it("redirects to /change-password if user must change password (AC-02)", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((input: string | URL | Request) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/auth/me") {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({}),
          } as Response);
        }
        if (url === "/api/auth/login") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              user: {
                id: 2,
                name: "Somchai Prasert",
                email: "somchai.prasert@example.ac.th",
                role: "REQUESTER",
                mustChangePassword: true,
              },
              token: "mock-jwt-token",
            }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      });

    renderLogin();

    const emailInput = screen.getByLabelText(/^Email/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });

    fireEvent.change(emailInput, {
      target: { value: "somchai.prasert@example.ac.th" },
    });
    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Change Password Screen")).toBeInTheDocument();
    });
  });
});
