import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AttachmentSection from "../../src/components/AttachmentSection";
import UserEditDrawer from "../../src/pages/admin/UserEditDrawer";
import PublicComments from "../../src/components/tickets/PublicComments";
import InternalNotes from "../../src/components/tickets/InternalNotes";
import { RequesterSession } from "../helpers/RequesterSession";

afterEach(() => vi.unstubAllGlobals());
const failure = () => new Response("<h1>Database internals</h1>", { status: 500 });

function submitTwice(form: HTMLFormElement) {
  act(() => {
    for (let index = 0; index < 2; index++) {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
  });
}

describe("UI-13 — FR-19, FR-20, AC-26: duplicate submission and recoverable failures", () => {
  it("locks account creation synchronously and keeps all fields after a non-JSON failure", async () => {
    let finish!: (response: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal("fetch", fetch);
    render(<RequesterSession><UserEditDrawer isOpen user={null} onClose={vi.fn()} onSaved={vi.fn()} activeAdminCount={1} /></RequesterSession>);
    fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: "Release User" } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "release@example.ac.th" } });
    fireEvent.change(screen.getByLabelText(/^Initial Password/), { target: { value: "Temporary123!" } });
    submitTwice(screen.getByRole("button", { name: "Save User" }).closest("form")!);
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => finish(failure()));
    expect(screen.getByLabelText(/Full Name/)).toHaveValue("Release User");
    expect(screen.getByLabelText(/Email/)).toHaveValue("release@example.ac.th");
    expect(screen.getByLabelText(/^Initial Password/)).toHaveValue("Temporary123!");
    expect(screen.getByRole("button", { name: "Save User" })).toBeEnabled();
    expect(screen.queryByText(/Database internals/)).not.toBeInTheDocument();
  });

  it.each([
    [PublicComments, "Add Public Comment", "Post Comment"],
    [InternalNotes, "Add Internal Note", "Save Internal Note"],
  ] as const)("keeps discussion text after failure and sends one pending write (%s)", async (Component, label, button) => {
    let finish!: (response: Response) => void;
    const fetch = vi.fn((_input, init?: RequestInit) => init?.method === "POST"
      ? new Promise<Response>(resolve => { finish = resolve; })
      : Promise.resolve(new Response("[]")));
    vi.stubGlobal("fetch", fetch);
    render(<Component ticketId={42} />);
    await screen.findByText(/No (public comments|internal notes) yet/);
    const input = screen.getByRole("textbox", { name: label });
    fireEvent.change(input, { target: { value: "Keep this work discussion" } });
    submitTwice(screen.getByRole("button", { name: button }).closest("form")!);
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    await act(async () => finish(failure()));
    expect(input).toHaveValue("Keep this work discussion");
    await waitFor(() => expect(screen.getByRole("button", { name: button })).toBeEnabled());
    expect(screen.queryByText(/Database internals/)).not.toBeInTheDocument();
    const firstKey = new Headers(fetch.mock.calls.find(([, init]) => init?.method === "POST")![1]?.headers).get("Idempotency-Key");
    fireEvent.click(screen.getByRole("button", { name: button }));
    const writes = fetch.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(new Headers(writes[1][1]?.headers).get("Idempotency-Key")).toBe(firstKey);
    await act(async () => finish(new Response(JSON.stringify({ id: 1, content: "Keep this work discussion", createdAt: new Date().toISOString(), author: { id: 1, name: "Jennifer", role: "REQUESTER" } }))));
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "Keep this work discussion" } });
    fireEvent.click(screen.getByRole("button", { name: button }));
    const last = fetch.mock.calls.filter(([, init]) => init?.method === "POST").at(-1)!;
    expect(new Headers(last[1]?.headers).get("Idempotency-Key")).not.toBe(firstKey);
    await act(async () => finish(failure()));
  });

  it("retains the failed File and reuses its submission key without choosing it again", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(failure()).mockResolvedValueOnce(new Response(JSON.stringify({
      id: 1, originalFilename: "retry.pdf", mimeType: "application/pdf", sizeBytes: 16,
      createdAt: new Date().toISOString(), uploadedBy: { id: 1, name: "Jennifer" }, contentUrl: "/api/attachments/1/content",
    })));
    vi.stubGlobal("fetch", fetch);
    const onAdded = vi.fn();
    render(<AttachmentSection ticketId={42} attachments={{ active: [], removed: [] }} onAttachmentAdded={onAdded} />);
    const file = new File(["%PDF-1.4 retry"], "retry.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByTestId("attachment-file-input"), { target: { files: [file] } });
    const retry = await screen.findByRole("button", { name: "Retry retry.pdf" });
    fireEvent.click(retry);
    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledTimes(2);
    const first = fetch.mock.calls[0][1] as RequestInit;
    const second = fetch.mock.calls[1][1] as RequestInit;
    expect(new Headers(second.headers).get("Idempotency-Key")).toBe(new Headers(first.headers).get("Idempotency-Key"));
    expect((second.body as FormData).get("file")).toBe(file);
    expect(screen.queryByRole("button", { name: "Retry retry.pdf" })).not.toBeInTheDocument();
  });
});

it("FR-19 — does not duplicate a replayed Comment already recovered by refreshing the thread", async () => {
  const comment = { id: 7, content: "Recovered committed comment", createdAt: new Date().toISOString(), author: { id: 1, name: "Jennifer", role: "REQUESTER" } };
  let reads = 0;
  let writes = 0;
  vi.stubGlobal("fetch", vi.fn((_input, init?: RequestInit) => {
    if (init?.method === "POST") {
      writes++;
      return writes === 1 ? Promise.reject(new TypeError("lost response")) : Promise.resolve(new Response(JSON.stringify(comment)));
    }
    reads++;
    return Promise.resolve(reads === 1 ? failure() : new Response(JSON.stringify([comment])));
  }));
  render(<PublicComments ticketId={42} />);
  await screen.findByRole("heading", { name: "Failed to Load Comments" });
  fireEvent.change(screen.getByRole("textbox"), { target: { value: comment.content } });
  fireEvent.click(screen.getByRole("button", { name: "Post Comment" }));
  await screen.findByText("Unable to post comment. Please try again.");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText(comment.content, { selector: "p" });
  fireEvent.click(screen.getByRole("button", { name: "Post Comment" }));
  await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
  expect(screen.getAllByText(comment.content, { selector: "p" })).toHaveLength(1);
});
