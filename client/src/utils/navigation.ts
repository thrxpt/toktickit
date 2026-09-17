import type { UserRole } from "../types/auth";

export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "REQUESTER":
      return "/tickets";
    case "IT_STAFF":
      return "/staff/queue";
    case "ADMINISTRATOR":
      return "/admin/users";
    default:
      return "/login";
  }
}
