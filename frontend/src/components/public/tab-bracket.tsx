import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { X } from "lucide-react"
import type { Stage } from "@/lib/public-api"
import type { Match, Team } from "@/lib/tournament-types"
import { BracketCanvas, getSeriesScore, getWinner, type BracketLabels } from "@/components/bracket/bracket-canvas"
import { StatusPill } from "@/components/ui/status-pill"

type Props = {
  stage: Stage
}

const STAGE_STATUS = {
  completed: { label: "เสร็จสิ้น", variant: "win" as const },
  ongoing: { label: "กำลังดำเนินการ", variant: "attention" as const },
  upcoming: { label: "ยังไม่เริ่ม", variant: "neutral" as const },
}

const THAI_LABELS: Partial<BracketLabels> = {
  subtitle: (teamCount) => `${teamCount} ทีม — แพ้คัดออก`,
  dragHint: "ลากเพื่อเลื่อนดู",
  trackTeam: "ติดตามทีม",
  champion: "แชมป์เปี้ยน",
  thirdPlace: "ชิงอันดับ 3",
  roundName: (round, totalRounds) => {
    if (totalRounds && round === totalRounds) return "รอบชิงชนะเลิศ"
    if (totalRounds && round === totalRounds - 1) return "รอบรองชนะเลิศ"
    return `รอบที่ ${round}`
  },
}

// The public API only exposes team names + an aggregate series score, not
// per-game history or real team ids — synthesize the shapes the shared
// bracket canvas expects. One placeholder "game" per match is enough for
// getWinner()/getSeriesScore() to render correctly.
function adaptStageToBracket(stage: Stage): { matches: Match[]; teams: Team[] } {
  const teamsByName = new Map<string, Team>()
  let seedCounter = 0
  const ensureTeam = (name: string | null): Team | null => {
    if (name === null) return null
    let team = teamsByName.get(name)
    if (!team) {
      seedCounter += 1
      team = { id: `team-${seedCounter}`, name, seed: seedCounter, members: [] }
      teamsByName.set(name, team)
    }
    return team
  }

  const matches: Match[] = stage.rounds.flatMap((round, roundIdx) =>
    round.matches.map((m): Match => {
      const team1 = ensureTeam(m.team1)
      const team2 = ensureTeam(m.team2)

      // getWinner()/getSeriesScore() in the shared canvas tally wins by
      // counting each game's `winner` field. The API now sends the real
      // verified games (with kill scores) — use them directly; fall back
      // to fabricating one game per series win for older payloads that
      // only carried the aggregate score.
      let games: Match["games"]
      if (m.games && m.games.length > 0) {
        games = m.games.map((game, index) => ({
          id: index + 1,
          number: game.number,
          winner: game.winner,
          team1Score: game.kills1,
          team2Score: game.kills2,
        }))
      } else {
        games = []
        let gameNumber = 0
        for (let i = 0; i < (m.score1 ?? 0); i++) {
          gameNumber += 1
          games.push({ id: gameNumber, number: gameNumber, winner: "team1", team1Score: null, team2Score: null })
        }
        for (let i = 0; i < (m.score2 ?? 0); i++) {
          gameNumber += 1
          games.push({ id: gameNumber, number: gameNumber, winner: "team2", team1Score: null, team2Score: null })
        }
      }

      return {
        id: m.id,
        round: roundIdx + 1,
        position: m.matchNumber - 1,
        team1,
        team2,
        bestOf: m.bestOf,
        status: m.status,
        games,
      }
    }),
  )

  return { matches, teams: Array.from(teamsByName.values()) }
}

export function TabBracket({ stage }: Props) {
  const status = STAGE_STATUS[stage.status]
  const { matches, teams } = useMemo(() => adaptStageToBracket(stage), [stage])
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Stage header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            สาย {stage.id} — {stage.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stage.type} · {stage.slots} slots
          </p>
        </div>
        <StatusPill variant={status.variant}>{status.label}</StatusPill>
      </div>

      {stage.rounds.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          ยังไม่มีการจับสายสำหรับรอบนี้
        </div>
      ) : (
        <div className="h-[70vh] min-h-[420px] rounded-xl border border-border overflow-hidden">
          <BracketCanvas
            tournamentName={stage.name}
            matches={matches}
            teams={teams}
            selectedMatchId={selectedMatchId}
            onSelectMatch={setSelectedMatchId}
            labels={THAI_LABELS}
            renderDetail={(match, roundName) => (
              <PublicMatchDetail
                match={match}
                roundName={roundName}
                onClose={() => setSelectedMatchId(null)}
              />
            )}
          />
        </div>
      )}
    </motion.div>
  )
}

/* Read-only detail card: series + verified per-game kill scores, shown
   when a spectator clicks a match in the bracket */
function PublicMatchDetail({
  match,
  roundName,
  onClose,
}: {
  match: Match
  roundName: string
  onClose: () => void
}) {
  const [s1, s2] = getSeriesScore(match)
  const winner = getWinner(match)
  const hasKills = match.games.some((g) => g.team1Score !== null || g.team2Score !== null)

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(92%,26rem)] bg-card border border-border rounded-xl shadow-xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {roundName} · BO{match.bestOf}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
        <span className={`text-sm font-bold text-right truncate ${winner && winner.id === match.team1?.id ? "text-win" : "text-foreground"}`}>
          {match.team1?.name ?? "TBD"}
        </span>
        <span className="text-lg font-black whitespace-nowrap">
          {s1} <span className="text-xs font-normal text-muted-foreground">vs</span> {s2}
        </span>
        <span className={`text-sm font-bold truncate ${winner && winner.id === match.team2?.id ? "text-win" : "text-foreground"}`}>
          {match.team2?.name ?? "TBD"}
        </span>
      </div>

      {match.games.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground">ยังไม่มีผลเกมที่ยืนยันแล้ว</p>
      ) : (
        <div className="flex flex-col gap-1">
          {match.games.map((game, index) => (
            <div
              key={game.id}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm rounded-lg bg-muted/50 px-3 py-1.5"
            >
              <span className={`text-right font-bold ${game.winner === "team1" ? "text-win" : "text-lose"}`}>
                {game.team1Score ?? (game.winner === "team1" ? "ชนะ" : "แพ้")}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground w-12 text-center">
                เกม {game.number ?? index + 1}
              </span>
              <span className={`font-bold ${game.winner === "team2" ? "text-win" : "text-lose"}`}>
                {game.team2Score ?? (game.winner === "team2" ? "ชนะ" : "แพ้")}
              </span>
            </div>
          ))}
          {!hasKills && (
            <p className="text-center text-[10px] text-muted-foreground mt-1">
              ยังไม่มีคะแนน kill ที่บันทึกไว้สำหรับแมตช์นี้
            </p>
          )}
        </div>
      )}
    </div>
  )
}
