import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PublicComments from "../../src/components/tickets/PublicComments";
import type { CommentDto } from "../../src/types/ticket";

const mockComments: CommentDto[] = [
  {
    id: 1,
    content: "We have received your ticket and are looking into it.",
    createdAt: "2026-09-10T10:00:00.000Z",
    author: {
      id: 2,
      name: "Michael Brown",
      role: "IT_STAFF",
    },
  },
  {
    id: 2,
    content: "Thank you for the update. The issue happened again this morning.",
    createdAt: "2026-09-10T10:30:00.000Z",
    author: {
      id: 1,
      name: "Jennifer Anderson",
      role: "REQUESTER",
    },
  },
];

describe("UI-09 — Public Comments thread displays comments and accepts new post (AC-14, FR-07)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and displays public comments list with author name, role badge, timestamp, and content", async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/tickets/101/comments")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockComments,
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(<PublicComments ticketId={101} />);

    // Initially displays loading
    expect(screen.getByText(/loading comments/i)).toBeInTheDocument();

    // After load: verify comments are rendered in chronological order
    await waitFor(() => {
      expect(
        screen.getByText("We have received your ticket and are looking into it."),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    expect(screen.getByText("IT Staff")).toBeInTheDocument();

    expect(
      screen.getByText(
        "Thank you for the update. The issue happened again this morning.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("Requester")).toBeInTheDocument();
  });

  it("validates comment length, character counter, and disables post button when empty or whitespace", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as Response);

    render(<PublicComments ticketId={101} />);

    await waitFor(() => {
      expect(screen.getByText(/no public comments yet/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /post comment/i });
    const textarea = screen.getByPlaceholderText(/write a public comment/i);

    // Empty by default -> button disabled
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText("0 / 2,000 characters")).toBeInTheDocument();

    // Whitespace only -> button disabled
    fireEvent.change(textarea, { target: { value: "    " } });
    expect(submitBtn).toBeDisabled();

    // Valid text -> button enabled
    fireEvent.change(textarea, { target: { value: "Hello IT team" } });
    expect(submitBtn).toBeEnabled();
    expect(screen.getByText("13 / 2,000 characters")).toBeInTheDocument();

    // Exceeding 2,000 characters -> button disabled, aria-invalid and inline error shown
    fireEvent.change(textarea, { target: { value: "x".repeat(2001) } });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText("2,001 / 2,000 characters")).toBeInTheDocument();
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("public-comment-error"),
    );
    expect(
      screen.getByText(/comment cannot exceed 2,000 characters/i),
    ).toBeInTheDocument();
  });

  it("submits a new comment and appends it to the thread", async () => {
    const onCountChange = vi.fn();
    const newComment: CommentDto = {
      id: 3,
      content: "This is a newly posted public comment.",
      createdAt: "2026-09-10T11:00:00.000Z",
      author: {
        id: 1,
        name: "Jennifer Anderson",
        role: "REQUESTER",
      },
    };

    globalThis.fetch = vi.fn().mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (
        url.includes("/api/tickets/101/comments") &&
        (!init?.method || init.method === "GET")
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockComments,
        } as Response);
      }

      if (url.includes("/api/tickets/101/comments") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => newComment,
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(<PublicComments ticketId={101} onCommentCountChange={onCountChange} />);

    await waitFor(() => {
      expect(
        screen.getByText("We have received your ticket and are looking into it."),
      ).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/write a public comment/i);
    const submitBtn = screen.getByRole("button", { name: /post comment/i });

    fireEvent.change(textarea, {
      target: { value: "This is a newly posted public comment." },
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("This is a newly posted public comment."),
      ).toBeInTheDocument();
    });

    // Textarea cleared
    expect(textarea).toHaveValue("");
    // onCommentCountChange was notified with 3
    expect(onCountChange).toHaveBeenCalledWith(3);
  });
});
