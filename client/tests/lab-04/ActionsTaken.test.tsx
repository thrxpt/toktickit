import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ActionsTakenPanel from "../../src/components/tickets/ActionsTakenPanel";

const action = {
  id: 1,
  ticketId: 101,
  description: "Replaced battery",
  result: "Charge restored",
  performedBy: { id: 2, name: "Michael Brown", role: "IT_STAFF" },
  followUpRequired: true,
  followUpNote: "Monitor charge",
  attachmentNotes: "battery.jpg",
  createdAt: "2026-09-10T10:00:00Z",
  updatedAt: "2026-09-10T10:00:00Z",
};
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
afterEach(() => vi.restoreAllMocks());
describe("UI-07 — AC-19, FR-18: Requester work log", () => {
  it("loads every field read-only without write controls", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([action])));
    render(<ActionsTakenPanel ticketId={101} />);
    expect(screen.getByText("Loading Actions Taken…")).toBeInTheDocument();
    await screen.findAllByText("Replaced battery");
    expect(screen.getAllByText("Michael Brown").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Monitor charge/).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /Record Action|Edit/ }),
    ).not.toBeInTheDocument();
  });
});

describe("UI-04, UI-05, UI-06, UI-09 — FR-17, FR-19, FR-20", () => {
  it("requires a follow-up note and prevents duplicate submissions", async () => {
    let finish!: (r: Response) => void;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response([]))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue(response([action]));
    vi.stubGlobal("fetch", fetch);
    const onVersionChange = vi.fn();
    render(
      <ActionsTakenPanel
        ticketId={101}
        version={4}
        canWrite
        onVersionChange={onVersionChange}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Record Action" }),
    );
    fireEvent.change(screen.getByLabelText("Description *"), {
      target: { value: "Replaced battery" },
    });
    fireEvent.change(screen.getByLabelText("Result *"), {
      target: { value: "Charge restored" },
    });
    fireEvent.click(screen.getByLabelText("Follow-Up Required"));
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    expect(
      await screen.findByText("Follow-up Note is required."),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("Follow-up Note *"), {
      target: { value: "Monitor charge" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    expect(screen.getByRole("button", { name: /Saving/ })).toBeDisabled();
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      description: "Replaced battery",
      result: "Charge restored",
      followUpRequired: true,
      followUpNote: "Monitor charge",
      attachmentNotes: null,
      expectedVersion: 4,
    });
    finish(response({ action, ticketVersion: 5 }, 201));
    await waitFor(() => expect(onVersionChange).toHaveBeenCalledWith(5));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Action saved.",
    );
  });
  it("preserves edit text on conflict and reload, then reuses the new version", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response([action]))
      .mockResolvedValueOnce(response({ error: { code: "STALE_UPDATE" } }, 409))
      .mockResolvedValueOnce(response([action]))
      .mockResolvedValueOnce(response({ action, ticketVersion: 7 }));
    vi.stubGlobal("fetch", fetch);
    const reload = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <ActionsTakenPanel
        ticketId={101}
        version={4}
        canWrite
        onReload={reload}
      />,
    );
    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Edit" }))[0],
    );
    expect(
      screen.getByText("Action Date/Time", { selector: "#action-date-label" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Result *"), {
      target: { value: "New result" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Reload ticket" }),
    );
    await waitFor(() => expect(reload).toHaveBeenCalled());
    rerender(
      <ActionsTakenPanel
        ticketId={101}
        version={6}
        canWrite
        onReload={reload}
      />,
    );
    expect(screen.getByLabelText("Result *")).toHaveValue("New result");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save Action" }),
      ).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    await waitFor(() =>
      expect(JSON.parse(fetch.mock.calls.at(-1)![1].body).expectedVersion).toBe(
        6,
      ),
    );
  });
});

describe("UI-04, UI-07 — AC-18, AC-19, FR-20: panel states and safe failures", () => {
  it.each([403, 404])(
    "shows quiet unavailable state without retry for %s",
    async (status) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, status)));
      render(<ActionsTakenPanel ticketId={101} />);
      await screen.findByText("Actions Taken are unavailable.");
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    },
  );
  it("retries load failures into an empty state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue(response([])),
    );
    render(<ActionsTakenPanel ticketId={101} />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await screen.findByText("IT has not recorded any actions yet.");
  });
  it("keeps entered data on network failure and sends no note when follow-up is off", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response([]))
      .mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    render(<ActionsTakenPanel ticketId={101} version={1} canWrite />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Record Action" }),
    );
    fireEvent.change(screen.getByLabelText("Description *"), {
      target: { value: "Checked VPN" },
    });
    fireEvent.change(screen.getByLabelText("Result *"), {
      target: { value: "Connected" },
    });
    fireEvent.click(screen.getByLabelText("Follow-Up Required"));
    fireEvent.change(screen.getByLabelText("Follow-up Note *"), {
      target: { value: "Check tomorrow" },
    });
    fireEvent.click(screen.getByLabelText("Follow-Up Required"));
    fireEvent.click(screen.getByRole("button", { name: "Save Action" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Description *")).toHaveValue("Checked VPN");
    expect(JSON.parse(fetch.mock.calls[1][1].body).followUpNote).toBeNull();
    expect(screen.queryByLabelText("Follow-up Note *")).not.toBeInTheDocument();
  });
});

it("AC-24: Enter toggles follow-up without submitting; cancel restores keyboard focus", async () => {
  const fetch = vi.fn().mockResolvedValue(response([]));
  vi.stubGlobal("fetch", fetch);
  render(<ActionsTakenPanel ticketId={101} version={1} canWrite />);
  fireEvent.click(await screen.findByRole("button", { name: "Record Action" }));
  fireEvent.keyDown(screen.getByRole("switch"), { key: "Enter" });
  expect(screen.getByLabelText("Follow-up Note *")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("button", { name: "Record Action" })).toHaveFocus();
});
