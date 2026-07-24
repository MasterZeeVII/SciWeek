import type { Game } from "@/lib/tournament-types"

/** Side-agnostic scan result stored on a game: the winning side's kill
 * score, the losing side's, and (optionally) which TEAM the field staff
 * said won. Which team gets which number is decided by a human, never by
 * screen position — RoV swaps blue/red between games. */
export interface ScanInfo {
  victory: number | null
  lose: number | null
  winnerTeamId: string | null
}

export function getScanInfo(game: Game): ScanInfo | null {
  const raw = game.rawOcrJson
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>

  let victory = typeof obj.victory === "number" ? obj.victory : null
  let lose = typeof obj.lose === "number" ? obj.lose : null
  if (victory === null && lose === null) {
    // Legacy shape from before the winner-hint redesign
    const score = obj.Score as Record<string, unknown> | undefined
    if (score && typeof score === "object") {
      victory = typeof score.Victory === "number" ? score.Victory : null
      lose = typeof score.Lose === "number" ? score.Lose : null
    }
  }
  if (victory === null && lose === null) return null

  const hint = obj.winnerTeamId
  return {
    victory,
    lose,
    winnerTeamId: hint === null || hint === undefined ? null : String(hint),
  }
}
