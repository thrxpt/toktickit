import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ConflictAlert from "../../../src/components/tickets/ConflictAlert";
import ActionsTakenPanel from "../../../src/components/tickets/ActionsTakenPanel";

afterEach(() => vi.restoreAllMocks());
it("STYLE-02 — AC-24, BR-32: follow-up has text and theme classes; new components contain no hex", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 1,
            description: "Checked",
            result: "Working",
            performedBy: { name: "Staff" },
            followUpRequired: true,
            followUpNote: "Check tomorrow",
            createdAt: "2026-10-30T10:00:00Z",
          },
        ]),
      ),
    ),
  );
  render(<ActionsTakenPanel ticketId={1} />);
  expect(await screen.findByText("Required")).toHaveClass("bg-warning-subtle");
  for (const name of ["ActionEditor", "ActionsTakenPanel"]) {
    const source = fs.readFileSync(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        `../../../src/components/tickets/${name}.tsx`,
      ),
      "utf8",
    );
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  }
});

it("STYLE-02 — AC-20: conflict uses a danger surface and explains recovery in text", () => {
  render(<ConflictAlert onReload={() => {}} onDismiss={() => {}} />);
  expect(screen.getByRole("alert")).toHaveClass(
    "zen-conflict-alert",
    "alert-danger",
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Your text has been kept.",
  );
  expect(
    screen.getByRole("button", { name: "Reload ticket" }),
  ).toBeInTheDocument();
});
