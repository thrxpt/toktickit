import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Badge, { type BadgeValue } from "../../../src/components/Badge";

describe("STYLE-02 — Role badges render correct semantic colors and text (ui-spec §3)", () => {
  it("renders Requester role badge with correct text and semantic class", () => {
    render(<Badge value="REQUESTER" />);
    const badge = screen.getByText("Requester");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("zen-badge-role-requester");
  });

  it("renders IT Staff role badge with correct text and semantic class", () => {
    render(<Badge value="IT_STAFF" />);
    const badge = screen.getByText("IT Staff");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("zen-badge-role-staff");
  });

  it("renders Administrator role badge with correct text and semantic class", () => {
    render(<Badge value="ADMINISTRATOR" />);
    const badge = screen.getByText("Administrator");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("zen-badge-role-admin");
  });
});

describe("STYLE-03 — Priority badges render semantic Zen Green tokens and text (ui-spec §3)", () => {
  it("renders Low priority badge with semantic text and class", () => {
    render(<Badge value="LOW" />);
    const badge = screen.getByText("Low");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("zen-badge-low");
  });

  it("renders Medium priority badge with semantic text and class", () => {
    render(<Badge value="MEDIUM" />);
    const badge = screen.getByText("Medium");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("zen-badge-medium");
  });

  it("renders High priority badge with semantic text and class", () => {
    render(<Badge value="HIGH" />);
    const badge = screen.getByText("High");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("zen-badge-high");
  });

  it("renders Critical priority badge with semantic text and class", () => {
    render(<Badge value="CRITICAL" />);
    const badge = screen.getByText("Critical");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("zen-badge-critical");
  });

  it("pairs color with explicit textual label for all four priority levels", () => {
    const { rerender } = render(<Badge value="LOW" />);
    expect(screen.getByText("Low")).toBeVisible();

    rerender(<Badge value="MEDIUM" />);
    expect(screen.getByText("Medium")).toBeVisible();

    rerender(<Badge value="HIGH" />);
    expect(screen.getByText("High")).toBeVisible();

    rerender(<Badge value="CRITICAL" />);
    expect(screen.getByText("Critical")).toBeVisible();
  });
});

describe("STYLE-04 — Status badges render all 8 statuses with text and semantic styling (ui-spec §3)", () => {
  const statuses: { value: BadgeValue; label: string; expectedClass: string }[] = [
    { value: "NEW", label: "New", expectedClass: "zen-badge-status-new" },
    { value: "OPEN", label: "Open", expectedClass: "zen-badge-status-open" },
    {
      value: "IN_PROGRESS",
      label: "In Progress",
      expectedClass: "zen-badge-status-in-progress",
    },
    {
      value: "WAITING_FOR_REQUESTER",
      label: "Waiting for Requester",
      expectedClass: "zen-badge-status-waiting-for-requester",
    },
    {
      value: "RESOLVED",
      label: "Resolved",
      expectedClass: "zen-badge-status-resolved",
    },
    {
      value: "CLOSED",
      label: "Closed",
      expectedClass: "zen-badge-status-closed",
    },
    {
      value: "REOPENED",
      label: "Reopened",
      expectedClass: "zen-badge-status-reopened",
    },
    {
      value: "CANCELLED",
      label: "Cancelled",
      expectedClass: "zen-badge-status-cancelled",
    },
  ];

  for (const { value, label, expectedClass } of statuses) {
    it(`renders "${label}" for status ${value} with class ${expectedClass}`, () => {
      render(<Badge value={value} />);
      const badge = screen.getByText(label);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(expectedClass);
    });
  }

  it("renders text labels rather than relying on color alone for all 8 statuses", () => {
    const { rerender } = render(<Badge value="NEW" />);
    for (const { value, label } of statuses) {
      rerender(<Badge value={value} />);
      expect(screen.getByText(label)).toBeVisible();
    }
  });
});

describe("STYLE-06 — Account status badges render Active and Inactive states (ui-spec §3)", () => {
  it("renders Active account status badge with correct text and semantic class", () => {
    render(<Badge value="ACTIVE" />);
    const badge = screen.getByText("Active");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("zen-badge-user-active");
  });

  it("renders Inactive account status badge with correct text and semantic class", () => {
    render(<Badge value="INACTIVE" />);
    const badge = screen.getByText("Inactive");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("zen-badge-user-inactive");
  });
});
