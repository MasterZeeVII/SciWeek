import type { CurrentUser } from "@/lib/tournament-types"

export type Role = CurrentUser["role"]

/** ADMIN is the wildcard role — it passes every check without being
 * listed (mirrors require_role on the backend). Other roles only pass
 * the checks that name them, so each keeps its own track:
 * MONITOR verifies results, FIELD_STAFF scans at the venue. */
export function hasRole(user: CurrentUser | null | undefined, ...roles: Role[]): boolean {
  if (!user) return false
  if (user.role === "ADMIN") return true
  return roles.includes(user.role)
}
