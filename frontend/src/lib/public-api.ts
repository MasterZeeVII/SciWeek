// Read-only client for the public (no-login) endpoints.

export type DivisionLevel = "JUNIOR" | "SENIOR"

/** One verified game inside a series — winner/kills keyed "team1"/"team2"
 * relative to the match's own team order, same convention as the admin API. */
export interface PublicGame {
  number: number
  winner: "team1" | "team2"
  kills1: number | null
  kills2: number | null
}

export interface PublicMatch {
  id: string
  matchNumber: number
  /** Match this winner advances into — null for the final / 3rd-place game. */
  nextMatchId: string | null
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  bestOf: number
  team1: string | null
  team2: string | null
  score1: number | null
  score2: number | null
  winner: string | null
  isThirdPlace: boolean
  games: PublicGame[]
}

export interface PublicRound {
  name: string
  matches: PublicMatch[]
}

export interface Stage {
  id: number
  divisionId: number
  level: DivisionLevel
  name: string
  type: string
  slots: number
  status: "completed" | "ongoing" | "upcoming"
  rounds: PublicRound[]
}

export interface Participant {
  id: string
  name: string
  school: string
  level: DivisionLevel
}

export interface Standing {
  level: DivisionLevel
  first: string | null
  second: string | null
  third: string | null
}

export interface TournamentSummary {
  id: string
  name: string
  year: number
  status: "Live" | "Past"
  teamCount: number
  champions: { level: DivisionLevel; team: string }[]
}

export interface TournamentDetail {
  id: string
  name: string
  year: number
  status: "Live" | "Past"
  teamCount: number
  playersPerTeam: number | null
  stages: Stage[]
  participants: Participant[]
  standings: Standing[]
}

export const LEVEL_LABEL: Record<DivisionLevel, string> = {
  JUNIOR: "ม.ต้น",
  SENIOR: "ม.ปลาย",
}

async function get<T>(path: string): Promise<T> {
  // This is polled every few seconds while a tournament is live — never
  // serve a cached response, or the bracket can visibly lag behind admin.
  const response = await fetch(path, { cache: "no-store" })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`)
  }
  return data as T
}

export interface HallOfFameEntry {
  school: string
  titles: number
  years: number[]
  everySeason: boolean
}

export interface DashboardStats {
  totalMatches: number
  schoolCount: number
  topSchools: { name: string; wins: number }[]
  totalSeasons: number
  hallOfFame: HallOfFameEntry[]
}

export function fetchTournaments(): Promise<TournamentSummary[]> {
  return get<{ tournaments: TournamentSummary[] }>("/api/public/tournaments/").then(
    (data) => data.tournaments,
  )
}

export function fetchDashboardStats(): Promise<DashboardStats> {
  return get<DashboardStats>("/api/public/dashboard-stats/")
}

export interface AdminBroadcastRecord {
  id: number
  createdAt: string
  payload: {
    key: string
    stageName: string
    roundName: string
    isThirdPlace: boolean
    bestOf: number
    gameNumber: number
    team1: string
    team2: string
    kills1: number | null
    kills2: number | null
    winner: "team1" | "team2"
    outcome: "advance" | "champion" | "third-place" | null
    advanceRoundName: string | null
    message: string | null
  }
}

/** Latest thing an admin pushed with `/notify` from the broadcast console
 * (`admin/pages/admin-broadcast.tsx`), or null if nothing has been pushed
 * since the server started. Polled alongside the tournament detail while
 * a tournament is Live so it can be replayed as a MatchResultBroadcast. */
export function fetchLatestBroadcast(): Promise<AdminBroadcastRecord | null> {
  return get<{ broadcast: AdminBroadcastRecord | null }>("/api/broadcast/").then(
    (data) => data.broadcast,
  )
}

export async function fetchTournament(id: string): Promise<TournamentDetail> {
  const detail = await get<TournamentDetail>(`/api/public/tournaments/${id}/`)
  // Backend sends English level labels; the public site speaks Thai.
  return {
    ...detail,
    stages: detail.stages.map((stage) => ({
      ...stage,
      name: LEVEL_LABEL[stage.level] ?? stage.name,
    })),
  }
}
