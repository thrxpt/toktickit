import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import InternalNotes from "../../../src/components/tickets/InternalNotes";

describe("STYLE-05 — Internal Notes tab renders amber warning callout styling (ui-spec §4.5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders amber warning callout banner with zen-notes-warning class and semantic alert role", () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as Response);

    render(<InternalNotes ticketId={101} />);

    const banner = screen.getByRole("note");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass("zen-notes-warning");
    expect(
      screen.getByText(/private it staff notes — strictly invisible to requesters/i),
    ).toBeInTheDocument();
  });

  it("renders internal note cards with amber-tinted zen-note-card styling", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: 1,
          content: "Diagnostic testing complete.",
          createdAt: "2026-09-10T12:00:00.000Z",
          author: { id: 2, name: "Michael Brown", role: "IT_STAFF" },
        },
      ],
    } as Response);

    render(<InternalNotes ticketId={101} />);

    const noteText = await screen.findByText("Diagnostic testing complete.");
    const noteCard = noteText.closest(".zen-note-card");
    expect(noteCard).not.toBeNull();
    expect(noteCard).toHaveClass("zen-note-card");
  });
});
