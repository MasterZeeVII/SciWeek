import { useMemo } from "react"
import { motion } from "motion/react"
import { TrendingUp } from "lucide-react"
import type { Match } from "@/lib/tournament-types"
import { CardHeader } from "@/components/ui/card"

type SchoolStat = {
  school: string
  wins: number
  losses: number
  matchesPlayed: number
  winRate: number
}

// Team display names are "<school> #<n>" — same convention admin-participants.tsx
// strips when editing a team, so this is the one place school identity lives
// for the current division's matches.
const schoolOf = (name: string) => name.replace(/\s#\d+$/, "")

function buildSchoolStats(matches: Match[]): SchoolStat[] {
  const map = new Map<string, SchoolStat>()
  const ensure = (school: string) => {
    if (!map.has(school)) map.set(school, { school, wins: 0, losses: 0, matchesPlayed: 0, winRate: 0 })
    return map.get(school)!
  }

  for (const match of matches) {
    if (match.status !== "COMPLETED" || !match.team1 || !match.team2) continue
    let wins1 = 0
    let wins2 = 0
    for (const game of match.games) {
      if (game.ocrStatus !== "VERIFIED") continue
      if (game.winner === "team1") wins1++
      else if (game.winner === "team2") wins2++
    }
    if (wins1 === wins2) continue

    const s1 = ensure(schoolOf(match.team1.name))
    const s2 = ensure(schoolOf(match.team2.name))
    s1.matchesPlayed++
    s2.matchesPlayed++
    if (wins1 > wins2) {
      s1.wins++
      s2.losses++
    } else {
      s2.wins++
      s1.losses++
    }
  }

  for (const stat of map.values()) {
    stat.winRate = stat.matchesPlayed > 0 ? Math.round((stat.wins / stat.matchesPlayed) * 100) : 0
  }

  return Array.from(map.values())
    .filter((s) => s.matchesPlayed > 0)
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
}

// Live counterpart to the public SchoolStats component — staff need this
// during a running tournament, so unlike the public version it is not
// gated on tournament.status.
export function SchoolWinRate({ matches }: { matches: Match[] }) {
  const stats = useMemo(() => buildSchoolStats(matches), [matches])
  const maxWins = Math.max(...stats.map((s) => s.wins), 1)

  if (stats.length === 0) return null

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden mb-5">
      <CardHeader
        icon={<TrendingUp className="w-4 h-4 text-brand" />}
        title="สถิติโรงเรียน (สดตามรุ่นนี้)"
        action={<span className="text-xs text-muted-foreground">{stats.length} โรงเรียน</span>}
      />
      <div className="px-5 py-2 grid grid-cols-[1fr_56px_56px_64px] gap-x-3 items-center border-b border-border bg-surface text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <span>โรงเรียน</span>
        <span className="text-center">ชนะ/แพ้</span>
        <span className="text-center">แมตช์</span>
        <span className="text-center">วิน%</span>
      </div>
      <div className="divide-y divide-border">
        {stats.map((s) => (
          <div key={s.school} className="px-5 py-2.5 grid grid-cols-[1fr_56px_56px_64px] gap-x-3 items-center">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight" title={s.school}>
                {s.school}
              </p>
              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-full">
                <motion.div
                  className="h-full bg-brand rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.wins / maxWins) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
            <div className="text-center flex items-center justify-center gap-1 text-xs font-bold">
              <span className="text-win">{s.wins}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-lose">{s.losses}</span>
            </div>
            <p className="text-center text-sm font-semibold text-foreground">{s.matchesPlayed}</p>
            <span className={`text-center text-sm font-bold ${s.winRate >= 75 ? "text-win" : s.winRate >= 50 ? "text-brand" : "text-muted-foreground"}`}>
              {s.winRate}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
