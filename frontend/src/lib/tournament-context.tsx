import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { api, type ScoreRoi, toTournament } from "@/lib/api"
import type {
  BracketSize,
  CurrentUser,
  RoundConfig,
  Team,
  Tournament,
} from "@/lib/tournament-types"

// Diffs a poll's fresh state against what was already on screen and toasts
// anything another device did in the background — a field-staff scan or a
// monitor's verify — so it doesn't just silently appear.
function notifyGameChanges(previous: Tournament | null, next: Tournament) {
  if (!previous) return
  const previousMatchById = new Map(previous.matches.map((match) => [match.id, match]))

  for (const match of next.matches) {
    const previousMatch = previousMatchById.get(match.id)
    if (!previousMatch) continue

    // Keyed by game id, not array index — clear_downstream_matches()
    // deletes and recreates game rows, which can reorder or resize this
    // array, so index-pairing would mis-attribute a toast to the wrong game.
    const previousGameById = new Map(previousMatch.games.map((game) => [game.id, game]))

    match.games.forEach((game, index) => {
      const previousGame = previousGameById.get(game.id)
      if (!previousGame) return

      const wasVerified = previousGame.ocrStatus === "VERIFIED"
      const isVerified = game.ocrStatus === "VERIFIED"
      const gameLabel = `เกม ${game.number ?? index + 1}`

      if (!wasVerified && isVerified) {
        const winnerName = game.winner === "team1" ? match.team1?.name
          : game.winner === "team2" ? match.team2?.name
          : null
        // Stable id: if two polls race (or anything re-runs the diff),
        // sonner replaces the existing toast instead of stacking a twin.
        toast.success(
          winnerName
            ? `ยืนยันผลแล้ว — ${winnerName} ชนะ ${gameLabel}`
            : `ยืนยันผล ${gameLabel} แล้ว`,
          { id: `game-verified-${game.id}` },
        )
        return
      }

      const wasScanned = !!previousGame.ocrStatus && previousGame.ocrStatus !== "PENDING"
      const isScanned = !!game.ocrStatus && game.ocrStatus !== "PENDING"
      if (!wasScanned && isScanned) {
        const teams = [match.team1?.name, match.team2?.name].filter(Boolean).join(" vs ")
        toast.info(`มีการสแกนคะแนนใหม่ — ${gameLabel}${teams ? ` (${teams})` : ""}`, {
          id: `game-scanned-${game.id}`,
        })
      }
    })
  }
}

interface TournamentContextType {
  user: CurrentUser | null
  loading: boolean
  error: string | null
  tournament: Tournament | null
  selectedDivisionId: number | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  selectDivision: (divisionId: number) => Promise<void>
  createTournament: (name: string, year?: number) => Promise<void>
  activateTournament: (tournamentId: string | number) => Promise<void>
  addTeam: (team: Omit<Team, "id" | "seed">) => Promise<void>
  updateTeam: (id: string, team: Partial<Omit<Team, "id">>) => Promise<void>
  removeTeam: (id: string) => Promise<void>
  reorderTeams: (teams: Team[]) => void
  shuffleQueue: () => void
  updateRoundConfig: (round: number, bestOf: number) => void
  generateBracket: (options?: { randomize?: boolean; thirdPlace?: boolean }) => Promise<void>
  updateMatchResult: (
    matchId: string,
    gameIndex: number,
    winner: "team1" | "team2" | null,
    team1Score?: number | null,
    team2Score?: number | null,
    options?: { useScanScores?: boolean },
  ) => Promise<void>
  rejectGameScan: (matchId: string, gameIndex: number, reason: string) => Promise<void>
  scanGameScore: (
    matchId: string,
    gameIndex: number,
    image: string,
    rois: {
      roi_score_left: ScoreRoi
      roi_score_right: ScoreRoi
      roi_full: ScoreRoi
    },
    winnerTeamId?: string | null,
  ) => Promise<{ team1Score: number | null; team2Score: number | null; evidenceFull: string | null }>
  resetTournament: () => Promise<void>
  refresh: () => Promise<void>
  getBracketSize: () => BracketSize | null
  getRoundConfigs: () => RoundConfig[]
}

const TournamentContext = createContext<TournamentContextType | null>(null)

export function useTournament() {
  const context = useContext(TournamentContext)
  if (!context) {
    throw new Error("useTournament must be used within TournamentProvider")
  }
  return context
}

function reseedTeams(teams: Team[]): Team[] {
  return teams.map((team, index) => ({ ...team, seed: index + 1 }))
}

function shuffled<T>(items: T[]): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

function inferBracketSize(teamCount: number): BracketSize | null {
  if ([2, 4, 8, 16, 32].includes(teamCount)) {
    return teamCount as BracketSize
  }
  return null
}

function defaultRoundConfigs(bracketSize: BracketSize | null, existing: RoundConfig[] = []): RoundConfig[] {
  if (!bracketSize) return []
  const totalRounds = Math.log2(bracketSize)
  return Array.from({ length: totalRounds }, (_, index) => {
    const round = index + 1
    const current = existing.find((config) => config.round === round)
    let bestOf = 3
    if (round === totalRounds) bestOf = 7
    else if (round === totalRounds - 1) bestOf = 5
    return {
      round,
      bestOf: current?.bestOf ?? bestOf,
      name: current?.name ?? `Round ${round}`,
    }
  })
}

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null)
  // Mirror of `tournament` for diffing inside applyState. The diff must NOT
  // live inside the setTournament updater: React StrictMode double-invokes
  // updaters, which made every background-change toast appear twice.
  const tournamentRef = useRef<Tournament | null>(null)

  const applyState = useCallback(
    (state: Awaited<ReturnType<typeof api.state>>, options?: { notify?: boolean }) => {
      const nextTournament = toTournament(state)
      setUser(state.user)
      setSelectedDivisionId(state.division?.id ?? null)
      if (!nextTournament) {
        tournamentRef.current = null
        setTournament(null)
        return
      }
      const bracketSize = inferBracketSize(nextTournament.teams.length)
      const merged: Tournament = {
        ...nextTournament,
        teams: reseedTeams(nextTournament.teams),
        roundConfigs:
          nextTournament.roundConfigs.length > 0
            ? nextTournament.roundConfigs
            : defaultRoundConfigs(bracketSize),
      }
      // Only toast for changes a background poll picked up — someone
      // else's scan/verify showing up on this screen. A user's own
      // action already gets immediate feedback from what they clicked.
      if (options?.notify) notifyGameChanges(tournamentRef.current, merged)
      tournamentRef.current = merged
      setTournament(merged)
    },
    [],
  )

  const loadState = useCallback(
    async (divisionId?: number | null, options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true)
      setError(null)
      try {
        const state = await api.state(divisionId ?? selectedDivisionId)
        applyState(state, { notify: options?.silent })
      } catch (err) {
        if (!options?.silent) {
          setError(err instanceof Error ? err.message : "Cannot load tournament state.")
        }
      } finally {
        if (!options?.silent) setLoading(false)
      }
    },
    [applyState, selectedDivisionId],
  )

  // Local-only updates (reorder/shuffle/round config/logout) bypass
  // applyState — keep the diffing mirror in sync with whatever rendered.
  useEffect(() => {
    tournamentRef.current = tournament
  }, [tournament])

  useEffect(() => {
    void loadState(null)
  }, [])

  // Keep every open tab/device in sync without a manual refresh — a field
  // staff scan or a monitor's verify should show up elsewhere on its own.
  // Silent + self-scheduling (waits for the previous fetch before arming
  // the next one) so it never piles up overlapping requests, and it skips
  // fetching while the tab isn't visible to save battery/data.
  const POLL_MS = 6_000
  useEffect(() => {
    if (!user) return
    let cancelled = false
    let timer: number | undefined

    const tick = async () => {
      if (!cancelled && document.visibilityState === "visible") {
        await loadState(selectedDivisionId, { silent: true })
      }
      if (!cancelled) {
        timer = window.setTimeout(tick, POLL_MS)
      }
    }

    timer = window.setTimeout(tick, POLL_MS)
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [user, selectedDivisionId, loadState])

  const login = useCallback(
    async (username: string, password: string) => {
      setError(null)
      try {
        await api.login(username, password)
        await loadState(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed.")
      }
    },
    [loadState],
  )

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
    setTournament(null)
    setSelectedDivisionId(null)
  }, [])

  const refresh = useCallback(async () => {
    await loadState(selectedDivisionId)
  }, [loadState, selectedDivisionId])

  const selectDivision = useCallback(
    async (divisionId: number) => {
      await loadState(divisionId)
    },
    [loadState],
  )

  const createTournament = useCallback(
    async (name: string, year?: number) => {
      try {
        applyState(await api.createTournament(name, year))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot create tournament.")
        throw err
      }
    },
    [applyState],
  )

  const activateTournament = useCallback(
    async (tournamentId: string | number) => {
      try {
        applyState(await api.activateTournament(tournamentId))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot activate tournament.")
        throw err
      }
    },
    [applyState],
  )

  const addTeam = useCallback(
    async (teamData: Omit<Team, "id" | "seed">) => {
      if (!selectedDivisionId) return
      try {
        applyState(await api.addTeam(selectedDivisionId, teamData))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot add team.")
      }
    },
    [applyState, selectedDivisionId],
  )

  const updateTeam = useCallback(
    async (id: string, updates: Partial<Omit<Team, "id">>) => {
      const current = tournament?.teams.find((team) => team.id === id)
      if (!current) return
      try {
        applyState(
          await api.updateTeam(id, {
            name: updates.name ?? current.name,
            members: updates.members ?? current.members,
          }),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot update team.")
      }
    },
    [applyState, tournament?.teams],
  )

  const removeTeam = useCallback(
    async (id: string) => {
      try {
        applyState(await api.deleteTeam(id))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot delete team.")
      }
    },
    [applyState],
  )

  const reorderTeams = useCallback((teams: Team[]) => {
    setTournament((current) => {
      if (!current || current.matches.length > 0) return current
      return { ...current, teams: reseedTeams(teams) }
    })
  }, [])

  const shuffleQueue = useCallback(() => {
    setTournament((current) => {
      if (!current || current.matches.length > 0) return current
      return { ...current, teams: reseedTeams(shuffled(current.teams)) }
    })
  }, [])

  const getBracketSize = useCallback((): BracketSize | null => {
    return inferBracketSize(tournament?.teams.length ?? 0)
  }, [tournament?.teams.length])

  const getRoundConfigs = useCallback((): RoundConfig[] => {
    return defaultRoundConfigs(getBracketSize(), tournament?.roundConfigs ?? [])
  }, [getBracketSize, tournament?.roundConfigs])

  const updateRoundConfig = useCallback((round: number, bestOf: number) => {
    setTournament((current) => {
      if (!current || current.matches.length > 0) return current
      const currentConfigs = defaultRoundConfigs(inferBracketSize(current.teams.length), current.roundConfigs)
      const nextConfigs = currentConfigs.map((config) =>
        config.round === round ? { ...config, bestOf } : config,
      )
      return { ...current, roundConfigs: nextConfigs }
    })
  }, [])

  const generateBracket = useCallback(
    async (options?: { randomize?: boolean; thirdPlace?: boolean }) => {
      if (!selectedDivisionId || !tournament) return
      try {
        applyState(
          await api.generateBracket(selectedDivisionId, {
            teamOrder: tournament.teams.map((team) => team.id),
            roundConfigs: getRoundConfigs(),
            randomize: options?.randomize ?? false,
            thirdPlace: options?.thirdPlace ?? false,
          }),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot generate bracket.")
      }
    },
    [applyState, getRoundConfigs, selectedDivisionId, tournament],
  )

  const updateMatchResult = useCallback(
    async (
      matchId: string,
      gameIndex: number,
      winner: "team1" | "team2" | null,
      team1Score?: number | null,
      team2Score?: number | null,
      options?: { useScanScores?: boolean },
    ) => {
      const match = tournament?.matches.find((item) => item.id === matchId)
      const game = match?.games[gameIndex]
      if (!game) return
      try {
        applyState(
          await api.updateGameResult(game.id, {
            winner,
            team1Score,
            team2Score,
            useScanScores: options?.useScanScores,
          }),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot update game result.")
      }
    },
    [applyState, tournament?.matches],
  )

  const rejectGameScan = useCallback(
    async (matchId: string, gameIndex: number, reason: string) => {
      const match = tournament?.matches.find((item) => item.id === matchId)
      const game = match?.games[gameIndex]
      if (!game) return
      try {
        applyState(await api.rejectGame(game.id, reason))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Cannot reject scan.")
      }
    },
    [applyState, tournament?.matches],
  )

  const scanGameScore = useCallback(
    async (
      matchId: string,
      gameIndex: number,
      image: string,
      rois: {
        roi_score_left: ScoreRoi
        roi_score_right: ScoreRoi
        roi_full: ScoreRoi
      },
      winnerTeamId?: string | null,
    ) => {
      const match = tournament?.matches.find((item) => item.id === matchId)
      const game = match?.games[gameIndex]
      if (!game) {
        throw new Error("Game not found.")
      }
      const response = await api.scanScore(game.id, { image, ...rois, winnerTeamId })
      if (response.state) {
        applyState(response.state)
      }
      return {
        team1Score: response.result.Score.Victory,
        team2Score: response.result.Score.Lose,
        // Path of the evidence photo as saved on the server — proof to the
        // field staff that the upload really landed, not just a local echo.
        evidenceFull: response.evidence_full ?? null,
      }
    },
    [applyState, tournament?.matches],
  )

  const resetTournament = useCallback(async () => {
    if (!selectedDivisionId) return
    try {
      applyState(await api.resetBracket(selectedDivisionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot reset bracket.")
    }
  }, [applyState, selectedDivisionId])

  return (
    <TournamentContext.Provider
      value={{
        user,
        loading,
        error,
        tournament,
        selectedDivisionId,
        login,
        logout,
        selectDivision,
        createTournament,
        activateTournament,
        addTeam,
        updateTeam,
        removeTeam,
        reorderTeams,
        shuffleQueue,
        updateRoundConfig,
        generateBracket,
        updateMatchResult,
        rejectGameScan,
        scanGameScore,
        resetTournament,
        refresh,
        getBracketSize,
        getRoundConfigs,
      }}
    >
      {children}
    </TournamentContext.Provider>
  )
}
