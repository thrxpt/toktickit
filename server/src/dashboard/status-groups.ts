// BR-21, BR-22, BR-25: these sets also define Requester drill-down boundaries.
export const STATUS_GROUPS = {
  open: ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"],
  resolved: ["RESOLVED", "CLOSED"],
} as const;
