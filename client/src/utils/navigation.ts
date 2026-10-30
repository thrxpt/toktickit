import type { UserRole } from "../types/auth";

export function getDefaultRouteForRole(role: UserRole): string {
  return ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"].includes(role) ? "/dashboard" : "/login";
}
