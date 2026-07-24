import type { Game } from "@/lib/tournament-types"

/** Shared look for a game's OCR pipeline state so every admin page
 * (matches, scan, bracket) speaks the same visual language. */
export type OcrStatus = NonNullable<Game["ocrStatus"]>

export const STATUS_LABEL: Record<OcrStatus, string> = {
  PENDING: "ยังไม่มีผล",
  UPLOADED: "อัปโหลดแล้ว",
  OCR_DONE: "รอยืนยัน",
  VERIFIED: "ยืนยันแล้ว",
  REJECTED: "ถูกปฏิเสธ",
}

export function statusClass(status: OcrStatus) {
  if (status === "VERIFIED") return "bg-win/10 text-win border-win/30"
  if (status === "OCR_DONE") return "bg-attention/10 text-attention border-attention/30"
  if (status === "REJECTED") return "bg-lose/10 text-lose border-lose/30"
  if (status === "UPLOADED") return "bg-brand/10 text-brand border-brand/30"
  return "bg-muted text-muted-foreground border-border"
}

/** A game that has a scan waiting on the monitor's attention. */
export function needsVerify(game: Game): boolean {
  return (game.ocrStatus === "OCR_DONE" || game.ocrStatus === "UPLOADED") && !game.winner
}

export function evidenceUrl(path?: string | null) {
  if (!path) return null
  return `/media/${path.replace(/^\/+/, "")}`
}
