import { Link, useNavigate } from "react-router-dom"
import { Network } from "lucide-react"

import { TournamentBracket } from "@/components/tournament-bracket"
import { hasRole } from "@/lib/roles"
import { useTournament } from "@/lib/tournament-context"
import { DivisionTabs } from "../division-tabs"

export function AdminBracket() {
  const { user, tournament, updateMatchResult } = useTournament()
  const navigate = useNavigate()

  const canScore = hasRole(user, "MONITOR")
  const canScan = hasRole(user, "MONITOR", "FIELD_STAFF")

  if (!tournament || tournament.matches.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">สายการแข่งขัน</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{tournament?.name ?? ""}</p>
          </div>
          <DivisionTabs />
        </div>
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Network className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            รุ่นนี้ยังไม่จับสาย — ตั้งค่าได้ที่หน้า
            <Link to="/admin/tournaments" className="text-brand font-semibold mx-1 hover:underline">ทัวร์นาเมนต์</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Slim toolbar over the bracket canvas */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-card border-b border-border">
        <p className="text-sm font-semibold text-foreground">สายการแข่งขัน — คลิกที่แมตช์เพื่อบันทึกผล/สแกนคะแนน</p>
        <DivisionTabs />
      </div>
      <div className="flex-1 min-h-0">
        <TournamentBracket
          tournamentName={tournament.name}
          matches={tournament.matches}
          teams={tournament.teams}
          onUpdateScore={canScore ? updateMatchResult : undefined}
          onOpenScanner={
            canScan
              ? (matchId, gameIndex) => navigate("/admin/scan", { state: { matchId, gameIndex } })
              : undefined
          }
        />
      </div>
    </div>
  )
}
