export interface TeamMember {
  id: string
  name: string
  inGameName?: string | null
}

export interface Team {
  id: string
  name: string
  seed: number
  schoolId?: number
  teamNumber?: number
  members: TeamMember[]
}

export interface Game {
  id: number
  number?: number
  winner: "team1" | "team2" | null
  team1Score: number | null
  team2Score: number | null
  ocrStatus?: "PENDING" | "UPLOADED" | "OCR_DONE" | "VERIFIED" | "REJECTED"
  imagePath?: string | null
  uploadedBy?: CurrentUser | null
  uploadedAt?: string | null
  verifiedBy?: CurrentUser | null
  verifiedAt?: string | null
  rejectReason?: string | null
  rawOcrJson?: unknown
}

export interface Match {
  id: string
  round: number
  position: number
  team1: Team | null
  team2: Team | null
  games: Game[]
  bestOf: number
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED"
  winnerTeamId?: string | null
}

export interface RoundConfig {
  round: number
  bestOf: number
  name: string
}

export interface Tournament {
  id: string
  name: string
  teams: Team[]
  matches: Match[]
  divisions?: DivisionSummary[]
  selectedDivision?: DivisionDetail | null
  roundConfigs: RoundConfig[]
  status: "setup" | "in-progress" | "completed"
}

export type BracketSize = 2 | 4 | 8 | 16 | 32

export interface CurrentUser {
  id: number
  username: string
  role: "ADMIN" | "MONITOR" | "FIELD_STAFF"
}

export interface DivisionSummary {
  id: number
  level: "JUNIOR" | "SENIOR"
  levelLabel: string
  teamCount: number
  hasBracket: boolean
}

export interface DivisionDetail {
  id: number
  level: "JUNIOR" | "SENIOR"
  levelLabel: string
  maxTeams: number
  defaultBestOf: number
  teams: Team[]
  matches: Match[]
  roundConfigs: RoundConfig[]
  hasBracket: boolean
}
