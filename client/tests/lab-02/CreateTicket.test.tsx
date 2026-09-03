import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RequesterProvider,
  STORAGE_KEY,
} from "../../src/context/RequesterContext";
import CreateTicket from "../../src/pages/CreateTicket";

const mockRequesters = [
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@example.ac.th",
  },
];

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockRelatedSystems = [
  { id: 1, name: "Email" },
  { id: 7, name: "Corporate Laptop" },
];

function renderCreateTicket() {
  return render(
    <MemoryRouter initialEntries={["/tickets/new"]}>
      <RequesterProvider>
        <Routes>
          <Route path="/tickets/new" element={<CreateTicket />} />
          <Route path="/tickets" element={<div>My Tickets Page</div>} />
          <Route path="/tickets/:id" element={<div>Ticket Detail Page</div>} />
        </Routes>
      </RequesterProvider>
    </MemoryRouter>,
  );
}

describe("Create Ticket Screen", () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEY, "1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function setupFetchMock(
    customPostHandler?: (init?: RequestInit) => Promise<Response>,
  ) {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        (input: string | URL | Request, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input.toString();

          if (url === "/api/requesters") {
            return Promise.resolve({
              ok: true,
              json: async () => mockRequesters,
            } as Response);
          }
          if (url === "/api/categories") {
            return Promise.resolve({
              ok: true,
              json: async () => mockCategories,
            } as Response);
          }
          if (url === "/api/related-systems") {
            return Promise.resolve({
              ok: true,
              json: async () => mockRelatedSystems,
            } as Response);
          }
          if (url === "/api/tickets" && init?.method === "POST") {
            if (customPostHandler) {
              return customPostHandler(init);
            }
            return Promise.resolve({
              ok: true,
              status: 201,
              json: async () => ({
                id: 42,
                ticketNumber: "TKT-2026-000042",
                summary: "Laptop battery drains quickly",
                description:
                  "My laptop battery is draining much faster than usual even when idle.",
                requestedPriority: "MEDIUM",
                status: "NEW",
                category: { id: 2, name: "Hardware" },
                relatedSystem: { id: 7, name: "Corporate Laptop" },
                requester: { id: 1, name: "Jennifer Anderson" },
                createdAt: "2026-08-26T09:14:00.000Z",
                updatedAt: "2026-08-26T09:14:00.000Z",
              }),
            } as Response);
          }
          if (
            url.startsWith("/api/tickets/42/attachments") &&
            init?.method === "POST"
          ) {
            return Promise.resolve({
              ok: true,
              status: 201,
              json: async () => ({
                id: 101,
                originalFilename: "good-screenshot.png",
                mimeType: "image/png",
                sizeBytes: 1024,
                uploadedBy: { id: 1, name: "Jennifer Anderson" },
                createdAt: "2026-08-26T09:15:00.000Z",
              }),
            } as Response);
          }

          return Promise.reject(new Error(`Unhandled request: ${url}`));
        },
      );

    globalThis.fetch = fetchMock;
    return fetchMock;
  }

  describe("UI-08 — Submit with empty and whitespace-only Summary (AC-11, AC-12)", () => {
    it("shows field-level error and makes NO API call when Summary is empty", async () => {
      const fetchMock = setupFetchMock();
      renderCreateTicket();

      await waitFor(() => {
        expect(screen.getByLabelText(/^Summary/i)).toBeInTheDocument();
      });

      // Try submitting without typing summary
      const submitButton = screen.getByRole("button", {
        name: /create ticket/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Summary must be at least 5 characters/i),
        ).toBeInTheDocument();
      });

      // Assert no POST /api/tickets request was made
      const postCalls = fetchMock.mock.calls.filter(
        ([url, init]) => url === "/api/tickets" && init?.method === "POST",
      );
      expect(postCalls).toHaveLength(0);
    });

    it("shows field-level error and makes NO API call when Summary is whitespace-only", async () => {
      const fetchMock = setupFetchMock();
      renderCreateTicket();

      await waitFor(() => {
        expect(screen.getByLabelText(/^Summary/i)).toBeInTheDocument();
      });

      const summaryInput = screen.getByLabelText(/^Summary/i);
      fireEvent.change(summaryInput, { target: { value: "     " } });

      const submitButton = screen.getByRole("button", {
        name: /create ticket/i,
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Summary must be at least 5 characters/i),
        ).toBeInTheDocument();
      });

      const postCalls = fetchMock.mock.calls.filter(
        ([url, init]) => url === "/api/tickets" && init?.method === "POST",
      );
      expect(postCalls).toHaveLength(0);
    });
  });

  describe("UI-09 — Double-click Submit (AC-16, BR-24)", () => {
    it("disables button and sends exactly one request when clicked multiple times in flight", async () => {
      let resolvePost: (value: Response) => void;
      const postPromise = new Promise<Response>((resolve) => {
        resolvePost = resolve;
      });

      const fetchMock = setupFetchMock(() => postPromise);
      renderCreateTicket();

      await waitFor(() => {
        expect(screen.getByLabelText(/^Category/i)).toBeInTheDocument();
      });

      // Fill in valid data
      fireEvent.change(screen.getByLabelText(/^Category/i), {
        target: { value: "2" },
      });
      fireEvent.change(screen.getByLabelText(/^Related System/i), {
        target: { value: "7" },
      });
      fireEvent.change(screen.getByLabelText(/^Summary/i), {
        target: { value: "Laptop battery drains quickly" },
      });
      fireEvent.change(screen.getByLabelText(/^Description/i), {
        target: {
          value:
            "My laptop battery is draining much faster than usual even when idle.",
        },
      });

      const submitButton = screen.getByRole("button", {
        name: /create ticket/i,
      });

      // First click
      fireEvent.click(submitButton);

      // Button must immediately be disabled and busy
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute("aria-busy", "true");

      // Second click while in flight
      fireEvent.click(submitButton);

      // Check call count so far
      const postCalls = fetchMock.mock.calls.filter(
        ([url, init]) => url === "/api/tickets" && init?.method === "POST",
      );
      expect(postCalls).toHaveLength(1);

      // Resolve the response
      resolvePost!({
        ok: true,
        status: 201,
        json: async () => ({
          id: 42,
          ticketNumber: "TKT-2026-000042",
          summary: "Laptop battery drains quickly",
        }),
      } as Response);

      await waitFor(() => {
        expect(screen.getByText("TKT-2026-000042")).toBeInTheDocument();
      });

      expect(postCalls).toHaveLength(1);
    });
  });

  describe("UI-10 — API failure on submit (AC-17, BR-25)", () => {
    it("shows safe error state above actions and retains every entered value", async () => {
      setupFetchMock(() => Promise.reject(new Error("Network error")));
      renderCreateTicket();

      await waitFor(() => {
        expect(screen.getByLabelText(/^Category/i)).toBeInTheDocument();
      });

      // Fill in form values
      fireEvent.change(screen.getByLabelText(/^Category/i), {
        target: { value: "2" },
      });
      fireEvent.change(screen.getByLabelText(/^Related System/i), {
        target: { value: "7" },
      });
      fireEvent.change(screen.getByLabelText(/^Summary/i), {
        target: { value: "My entered summary to be retained" },
      });
      fireEvent.change(screen.getByLabelText(/^Description/i), {
        target: {
          value:
            "My entered description of sufficient length to be retained across error.",
        },
      });

      const submitButton = screen.getByRole("button", {
        name: /create ticket/i,
      });
      fireEvent.click(submitButton);

      // Error message appears
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Assert all entered values are retained
      expect(screen.getByLabelText(/^Category/i)).toHaveValue("2");
      expect(screen.getByLabelText(/^Related System/i)).toHaveValue("7");
      expect(screen.getByLabelText(/^Summary/i)).toHaveValue(
        "My entered summary to be retained",
      );
      expect(screen.getByLabelText(/^Description/i)).toHaveValue(
        "My entered description of sufficient length to be retained across error.",
      );
      expect(screen.getByLabelText(/^Requested Priority/i)).toHaveValue(
        "MEDIUM",
      );
    });
  });

  describe("UI-11 — Successful submission (AC-08)", () => {
    it("displays returned Ticket Number, View Ticket link, and Create Another button", async () => {
      setupFetchMock();
      renderCreateTicket();

      await waitFor(() => {
        expect(screen.getByLabelText(/^Category/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/^Category/i), {
        target: { value: "2" },
      });
      fireEvent.change(screen.getByLabelText(/^Related System/i), {
        target: { value: "7" },
      });
      fireEvent.change(screen.getByLabelText(/^Summary/i), {
        target: { value: "Laptop battery drains quickly" },
      });
      fireEvent.change(screen.getByLabelText(/^Description/i), {
        target: {
          value:
            "My laptop battery is draining much faster than usual even when idle.",
        },
      });

      const submitButton = screen.getByRole("button", {
        name: /create ticket/i,
      });
      fireEvent.click(submitButton);

      // Success panel displayed with Ticket Number
      await waitFor(() => {
        expect(screen.getByText("TKT-2026-000042")).toBeInTheDocument();
      });

      const viewTicketLink = screen.getByRole("link", { name: /view ticket/i });
      expect(viewTicketLink).toHaveAttribute("href", "/tickets/42");

      const createAnotherBtn = screen.getByRole("button", {
        name: /create another/i,
      });
      expect(createAnotherBtn).toBeInTheDocument();

      // Clicking Create Another resets to an empty form
      fireEvent.click(createAnotherBtn);

      await waitFor(() => {
        expect(screen.getByLabelText(/^Summary/i)).toHaveValue("");
      });
      expect(screen.getByLabelText(/^Description/i)).toHaveValue("");
      expect(screen.getByLabelText(/^Category/i)).toHaveValue("");
      expect(screen.getByLabelText(/^Related System/i)).toHaveValue("");
      expect(screen.getByLabelText(/^Requested Priority/i)).toHaveValue(
        "MEDIUM",
      );
    });
  });

  describe("UI-13 — Reference data from API (FR-16, BR-45)", () => {
    it("populates Category and Related System dropdowns from API responses", async () => {
      setupFetchMock();
      renderCreateTicket();

      await waitFor(() => {
        expect(screen.getByLabelText(/^Category/i)).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText(
        /^Category/i,
      ) as HTMLSelectElement;
      const categoryOptions = Array.from(categorySelect.options).map(
        (o) => o.textContent,
      );
      expect(categoryOptions).toContain("Account and Access");
      expect(categoryOptions).toContain("Hardware");

      const systemSelect = screen.getByLabelText(
        /^Related System/i,
      ) as HTMLSelectElement;
      const systemOptions = Array.from(systemSelect.options).map(
        (o) => o.textContent,
      );
      expect(systemOptions).toContain("Email");
      expect(systemOptions).toContain("Corporate Laptop");
    });
  });

  describe("UI-12 — One of two Attachments fails (AC-41, BR-41)", () => {
    it("creates Ticket successfully, displays Ticket Number, and names outcomes per file", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(
          (input: string | URL | Request, init?: RequestInit) => {
            const url = typeof input === "string" ? input : input.toString();

            if (url === "/api/requesters") {
              return Promise.resolve({
                ok: true,
                json: async () => mockRequesters,
              } as Response);
            }
            if (url === "/api/categories") {
              return Promise.resolve({
                ok: true,
                json: async () => mockCategories,
              } as Response);
            }
            if (url === "/api/related-systems") {
              return Promise.resolve({
                ok: true,
                json: async () => mockRelatedSystems,
              } as Response);
            }
            if (url === "/api/tickets" && init?.method === "POST") {
              return Promise.resolve({
                ok: true,
                status: 201,
                json: async () => ({
                  id: 42,
                  ticketNumber: "TKT-2026-000042",
                  summary: "Laptop battery drains quickly",
                }),
              } as Response);
            }
            if (
              url === "/api/tickets/42/attachments" &&
              init?.method === "POST"
            ) {
              const body = init.body as FormData;
              const file = body?.get("file") as File | null;
              if (file?.name === "good-file.png") {
                return Promise.resolve({
                  ok: true,
                  status: 201,
                  json: async () => ({
                    id: 101,
                    originalFilename: "good-file.png",
                    mimeType: "image/png",
                    sizeBytes: 1024,
                    uploadedBy: { id: 1, name: "Jennifer Anderson" },
                    createdAt: "2026-08-26T09:15:00.000Z",
                  }),
                } as Response);
              }
              return Promise.resolve({
                ok: false,
                status: 415,
                json: async () => ({
                  error: {
                    code: "UNSUPPORTED_FILE_TYPE",
                    message:
                      "Unsupported file type. Permitted types are JPG, PNG, WEBP, and PDF.",
                  },
                }),
              } as Response);
            }
            return Promise.reject(new Error(`Unhandled request: ${url}`));
          },
        );
      globalThis.fetch = fetchMock;

      renderCreateTicket();

      await waitFor(() => {
        expect(screen.getByLabelText(/^Category/i)).toBeInTheDocument();
      });

      // Fill in valid form fields
      fireEvent.change(screen.getByLabelText(/^Category/i), {
        target: { value: "2" },
      });
      fireEvent.change(screen.getByLabelText(/^Related System/i), {
        target: { value: "7" },
      });
      fireEvent.change(screen.getByLabelText(/^Summary/i), {
        target: { value: "Laptop battery drains quickly" },
      });
      fireEvent.change(screen.getByLabelText(/^Description/i), {
        target: {
          value:
            "My laptop battery is draining much faster than usual even when idle.",
        },
      });

      // Select two files: one valid, one that will be rejected by backend
      const fileInput = screen.getByTestId("attachment-file-input");
      const goodFile = new File(["png-bytes"], "good-file.png", {
        type: "image/png",
      });
      const badFile = new File(["bad-bytes"], "bad-disguise.png", {
        type: "image/png",
      });

      fireEvent.change(fileInput, {
        target: {
          files: [goodFile, badFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText("good-file.png")).toBeInTheDocument();
        expect(screen.getByText("bad-disguise.png")).toBeInTheDocument();
      });

      // Submit form
      const submitButton = screen.getByRole("button", {
        name: /create ticket/i,
      });
      fireEvent.click(submitButton);

      // Success screen is shown with Ticket Number
      await waitFor(() => {
        expect(screen.getByText("TKT-2026-000042")).toBeInTheDocument();
      });

      // Outcome of both files is shown explicitly (AC-41, FR-07)
      expect(screen.getByText("good-file.png")).toBeInTheDocument();
      expect(screen.getByText("Uploaded")).toBeInTheDocument();

      expect(screen.getByText("bad-disguise.png")).toBeInTheDocument();
      expect(
        screen.getByText(/failed: unsupported file type/i),
      ).toBeInTheDocument();
    });
  });
});
