import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import InternalNotes from "../../src/components/tickets/InternalNotes";
import type { InternalNoteDto } from "../../src/types/ticket";

const mockNotes: InternalNoteDto[] = [
  {
    id: 1,
    content: "Battery SKU 4820-A requested from Dell inventory.",
    createdAt: "2026-09-10T10:00:00.000Z",
    author: {
      id: 2,
      name: "Michael Brown",
      role: "IT_STAFF",
    },
  },
  {
    id: 2,
    content: "Procurement approved. Delivery expected in 2 days.",
    createdAt: "2026-09-10T10:45:00.000Z",
    author: {
      id: 5,
      name: "Administrator",
      role: "ADMINISTRATOR",
    },
  },
];

describe("UI-10 — Internal Notes tab renders private warning and notes list (AC-15, BR-04)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays prominent amber warning callout banner and lists private notes with author badges", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/tickets/101/notes")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockNotes,
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(<InternalNotes ticketId={101} />);

    // Verify warning callout banner is always rendered (ui-spec §4.5)
    expect(
      screen.getByText(/private it staff notes — strictly invisible to requesters/i),
    ).toBeInTheDocument();

    // Verify notes are rendered with author and role
    await waitFor(() => {
      expect(
        screen.getByText("Battery SKU 4820-A requested from Dell inventory."),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    expect(screen.getByText("IT Staff")).toBeInTheDocument();

    expect(
      screen.getByText("Procurement approved. Delivery expected in 2 days."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Administrator")).toHaveLength(2);
  });

  it("validates input length, character counter, and saves new internal note", async () => {
    const onCountChange = vi.fn();
    const newNote: InternalNoteDto = {
      id: 3,
      content: "Replacement battery has arrived in IT depot.",
      createdAt: "2026-09-11T09:00:00.000Z",
      author: {
        id: 2,
        name: "Michael Brown",
        role: "IT_STAFF",
      },
    };

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (
        url.includes("/api/tickets/101/notes") &&
        (!init?.method || init.method === "GET")
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockNotes,
        } as Response);
      }

      if (url.includes("/api/tickets/101/notes") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => newNote,
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(<InternalNotes ticketId={101} onNoteCountChange={onCountChange} />);

    await waitFor(() => {
      expect(
        screen.getByText("Battery SKU 4820-A requested from Dell inventory."),
      ).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /save internal note/i });
    const textarea = screen.getByPlaceholderText(/write a private operational note/i);

    // Empty -> disabled
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText("0 / 2,000 characters")).toBeInTheDocument();

    // Exceeding 2,000 characters -> disabled with inline validation error and aria-invalid
    fireEvent.change(textarea, { target: { value: "x".repeat(2001) } });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText("2,001 / 2,000 characters")).toBeInTheDocument();
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("internal-note-error"),
    );
    expect(
      screen.getByText(/internal note cannot exceed 2,000 characters/i),
    ).toBeInTheDocument();

    // Type new note
    fireEvent.change(textarea, {
      target: { value: "Replacement battery has arrived in IT depot." },
    });
    expect(submitBtn).toBeEnabled();

    // Save
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Replacement battery has arrived in IT depot."),
      ).toBeInTheDocument();
    });

    expect(textarea).toHaveValue("");
    expect(onCountChange).toHaveBeenCalledWith(3);
  });
});
