export type BadgeValue =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED"
  | "REQUESTER"
  | "IT_STAFF"
  | "ADMINISTRATOR"
  | "ACTIVE"
  | "INACTIVE";

export interface BadgeProps {
  value: BadgeValue;
  className?: string;
}

const BADGE_MAP: Record<BadgeValue, { label: string; className: string }> = {
  // Priorities
  LOW: { label: "Low", className: "zen-badge-low" },
  MEDIUM: { label: "Medium", className: "zen-badge-medium" },
  HIGH: { label: "High", className: "zen-badge-high" },
  CRITICAL: { label: "Critical", className: "zen-badge-critical" },

  // Statuses
  NEW: { label: "New", className: "zen-badge-status-new zen-badge-new" },
  OPEN: { label: "Open", className: "zen-badge-status-open" },
  IN_PROGRESS: {
    label: "In Progress",
    className: "zen-badge-status-in-progress",
  },
  WAITING_FOR_REQUESTER: {
    label: "Waiting for Requester",
    className: "zen-badge-status-waiting-for-requester",
  },
  RESOLVED: { label: "Resolved", className: "zen-badge-status-resolved" },
  CLOSED: { label: "Closed", className: "zen-badge-status-closed" },
  REOPENED: { label: "Reopened", className: "zen-badge-status-reopened" },
  CANCELLED: { label: "Cancelled", className: "zen-badge-status-cancelled" },

  // Roles
  REQUESTER: { label: "Requester", className: "zen-badge-role-requester" },
  IT_STAFF: { label: "IT Staff", className: "zen-badge-role-staff" },
  ADMINISTRATOR: { label: "Administrator", className: "zen-badge-role-admin" },

  // Account Statuses
  ACTIVE: { label: "Active", className: "zen-badge-user-active" },
  INACTIVE: { label: "Inactive", className: "zen-badge-user-inactive" },
};

export function Badge({ value, className = "" }: BadgeProps) {
  const config = BADGE_MAP[value] || {
    label: value,
    className: "bg-secondary",
  };

  return (
    <span className={`badge ${config.className} ${className}`.trim()}>
      {config.label}
    </span>
  );
}

export default Badge;
