import type { CurrentUser, DivisionDetail, DivisionSummary, Tournament } from "@/lib/tournament-types"

export interface ApiState {
  user: CurrentUser | null
  tournament: {
    id: string
    name: string
    year: number
    status: "setup" | "in-progress" | "completed"
  } | null
  divisions: DivisionSummary[]
  division: DivisionDetail | null
}

export interface ScoreRoi {
  x: number
  y: number
  width: number
  height: number
}

export interface ScanScoreResponse {
  success: true
  result: {
    Score: {
      Victory: number | null
      Lose: number | null
    }
  }
  saved_file: string | null
  evidence_score_left: string
  evidence_score_right: string
  evidence_full: string
  state: ApiState | null
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`)
  }
  return data as T
}

export function toTournament(state: ApiState): Tournament | null {
  if (!state.tournament) return null
  return {
    id: state.tournament.id,
    name: state.tournament.name,
    teams: state.division?.teams ?? [],
    matches: state.division?.matches ?? [],
    divisions: state.divisions,
    selectedDivision: state.division,
    roundConfigs: state.division?.roundConfigs ?? [],
    status: state.division?.hasBracket ? "in-progress" : "setup",
  }
}

export const api = {
  state(divisionId?: number | null) {
    const query = divisionId ? `?division_id=${divisionId}` : ""
    return request<ApiState>(`/api/state/${query}`)
  },
  login(username: string, password: string) {
    return request<{ user: CurrentUser }>("/api/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })
  },
  logout() {
    return request<{ ok: true }>("/api/logout/", { method: "POST" })
  },
  createTournament(name: string, year?: number) {
    return request<ApiState>("/api/tournaments/", {
      method: "POST",
      body: JSON.stringify(year ? { name, year } : { name }),
    })
  },
  activateTournament(tournamentId: string | number) {
    return request<ApiState>(`/api/tournaments/${tournamentId}/activate/`, {
      method: "POST",
    })
  },
  addTeam(divisionId: number, data: { name: string; members: { name: string; inGameName?: string | null }[] }) {
    return request<ApiState>(`/api/divisions/${divisionId}/teams/`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  updateTeam(teamId: string, data: { name: string; members: { name: string; inGameName?: string | null }[] }) {
    return request<ApiState>(`/api/teams/${teamId}/`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  deleteTeam(teamId: string) {
    return request<ApiState>(`/api/teams/${teamId}/`, { method: "DELETE" })
  },
  generateBracket(
    divisionId: number,
    data: {
      teamOrder: string[]
      roundConfigs: { round: number; bestOf: number; name: string }[]
      randomize?: boolean
      thirdPlace?: boolean
    },
  ) {
    return request<ApiState>(`/api/divisions/${divisionId}/generate-bracket/`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  resetBracket(divisionId: number) {
    return request<ApiState>(`/api/divisions/${divisionId}/reset-bracket/`, {
      method: "POST",
    })
  },
  updateGameResult(
    gameId: number,
    data: {
      winner: "team1" | "team2" | null
      team1Score?: number | null
      team2Score?: number | null
      useScanScores?: boolean
    },
  ) {
    return request<ApiState>(`/api/games/${gameId}/result/`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
  scanScore(
    gameId: number,
    data: {
      image: string
      roi_score_left: ScoreRoi
      roi_score_right: ScoreRoi
      roi_full: ScoreRoi
      winnerTeamId?: string | null
    },
  ) {
    return request<ScanScoreResponse>("/api/scan/", {
      method: "POST",
      body: JSON.stringify({ gameId, ...data }),
    })
  },
}
