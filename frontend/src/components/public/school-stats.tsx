import { useMemo } from "react"
import { motion } from "motion/react"
import { TrendingUp, Shield, Swords, Award } from "lucide-react"
import type { TournamentDetail } from "@/lib/public-api"
import { CardHeader } from "@/components/ui/card"

type SchoolStat = {
  school: string
  wins: number
  losses: number
  matchesPlayed: number
  winRate: number
  titles: number
}

function buildStats(tournament: TournamentDetail): SchoolStat[] {
  // Team display names -> school, straight from the participants payload
  const schoolByTeam = new Map<string, string>()
  for (const p of tournament.participants) {
    schoolByTeam.set(p.name, p.school)
  }

  const map = new Map<string, SchoolStat>()
  const ensure = (teamName: string) => {
    const school = schoolByTeam.get(teamName) ?? teamName
    if (!map.has(school)) {
      map.set(school, { school, wins: 0, losses: 0, matchesPlayed: 0, winRate: 0, titles: 0 })
    }
    return map.get(school)!
  }

  // Count wins/losses from all decided bracket matches
  for (const stage of tournament.stages) {
    for (const round of stage.rounds) {
      for (const match of round.matches) {
        if (!match.winner || !match.team1 || !match.team2) continue
        const s1 = ensure(match.team1)
        const s2 = ensure(match.team2)
        s1.matchesPlayed++
        s2.matchesPlayed++
        if (match.winner === match.team1) {
          s1.wins++
          s2.losses++
        } else {
          s2.wins++
          s1.losses++
        }
      }
    }
  }

  // Count champion titles from the standings
  for (const standing of tournament.standings) {
    if (!standing.first) continue
    const school = schoolByTeam.get(standing.first)
    const stat = school ? map.get(school) : undefined
    if (stat) stat.titles++
  }

  // Compute win rate
  for (const stat of map.values()) {
    stat.winRate = stat.matchesPlayed > 0 ? Math.round((stat.wins / stat.matchesPlayed) * 100) : 0
  }

  return Array.from(map.values())
    .filter((s) => s.matchesPlayed > 0)
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const rowItem = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
}

export function SchoolStats({ tournament }: { tournament: TournamentDetail }) {
  const stats = useMemo(() => buildStats(tournament), [tournament])
  const maxWins = Math.max(...stats.map((s) => s.wins), 1)

  if (stats.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="bg-card rounded-lg border border-border overflow-hidden"
    >
      <CardHeader
        icon={<TrendingUp className="w-4 h-4 text-brand" />}
        title="สถิติโรงเรียน"
        action={<span className="text-xs text-muted-foreground">{stats.length} โรงเรียน</span>}
      />

      {/* Summary stat strip */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { icon: Swords, label: "แมตช์ทั้งหมด", value: stats.reduce((a, b) => a + b.matchesPlayed, 0) / 2 },
          { icon: Shield, label: "โรงเรียนที่เข้าร่วม", value: stats.length },
          { icon: Award, label: "แชมป์รวม", value: stats.filter((s) => s.titles > 0).length },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="px-4 py-3 text-center">
            <Icon className="w-4 h-4 text-brand mx-auto mb-1" />
            <p className="text-lg font-extrabold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Column headers */}
      <div className="px-5 py-2 grid grid-cols-[auto_1fr_56px_56px_64px_56px] gap-x-3 items-center border-b border-border bg-surface text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <span className="w-6 text-center">#</span>
        <span>โรงเรียน</span>
        <span className="text-center">ชนะ/แพ้</span>
        <span className="text-center">แมตช์</span>
        <span className="text-center">วิน%</span>
        <span className="text-center">แชมป์</span>
      </div>

      {/* Rows */}
      <motion.ul
        variants={container}
        initial="hidden"
        animate="show"
        className="divide-y divide-border"
      >
        {stats.map((s, i) => {
          const barWidth = (s.wins / maxWins) * 100
          const isChamp = s.titles > 0
          return (
            <motion.li
              key={s.school}
              variants={rowItem}
              className={`px-5 py-3 grid grid-cols-[auto_1fr_56px_56px_64px_56px] gap-x-3 items-center
                ${isChamp ? "bg-yellow-50/60" : "hover:bg-surface/70"}
                transition-colors`}
            >
              {/* Rank */}
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-white" : "bg-surface text-muted-foreground"}`}>
                {i + 1}
              </span>

              {/* School name + win bar */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-tight" title={s.school}>
                  {s.school}
                </p>
                {/* Animated win bar */}
                <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden w-full">
                  <motion.div
                    className="h-full bg-brand rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 + i * 0.04 }}
                  />
                </div>
              </div>

              {/* W/L */}
              <div className="text-center flex items-center justify-center gap-1 text-xs font-bold">
                <span className="text-win">{s.wins}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-lose">{s.losses}</span>
              </div>

              {/* Matches */}
              <p className="text-center text-sm font-semibold text-foreground">{s.matchesPlayed}</p>

              {/* Win rate */}
              <div className="text-center">
                <span className={`text-sm font-bold
                  ${s.winRate >= 75 ? "text-win" : s.winRate >= 50 ? "text-brand" : "text-muted-foreground"}`}>
                  {s.winRate}%
                </span>
              </div>

              {/* Titles */}
              <div className="text-center">
                {s.titles > 0
                  ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-white text-xs font-bold">{s.titles}</span>
                  : <span className="text-muted-foreground text-xs">—</span>
                }
              </div>
            </motion.li>
          )
        })}
      </motion.ul>
    </motion.section>
  )
}
