import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Trophy } from "lucide-react"
import type { TournamentDetail, PublicMatch } from "@/lib/public-api"
import { RollingNumber } from "@/components/ui/rolling-number"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { StatusPill, type PillVariant } from "@/components/ui/status-pill"

type FlatMatch = PublicMatch & {
  stageId: number
  stageName: string
  roundName: string
  isFinal: boolean
}

type FilterStage = "all" | 1 | 2

const STAGE_STYLE: Record<number, { pillVariant: PillVariant; bar: string }> = {
  1: { pillVariant: "brand", bar: "bg-primary" },
  2: { pillVariant: "attention", bar: "bg-attention" },
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
}

export function TabMatches({ tournament }: { tournament: TournamentDetail }) {
  const [filter, setFilter] = useState<FilterStage>("all")

  const allMatches: FlatMatch[] = tournament.stages.flatMap((stage) =>
    stage.rounds.flatMap((round, roundIdx) =>
      round.matches
        // Skip pairings that don't exist yet (feeder matches undecided)
        .filter((match) => match.team1 !== null && match.team2 !== null)
        .map((match) => ({
          ...match,
          stageId: stage.id,
          stageName: stage.name,
          roundName: round.name,
          isFinal: roundIdx === stage.rounds.length - 1 && !match.isThirdPlace,
        }))
    )
  )

  const sorted = [...allMatches].reverse()
  const filtered = filter === "all" ? sorted : sorted.filter((m) => m.stageId === filter)

  const grouped = new Map<string, FlatMatch[]>()
  for (const m of filtered) {
    const key = `${m.stageId}::${m.roundName}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(m)
  }

  const stageName = (id: number) =>
    tournament.stages.find((stage) => stage.id === id)?.name ?? `สาย ${id}`

  return (
    <div>
      {/* Header row */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-wrap items-center justify-between gap-3 mb-6"
      >
        <h2 className="text-xl font-bold text-foreground">ผลการแข่งขัน</h2>
        <SegmentedControl
          layoutId="filter-pill"
          value={String(filter)}
          onChange={(v) => setFilter(v === "all" ? "all" : (Number(v) as 1 | 2))}
          options={(["all", 1, 2] as const).map((f) => ({
            value: String(f),
            label: f === "all" ? "ทั้งหมด" : stageName(f),
          }))}
        />
      </motion.div>

      {grouped.size === 0 ? (
        <div className="py-16 text-center text-muted-foreground">ยังไม่มีผลการแข่งขัน</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            variants={listVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="flex flex-col gap-8"
          >
            {Array.from(grouped.entries()).map(([key, matches]) => {
              const first = matches[0]
              const style = STAGE_STYLE[first.stageId] ?? STAGE_STYLE[1]
              return (
                <motion.section key={key} variants={itemVariants}>
                  {/* Round heading */}
                  <div className="flex items-center gap-3 mb-3">
                    <StatusPill variant={style.pillVariant} icon={first.isFinal ? <Trophy className="w-3 h-3" /> : undefined}>
                      {first.stageName}
                    </StatusPill>
                    <span className="text-sm font-bold text-foreground">
                      {first.roundName}
                      {first.isThirdPlace ? " · ชิงอันดับ 3" : ""}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="flex flex-col gap-3">
                    {matches.map((match) => (
                      <MatchCard key={match.id} match={match} stageId={first.stageId} />
                    ))}
                  </div>
                </motion.section>
              )
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

function MatchCard({ match, stageId }: { match: FlatMatch; stageId: number }) {
  const style = STAGE_STYLE[stageId] ?? STAGE_STYLE[1]
  const decided = match.winner !== null
  const t1Wins = decided && match.winner === match.team1
  const t2Wins = decided && match.winner === match.team2
  const inProgress = !decided && match.status === "IN_PROGRESS"

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.005 }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Colored top accent bar */}
      <div className={`h-1 ${style.bar}`} />

      <div className="flex items-stretch min-h-[72px]">
        {/* Team 1 */}
        <div className={`flex-1 flex flex-col items-end justify-center px-5 py-3 gap-1 transition-opacity ${!decided || t1Wins ? "" : "opacity-45"}`}>
          <span className={`text-sm font-bold text-right leading-snug ${!decided || t1Wins ? "text-foreground" : "text-muted-foreground"}`} title={match.team1 ?? undefined}>
            {match.team1}
          </span>
          {t1Wins && <span className="text-xs font-semibold text-win">ชนะ</span>}
        </div>

        {/* Score bubble */}
        <div className="flex items-center gap-0 flex-shrink-0 px-2">
          <div className={`w-12 flex items-center justify-center text-2xl font-black ${t1Wins ? "text-win" : decided ? "text-lose" : "text-muted-foreground"}`}>
            <RollingNumber value={match.score1 ?? "–"} />
          </div>
          <div className="flex flex-col items-center justify-center px-1">
            {inProgress ? (
              <span className="text-[10px] font-bold text-success leading-none animate-pulse">LIVE</span>
            ) : (
              <span className="text-xs font-bold text-muted-foreground leading-none">vs</span>
            )}
          </div>
          <div className={`w-12 flex items-center justify-center text-2xl font-black ${t2Wins ? "text-win" : decided ? "text-lose" : "text-muted-foreground"}`}>
            <RollingNumber value={match.score2 ?? "–"} />
          </div>
        </div>

        {/* Team 2 */}
        <div className={`flex-1 flex flex-col items-start justify-center px-5 py-3 gap-1 transition-opacity ${!decided || t2Wins ? "" : "opacity-45"}`}>
          <span className={`text-sm font-bold leading-snug ${!decided || t2Wins ? "text-foreground" : "text-muted-foreground"}`} title={match.team2 ?? undefined}>
            {match.team2}
          </span>
          {t2Wins && <span className="text-xs font-semibold text-win">ชนะ</span>}
        </div>
      </div>

      {/* Verified per-game kill scores — green side won that game */}
      {match.games.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 px-4 pb-3">
          {match.games.map((game) => (
            <span
              key={game.number}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-[11px] font-semibold"
              title={`เกม ${game.number}: ${match.team1} ${game.kills1 ?? "?"} - ${game.kills2 ?? "?"} ${match.team2}`}
            >
              <span className="text-muted-foreground font-medium">เกม {game.number}</span>
              <span className={game.winner === "team1" ? "text-win" : "text-lose"}>{game.kills1 ?? "?"}</span>
              <span className="text-muted-foreground">-</span>
              <span className={game.winner === "team2" ? "text-win" : "text-lose"}>{game.kills2 ?? "?"}</span>
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
