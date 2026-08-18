import { Navigate } from "react-router-dom"

import { useTournament } from "@/lib/tournament-context"

/**
 * Legacy route. Team management now lives inside the per-season page
 * (`/admin/tournaments/:id?tab=teams`) so staff never lose season context while
 * building a roster. Old links/bookmarks land on the active season's roster —
 * or on the season list when nothing is active yet.
 */
export function AdminParticipants() {
  const { tournament, loading } = useTournament()

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">กำลังโหลด...</div>
  }

  return (
    <Navigate
      to={tournament ? `/admin/tournaments/${tournament.id}?tab=teams` : "/admin/tournaments"}
      replace
    />
  )
}
