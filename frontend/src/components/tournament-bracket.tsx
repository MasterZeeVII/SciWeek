"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import type { Team, Match } from "@/lib/tournament-types"
import { BracketCanvas, getWinner, getSeriesScore } from "@/components/bracket/bracket-canvas"

type DraftGame = {
  winner: "team1" | "team2" | null
  team1Score: string
  team2Score: string
}

type ScanOpenHandler = (matchId: string, gameIndex: number) => void

// Match detail panel with scoring
function MatchDetailPanel({
  match,
  roundName,
  onClose,
  onUpdateScore,
  onOpenScanner,
}: {
  match: Match
  roundName: string
  onClose: () => void
  onUpdateScore?: (matchId: string, gameIndex: number, winner: "team1" | "team2" | null, team1Score?: number | null, team2Score?: number | null) => void
  onOpenScanner?: ScanOpenHandler
}) {
  const winner = getWinner(match)
  const canResolve = !!onUpdateScore && !!match.team1 && !!match.team2
  const canScan = !!onOpenScanner && !!match.team1 && !!match.team2
  const canEdit = canResolve || canScan
  const [s1, s2] = getSeriesScore(match)
  const winsNeeded = Math.ceil(match.bestOf / 2)
  const seriesComplete = s1 >= winsNeeded || s2 >= winsNeeded
  const [draftGames, setDraftGames] = useState<DraftGame[]>([])

  // Keyed on the actual game values, not the games array reference — a
  // background poll re-fetches fresh objects every tick even when nothing
  // changed, and resyncing on identity would wipe out an in-progress edit
  // (typed-but-not-yet-submitted score) on every poll.
  const gamesKey = match.games
    .map((game) => `${game.winner ?? ""}:${game.team1Score ?? ""}:${game.team2Score ?? ""}`)
    .join("|")

  useEffect(() => {
    setDraftGames(
      match.games.map((game) => ({
        winner: game.winner,
        team1Score: game.team1Score == null ? "" : String(game.team1Score),
        team2Score: game.team2Score == null ? "" : String(game.team2Score),
      })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, gamesKey])

  function parseDraftScore(value: string): number | null {
    if (value.trim() === "") return null
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) return null
    return Math.trunc(parsed)
  }

  const commitGame = (gameIndex: number, winnerOverride?: "team1" | "team2" | null) => {
    if (!onUpdateScore || !match.team1 || !match.team2) return
    const draft = draftGames[gameIndex]
    if (!draft) return
    const winner = winnerOverride !== undefined ? winnerOverride : draft.winner
    onUpdateScore(
      match.id,
      gameIndex,
      winner,
      parseDraftScore(draft.team1Score),
      parseDraftScore(draft.team2Score),
    )
  }

  const handleWinnerClick = (gameIndex: number, team: "team1" | "team2") => {
    if (!onUpdateScore || !match.team1 || !match.team2) return

    const currentWinner = draftGames[gameIndex]?.winner ?? match.games[gameIndex].winner
    const newWinner = currentWinner === team ? null : team
    setDraftGames((current) =>
      current.map((game, index) =>
        index === gameIndex ? { ...game, winner: newWinner } : game,
      ),
    )
    commitGame(gameIndex, newWinner)
  }

  return (
    <div className="absolute inset-x-4 top-4 bottom-4 overflow-y-auto z-20 rounded-lg border border-border bg-card shadow-2xl sm:inset-x-auto sm:top-auto sm:bottom-6 sm:left-6 sm:w-96 sm:max-h-[calc(100%-3rem)]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {canEdit ? "Scan Match Score" : "Match Details"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {roundName} - Best of {match.bestOf}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {/* Teams overview */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1 text-center">
            <p className={cn("text-sm font-medium", winner?.id === match.team1?.id ? "text-primary" : "text-foreground")}>
              {match.team1?.name || "TBD"}
            </p>
            <p className="text-xs text-muted-foreground">#{match.team1?.seed || "-"}</p>
          </div>
          <div className="px-4 text-xl font-bold text-primary">
            {s1} - {s2}
          </div>
          <div className="flex-1 text-center">
            <p className={cn("text-sm font-medium", winner?.id === match.team2?.id ? "text-primary" : "text-foreground")}>
              {match.team2?.name || "TBD"}
            </p>
            <p className="text-xs text-muted-foreground">#{match.team2?.seed || "-"}</p>
          </div>
        </div>

        {/* Game scores - interactive */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {canScan
              ? canResolve
                ? "Scan ROV kill score, then choose the game winner"
                : "Scan ROV kill score"
              : "Games"}
          </p>
          {match.games.map((game, i) => {
            const draft = draftGames[i] ?? {
              winner: game.winner,
              team1Score: game.team1Score == null ? "" : String(game.team1Score),
              team2Score: game.team2Score == null ? "" : String(game.team2Score),
            }
            // Check if this game matters (previous games should be played first)
            const [currentS1, currentS2] = match.games.slice(0, i).reduce(
              ([a, b], g) => [a + (g.winner === "team1" ? 1 : 0), b + (g.winner === "team2" ? 1 : 0)],
              [0, 0]
            )
            const gameRelevant = currentS1 < winsNeeded && currentS2 < winsNeeded

            return (
              <div key={i} className={cn(
                "rounded border border-border/50 p-3 transition-colors",
                gameRelevant ? "bg-secondary/30" : "bg-secondary/10 opacity-50"
              )}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Game {i + 1}</span>
                  {game.winner && (
                    <span className="text-[10px] text-primary">
                      {game.winner === "team1" ? match.team1?.name : match.team2?.name} wins
                    </span>
                  )}
                  {!game.winner && game.ocrStatus === "OCR_DONE" && (
                    <span className="text-[10px] text-muted-foreground">Score saved</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Team 1 */}
                  <div className="flex flex-1 flex-col gap-1">
                    <span className={cn(
                      "truncate text-xs",
                      game.winner === "team1" ? "font-medium text-primary" : "text-muted-foreground"
                    )}>
                      {match.team1?.name || "TBD"}
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm font-semibold",
                          draft.winner === "team1" && "border-primary/50 bg-primary/10",
                        )}
                      >
                        {draft.team1Score || "-"}
                      </div>
                      <button
                        onClick={() => handleWinnerClick(i, "team1")}
                        disabled={!canResolve || !gameRelevant}
                        className={cn(
                          "rounded px-2 py-1 text-xs font-medium transition-all",
                          draft.winner === "team1"
                            ? "bg-primary text-primary-foreground"
                            : "border border-input bg-card text-muted-foreground hover:border-primary hover:text-primary",
                          (!canResolve || !gameRelevant) && "cursor-not-allowed opacity-50"
                        )}
                      >
                        W
                      </button>
                    </div>
                  </div>

                  <span className="text-muted-foreground">vs</span>

                  {/* Team 2 */}
                  <div className="flex flex-1 flex-col gap-1">
                    <span className={cn(
                      "truncate text-right text-xs",
                      game.winner === "team2" ? "font-medium text-primary" : "text-muted-foreground"
                    )}>
                      {match.team2?.name || "TBD"}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleWinnerClick(i, "team2")}
                        disabled={!canResolve || !gameRelevant}
                        className={cn(
                          "rounded px-2 py-1 text-xs font-medium transition-all",
                          draft.winner === "team2"
                            ? "bg-primary text-primary-foreground"
                            : "border border-input bg-card text-muted-foreground hover:border-primary hover:text-primary",
                          (!canResolve || !gameRelevant) && "cursor-not-allowed opacity-50"
                        )}
                      >
                        W
                      </button>
                      <div
                        className={cn(
                          "w-16 rounded border border-border bg-background px-2 py-1 text-center text-sm font-semibold",
                          draft.winner === "team2" && "border-primary/50 bg-primary/10",
                        )}
                      >
                        {draft.team2Score || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {canScan && gameRelevant && (
                  <button
                    onClick={() => onOpenScanner?.(match.id, i)}
                    className="mt-3 w-full rounded border border-input bg-card px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    Scan photo
                  </button>
                )}

                {(game.verifiedBy || game.uploadedBy) && (
                  <div className="mt-2 flex flex-wrap justify-between gap-2 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
                    <span>Uploaded by {game.uploadedBy?.username ?? "-"}</span>
                    <span>Verified by {game.verifiedBy?.username ?? "-"}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Series status */}
        {seriesComplete && winner && (
          <div className="mt-4 rounded bg-primary/15 px-3 py-2 text-center">
            <span className="text-xs text-muted-foreground">Winner: </span>
            <span className="text-sm font-semibold text-primary">{winner.name}</span>
          </div>
        )}

        {!seriesComplete && match.team1 && match.team2 && (
          <div className="mt-4 rounded bg-secondary px-3 py-2 text-center">
            <span className="text-xs text-muted-foreground">
              First to {winsNeeded} wins
            </span>
          </div>
        )}

        {/* Team rosters */}
        {((match.team1?.members?.length ?? 0) > 0 || (match.team2?.members?.length ?? 0) > 0) && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
            {match.team1 && match.team1.members?.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {match.team1.name} Roster
                </p>
                <div className="space-y-0.5">
                  {match.team1.members.map((m, i) => (
                    <p key={i} className="text-xs text-foreground">{m.name}</p>
                  ))}
                </div>
              </div>
            )}
            {match.team2 && match.team2.members?.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {match.team2.name} Roster
                </p>
                <div className="space-y-0.5">
                  {match.team2.members.map((m, i) => (
                    <p key={i} className="text-xs text-foreground">{m.name}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface TournamentBracketProps {
  tournamentName: string
  matches: Match[]
  teams: Team[]
  onUpdateScore?: (matchId: string, gameIndex: number, winner: "team1" | "team2" | null, team1Score?: number | null, team2Score?: number | null) => void
  onOpenScanner?: ScanOpenHandler
}

export function TournamentBracket({ tournamentName, matches, teams, onUpdateScore, onOpenScanner }: TournamentBracketProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  return (
    <BracketCanvas
      tournamentName={tournamentName}
      matches={matches}
      teams={teams}
      selectedMatchId={selectedMatchId}
      onSelectMatch={setSelectedMatchId}
      renderDetail={(match, roundName) => (
        <MatchDetailPanel
          match={match}
          roundName={roundName}
          onClose={() => setSelectedMatchId(null)}
          onUpdateScore={onUpdateScore}
          onOpenScanner={onOpenScanner}
        />
      )}
    />
  )
}
