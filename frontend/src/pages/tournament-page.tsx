import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { fetchTournament, type Stage, type TournamentDetail } from "@/lib/public-api"
import { SiteTopbar } from "@/components/public/site-topbar"
import { TournamentHeader } from "@/components/public/tournament-header"
import { NavTabs, type TabId } from "@/components/public/nav-tabs"
import { TabOverview } from "@/components/public/tab-overview"
import { TabBracket } from "@/components/public/tab-bracket"
import { TabMatches } from "@/components/public/tab-matches"
import { TabParticipants } from "@/components/public/tab-participants"
import { MatchResultBroadcast, type BroadcastGameResult } from "@/components/public/match-result-broadcast"

// Kept close to the admin panel's own 6s poll so a spectator's bracket
// doesn't visibly lag behind what staff are looking at during live play.
const LIVE_REFRESH_MS = 8_000

// How long a result reveal holds on screen before auto-dismissing — this is
// a spectator display, nobody may be at the keyboard to click it away.
const BROADCAST_HOLD_MS = 6_000

function findRoundName(stage: Stage, matchId: string | null): string | null {
  if (!matchId) return null
  for (const round of stage.rounds) {
    if (round.matches.some((match) => match.id === matchId)) return round.name
  }
  return null
}

// The public payload only ever includes VERIFIED games, so "a game number
// that wasn't in the previous poll" *is* "a game that just got verified" —
// diffing two polls is all the trigger needs, no extra plumbing.
function diffBroadcastResults(previous: TournamentDetail, next: TournamentDetail): BroadcastGameResult[] {
  const previousGameNumbers = new Map<string, Set<number>>()
  for (const stage of previous.stages) {
    for (const round of stage.rounds) {
      for (const match of round.matches) {
        previousGameNumbers.set(match.id, new Set(match.games.map((game) => game.number)))
      }
    }
  }

  const results: BroadcastGameResult[] = []

  for (const stage of next.stages) {
    stage.rounds.forEach((round, roundIdx) => {
      for (const match of round.matches) {
        const team1 = match.team1
        const team2 = match.team2
        if (team1 === null || team2 === null) continue

        const seenNumbers = previousGameNumbers.get(match.id)
        const newGames = match.games
          .filter((game) => !seenNumbers?.has(game.number))
          .sort((a, b) => a.number - b.number)
        if (newGames.length === 0) continue

        let outcome: BroadcastGameResult["outcome"] = null
        let advanceRoundName: string | null = null
        if (match.winner !== null) {
          if (match.isThirdPlace) {
            outcome = "third-place"
          } else if (roundIdx === stage.rounds.length - 1) {
            outcome = "champion"
          } else {
            outcome = "advance"
            advanceRoundName = findRoundName(stage, match.nextMatchId)
          }
        }

        for (const game of newGames) {
          results.push({
            key: `${match.id}:${game.number}`,
            stageName: stage.name,
            roundName: round.name,
            isThirdPlace: match.isThirdPlace,
            bestOf: match.bestOf,
            gameNumber: game.number,
            team1,
            team2,
            kills1: game.kills1,
            kills2: game.kills2,
            winner: game.winner,
            outcome,
            advanceRoundName,
          })
        }
      }
    })
  }

  return results
}

export function TournamentPage() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<TournamentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [broadcastQueue, setBroadcastQueue] = useState<BroadcastGameResult[]>([])
  // Diffing mirror, kept outside state so the diff runs once per poll as a
  // plain side effect rather than inside a setState updater (StrictMode
  // double-invokes updaters — see the toast/diff rule in tournament-context.tsx).
  const previousRef = useRef<TournamentDetail | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    let timer: number | undefined
    // New tournament view: don't diff against the last one, and clear any
    // reveal still queued from it.
    previousRef.current = null
    setBroadcastQueue([])

    const load = async () => {
      try {
        const detail = await fetchTournament(id)
        if (cancelled) return
        setTournament(detail)
        setError(null)
        if (previousRef.current) {
          const newResults = diffBroadcastResults(previousRef.current, detail)
          if (newResults.length > 0) {
            setBroadcastQueue((queue) => [...queue, ...newResults])
          }
        }
        previousRef.current = detail
        // Live tournament: keep the projector/spectator view fresh
        if (detail.status === "Live") {
          timer = window.setTimeout(load, LIVE_REFRESH_MS)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ")
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [id])

  const activeBroadcast = broadcastQueue[0] ?? null

  const dismissBroadcast = useCallback(() => {
    setBroadcastQueue((queue) => queue.slice(1))
  }, [])

  useEffect(() => {
    if (!activeBroadcast) return
    const t = window.setTimeout(dismissBroadcast, BROADCAST_HOLD_MS)
    return () => window.clearTimeout(t)
  }, [activeBroadcast, dismissBroadcast])

  if (error) {
    return (
      <main className="min-h-screen bg-background font-sans flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Link to="/" className="text-sm font-semibold text-brand">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </main>
    )
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-background font-sans flex items-center justify-center">
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </main>
    )
  }

  const stage1 = tournament.stages[0]
  const stage2 = tournament.stages[1]

  return (
    <main className="min-h-screen bg-background font-sans">
      <SiteTopbar crumb={tournament.name} />

      <TournamentHeader tournament={tournament} />
      <NavTabs activeTab={activeTab} onTabChange={setActiveTab} stages={tournament.stages} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {activeTab === "overview" && (
              <TabOverview tournament={tournament} onTabChange={setActiveTab} />
            )}
            {activeTab === "stage-1" && stage1 && (
              <TabBracket stage={stage1} />
            )}
            {activeTab === "stage-2" && stage2 && (
              <TabBracket stage={stage2} />
            )}
            {activeTab === "matches" && (
              <TabMatches tournament={tournament} />
            )}
            {activeTab === "participants" && (
              <TabParticipants
                participants={tournament.participants}
                totalTeams={tournament.teamCount}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {activeBroadcast && (
        <MatchResultBroadcast result={activeBroadcast} onClose={dismissBroadcast} />
      )}
    </main>
  )
}
