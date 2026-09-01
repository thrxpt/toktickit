import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import AttachmentSection from "../../src/components/AttachmentSection";
import type { AttachmentDto } from "../../src/types/ticket";

const mockActiveAttachment: AttachmentDto = {
  id: 101,
  originalFilename: "active-screenshot.png",
  mimeType: "image/png",
  sizeBytes: 102400,
  uploadedBy: { id: 1, name: "Jennifer Anderson" },
  createdAt: "2026-08-26T09:00:00.000Z",
  contentUrl: "/api/attachments/101/content",
};

const mockRemovedAttachment: AttachmentDto = {
  id: 102,
  originalFilename: "old-screenshot.png",
  mimeType: "image/png",
  sizeBytes: 204800,
  uploadedBy: { id: 1, name: "Jennifer Anderson" },
  createdAt: "2026-08-26T08:30:00.000Z",
  removedAt: "2026-08-26T09:15:00.000Z",
  removedBy: { id: 1, name: "Jennifer Anderson" },
  removalReason: "Uploaded the wrong document by mistake",
};

describe("UI-19 — Removed Attachment group on Ticket Detail (AC-36, BR-39)", () => {
  it("renders active attachments with Download/Preview, and removed group with reason, remover, time, and NO download/preview control", () => {
    render(
      <AttachmentSection
        ticketId={42}
        attachments={{
          active: [mockActiveAttachment],
          removed: [mockRemovedAttachment],
        }}
      />,
    );

    // Heading shows count
    expect(
      screen.getByRole("heading", { name: /attachments \(1 of 5\)/i }),
    ).toBeInTheDocument();

    // Active attachment displays details and controls
    expect(screen.getByText("active-screenshot.png")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /preview/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();

    // Removed attachment displays metadata and reason
    expect(screen.getByText("old-screenshot.png")).toBeInTheDocument();
    expect(
      screen.getByText(/uploaded the wrong document by mistake/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/jennifer anderson/i).length,
    ).toBeGreaterThanOrEqual(1);

    // BR-39, AC-36: NO download or preview control rendered for removed attachment
    const allLinks = screen.getAllByRole("link");
    for (const link of allLinks) {
      expect(link.getAttribute("href")).not.toContain("102");
    }

    // Only one download link (for active attachment 101)
    expect(screen.getAllByRole("link", { name: /download/i })).toHaveLength(1);
  });
});

describe("UI-20 — Attachment removal confirmation with required reason (AC-38, BR-42)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps Confirm button disabled while reason is blank, and updates attachment on valid submission", async () => {
    const onAttachmentRemoved = vi.fn();

    // Mock fetch for removal endpoint
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...mockActiveAttachment,
        removedAt: "2026-08-26T10:00:00.000Z",
        removedBy: { id: 1, name: "Jennifer Anderson" },
        removalReason: "No longer needed",
      }),
    });
    globalThis.fetch = mockFetch;

    render(
      <AttachmentSection
        ticketId={42}
        attachments={{
          active: [mockActiveAttachment],
          removed: [],
        }}
        onAttachmentRemoved={onAttachmentRemoved}
      />,
    );

    // Click remove button
    const removeBtn = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(removeBtn);

    // Dialog opens
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /remove attachment/i }),
    ).toBeInTheDocument();

    const confirmBtn = within(dialog).getByRole("button", { name: /remove/i });
    const reasonInput = screen.getByLabelText(/reason for removal/i);

    // Initially blank -> Confirm button is disabled
    expect(confirmBtn).toBeDisabled();

    // Type spaces only -> still disabled
    fireEvent.change(reasonInput, { target: { value: "    " } });
    expect(confirmBtn).toBeDisabled();

    // Type valid reason -> Confirm button becomes enabled
    fireEvent.change(reasonInput, { target: { value: "No longer needed" } });
    expect(confirmBtn).not.toBeDisabled();

    // Click confirm
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/attachments/101/removal",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ reason: "No longer needed" }),
        }),
      );
    });
  });
});

describe("UI-21 — Oversized file, invalid type, and attachment limit reached (AC-32, AC-34, BR-34, BR-35)", () => {
  it("disables uploader and displays explanation when 5 active attachments exist", () => {
    const fiveActive: AttachmentDto[] = Array.from({ length: 5 }, (_, i) => ({
      ...mockActiveAttachment,
      id: 200 + i,
      originalFilename: `screenshot-${i + 1}.png`,
    }));

    render(
      <AttachmentSection
        ticketId={42}
        attachments={{
          active: fiveActive,
          removed: [],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /attachments \(5 of 5\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/attachment limit reached/i)).toBeInTheDocument();

    // File input should be disabled
    const fileInput = screen.getByTestId("attachment-file-input");
    expect(fileInput).toBeDisabled();
  });

  it("rejects oversized and unsupported files with per-file messages leaving valid files unaffected", async () => {
    render(
      <AttachmentSection
        ticketId={42}
        attachments={{
          active: [mockActiveAttachment],
          removed: [],
        }}
      />,
    );

    const fileInput = screen.getByTestId("attachment-file-input");

    // Create 3 files: 1 oversized (6 MB), 1 invalid type (.exe), 1 valid (1 MB PNG)
    const oversizedFile = new File(
      [new Uint8Array(6 * 1024 * 1024)],
      "huge.pdf",
      {
        type: "application/pdf",
      },
    );
    const invalidTypeFile = new File([new Uint8Array(100)], "script.sh", {
      type: "text/x-shellscript",
    });

    fireEvent.change(fileInput, {
      target: {
        files: [oversizedFile, invalidTypeFile],
      },
    });

    // Assert per-file rejection messages are rendered
    await waitFor(() => {
      expect(screen.getByText(/huge.pdf/i)).toBeInTheDocument();
      expect(
        screen.getByText(/each file must be 5 mb or smaller/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/script.sh/i)).toBeInTheDocument();
      expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    });
  });
});
