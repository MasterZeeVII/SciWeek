import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "motion/react"
import { Camera, CheckCircle2, Clock3, Network, Swords, Trophy, X } from "lucide-react"

import { STATUS_LABEL, evidenceUrl, needsVerify, statusClass } from "@/lib/game-status"
import { getScanInfo } from "@/lib/scan-info"
import { hasRole } from "@/lib/roles"
import { useTournament } from "@/lib/tournament-context"
import type { Game, Match } from "@/lib/tournament-types"
import { RollingNumber } from "@/components/ui/rolling-number"
import { StatusPill } from "@/components/ui/status-pill"
import { DivisionTabs } from "../division-tabs"
import { SchoolWinRate } from "../school-win-rate"

type SetResultFn = (
  matchId: string,
  gameIndex: number,
  winner: "team1" | "team2" | null,
  team1Score?: number | null,
  team2Score?: number | null,
  options?: { useScanScores?: boolean },
) => Promise<void>

function seriesScore(match: Match): [number, number] {
  let a = 0
  let b = 0
  for (const game of match.games) {
    if (game.ocrStatus !== "VERIFIED") continue
    if (game.winner === "team1") a++
    else if (game.winner === "team2") b++
  }
  return [a, b]
}

export function AdminMatches() {
  const { user, tournament, error, updateMatchResult, getRoundConfigs } = useTournament()
  const [openMatchId, setOpenMatchId] = useState<string | null>(null)
  const canScore = hasRole(user, "MONITOR")

  const matches = tournament?.matches ?? []
  const roundConfigs = getRoundConfigs()

  const rounds = useMemo(() => {
    const byRound = new Map<number, Match[]>()
    for (const match of matches) {
      const list = byRound.get(match.round) ?? []
      list.push(match)
      byRound.set(match.round, list)
    }
    return Array.from(byRound.entries()).sort((a, b) => a[0] - b[0])
  }, [matches])

  const allGames = matches.flatMap((m) => m.games)
  const verified = allGames.filter((g) => g.ocrStatus === "VERIFIED").length
  const waiting = allGames.filter(needsVerify).length
  const scanned = allGames.filter((g) => g.ocrStatus && g.ocrStatus !== "PENDING").length

  const roundName = (round: number) =>
    roundConfigs.find((rc) => rc.round === round)?.name ?? `รอบที่ ${round}`

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-start justify-between gap-3 mb-6 flex-wrap"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">ผลการแข่งขัน</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            บันทึกและยืนยันผลรายเกม — {tournament?.name ?? "ยังไม่มีทัวร์นาเมนต์"}
          </p>
        </div>
        <Link
          to="/admin/bracket"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground border border-border px-3 py-2 rounded-lg hover:text-foreground transition-colors"
        >
          <Network className="w-3.5 h-3.5" />
          ดูสายการแข่งขัน / สแกนคะแนน
        </Link>
      </motion.div>

      {error && (
        <div className="mb-5 rounded-lg border border-lose/40 bg-lose/10 px-4 py-3 text-sm text-lose">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "เกมที่สแกน/บันทึกแล้ว", value: scanned, icon: Camera },
          { label: "รอยืนยัน", value: waiting, icon: Clock3 },
          { label: "ยืนยันแล้ว", value: verified, icon: CheckCircle2 },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-4 flex items-center gap-3"
          >
            <item.icon className="w-5 h-5 text-brand flex-shrink-0" />
            <div>
              <p className="text-xl font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <SchoolWinRate matches={matches} />

      <div className="mb-5">
        <DivisionTabs />
      </div>

      {matches.length === 0 ? (
        <div className="bg-card border border-border rounded-lg py-16 text-center">
          <Swords className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            รุ่นนี้ยังไม่จับสาย — ตั้งค่าได้ที่หน้า
            <Link to="/admin/tournaments" className="text-brand font-semibold mx-1 hover:underline">ทัวร์นาเมนต์</Link>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {rounds.map(([round, roundMatches]) => (
            <section key={round}>
              <div className="flex items-center gap-3 mb-3">
                <StatusPill variant="brand" icon={round === rounds.length ? <Trophy className="w-3 h-3" /> : undefined}>
                  {roundName(round)}
                </StatusPill>
                <span className="text-xs text-muted-foreground">BO{roundMatches[0]?.bestOf}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex flex-col gap-2">
                {roundMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    open={openMatchId === match.id}
                    onToggle={() => setOpenMatchId(openMatchId === match.id ? null : match.id)}
                    canScore={canScore}
                    onSetResult={updateMatchResult}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function MatchRow({
  match,
  open,
  onToggle,
  canScore,
  onSetResult,
}: {
  match: Match
  open: boolean
  onToggle: () => void
  canScore: boolean
  onSetResult: SetResultFn
}) {
  const [wins1, wins2] = seriesScore(match)
  const done = match.status === "COMPLETED"
  const live = match.status === "IN_PROGRESS"
  const ready = !!match.team1 && !!match.team2
  // Surface work waiting inside without forcing the monitor to expand
  // every match: how many games have a scan sitting unverified.
  const waitingCount = match.games.filter(needsVerify).length

  return (
    <div className={`bg-card border rounded-lg overflow-hidden transition-colors ${open ? "border-brand/40" : "border-border"}`}>
      {/* Match summary row */}
      <button
        type="button"
        onClick={onToggle}
        disabled={!ready}
        className="w-full grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 disabled:cursor-default transition-colors"
      >
        <span className={`text-sm font-semibold truncate text-right ${!ready ? "text-muted-foreground italic" : done && wins1 > wins2 ? "text-win" : "text-foreground"}`}>
          {match.team1?.name ?? "รอผู้ชนะ"}
        </span>
        <span className="flex items-center gap-1.5 px-2">
          <span className={`w-8 text-center text-lg font-black ${done && wins1 > wins2 ? "text-win" : "text-foreground"}`}>
            <RollingNumber value={ready ? wins1 : "-"} />
          </span>
          <span className="text-xs text-muted-foreground">:</span>
          <span className={`w-8 text-center text-lg font-black ${done && wins2 > wins1 ? "text-win" : "text-foreground"}`}>
            <RollingNumber value={ready ? wins2 : "-"} />
          </span>
        </span>
        <span className={`text-sm font-semibold truncate ${!ready ? "text-muted-foreground italic" : done && wins2 > wins1 ? "text-win" : "text-foreground"}`}>
          {match.team2?.name ?? "รอผู้ชนะ"}
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          {waitingCount > 0 && (
            <StatusPill variant="attention" className="bg-attention text-attention-foreground border-transparent animate-pulse">
              รอยืนยัน {waitingCount}
            </StatusPill>
          )}
          <StatusPill variant={done ? "win" : live ? "attention" : "neutral"}>
            {done ? "จบแล้ว" : live ? "กำลังแข่ง" : "รอแข่ง"}
          </StatusPill>
        </span>
      </button>

      {/* Games detail */}
      {open && ready && (
        <div className="border-t border-border divide-y divide-border">
          {match.games.map((game, index) => (
            <GameRow
              key={game.id}
              match={match}
              game={game}
              gameIndex={index}
              canScore={canScore}
              onSetResult={onSetResult}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GameRow({
  match,
  game,
  gameIndex,
  canScore,
  onSetResult,
}: {
  match: Match
  game: Game
  gameIndex: number
  canScore: boolean
  onSetResult: SetResultFn
}) {
  const [score1, setScore1] = useState(game.team1Score?.toString() ?? "")
  const [score2, setScore2] = useState(game.team2Score?.toString() ?? "")
  const [busy, setBusy] = useState(false)
  const [manualOverride, setManualOverride] = useState(false)
  const status = game.ocrStatus ?? "PENDING"
  const url = evidenceUrl(game.imagePath)
  const scan = getScanInfo(game)
  const useScan = !!scan && status !== "VERIFIED" && !manualOverride
  const hintedWinner: "team1" | "team2" | null =
    scan?.winnerTeamId === match.team1?.id ? "team1"
    : scan?.winnerTeamId === match.team2?.id ? "team2"
    : null

  const parse = (value: string): number | null => {
    const n = Number(value)
    return value.trim() === "" || Number.isNaN(n) ? null : n
  }

  // Turning override on pulls the OCR-read (or previously verified) score
  // into the boxes so the monitor is correcting a real number, not typing
  // from scratch.
  const toggleManualOverride = () => {
    setManualOverride((prev) => {
      const next = !prev
      if (next) {
        setScore1(game.team1Score?.toString() ?? "")
        setScore2(game.team2Score?.toString() ?? "")
      }
      return next
    })
  }

  const commit = async (winner: "team1" | "team2" | null) => {
    if (busy) return
    setBusy(true)
    try {
      if (winner && useScan) {
        // Side-safe path: the backend gives the scan's victory score to
        // whichever TEAM the monitor picks — screen sides never matter.
        await onSetResult(match.id, gameIndex, winner, null, null, { useScanScores: true })
      } else {
        await onSetResult(match.id, gameIndex, winner, parse(score1), parse(score2))
      }
    } finally {
      setBusy(false)
    }
  }

  // Visual state at a glance: untouched games fade back, a scan waiting
  // for the monitor glows orange, verified games get a green edge.
  const attention = needsVerify(game)
  const rowTone = attention
    ? "border-l-2 border-l-attention bg-attention/10"
    : status === "VERIFIED"
    ? "border-l-2 border-l-win/60"
    : status === "REJECTED"
    ? "border-l-2 border-l-lose/60"
    : "opacity-60 hover:opacity-100 transition-opacity"

  return (
    <div className={`px-4 py-3 flex flex-wrap items-center gap-3 ${rowTone}`}>
      <span className="text-xs font-bold text-muted-foreground w-14">เกม {game.number ?? gameIndex + 1}</span>

      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusClass(status)}`}>
        {STATUS_LABEL[status]}
      </span>

      {scan && (
        <span className="text-xs text-muted-foreground">
          สแกน: <span className="font-bold text-win">{scan.victory ?? "?"}</span>
          <span className="mx-0.5">ชนะ/แพ้</span>
          <span className="font-bold text-lose">{scan.lose ?? "?"}</span>
          {hintedWinner && (
            <span className="ml-1.5 text-attention font-medium">
              (สนามระบุ: {hintedWinner === "team1" ? match.team1?.name : match.team2?.name})
            </span>
          )}
        </span>
      )}

      {/* Manual override — for when the OCR misread the photo and the
          monitor needs to type the correct number before verifying */}
      {scan && status !== "VERIFIED" && canScore && (
        <button
          type="button"
          onClick={toggleManualOverride}
          className="text-xs font-medium text-brand hover:underline"
        >
          {manualOverride ? "ใช้คะแนนที่สแกน" : "แก้ไขคะแนนเอง"}
        </button>
      )}

      {/* Kill score inputs — hidden while a scan waits, the scan decides */}
      {!useScan && (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            disabled={!canScore || busy}
            placeholder="-"
            className="w-16 px-2 py-1.5 text-sm text-center bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
            aria-label={`คะแนน ${match.team1?.name}`}
          />
          <span className="text-xs text-muted-foreground">:</span>
          <input
            type="number"
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            disabled={!canScore || busy}
            placeholder="-"
            className="w-16 px-2 py-1.5 text-sm text-center bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
            aria-label={`คะแนน ${match.team2?.name}`}
          />
        </div>
      )}

      {/* Winner buttons — named by TEAM, never by screen side */}
      {canScore && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void commit("team1")}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border max-w-40 truncate transition-colors disabled:opacity-50 ${
              game.winner === "team1"
                ? "bg-win text-white border-win"
                : hintedWinner === "team1"
                ? "border-attention/40 text-attention bg-attention/10 hover:border-win/60"
                : "border-border text-muted-foreground hover:text-win hover:border-win/40"
            }`}
            title={`${match.team1?.name} ชนะเกมนี้`}
          >
            {match.team1?.name} ชนะ
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void commit("team2")}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border max-w-40 truncate transition-colors disabled:opacity-50 ${
              game.winner === "team2"
                ? "bg-win text-white border-win"
                : hintedWinner === "team2"
                ? "border-attention/40 text-attention bg-attention/10 hover:border-win/60"
                : "border-border text-muted-foreground hover:text-win hover:border-win/40"
            }`}
            title={`${match.team2?.name} ชนะเกมนี้`}
          >
            {match.team2?.name} ชนะ
          </button>
          {(game.winner || status !== "PENDING") && (
            <button
              type="button"
              disabled={busy}
              onClick={() => { setScore1(""); setScore2(""); void commit(null) }}
              className="p-1.5 text-muted-foreground hover:text-lose rounded-lg hover:bg-lose/10 transition-colors disabled:opacity-50"
              aria-label="ล้างผลเกมนี้"
              title="ล้างผลเกมนี้"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Evidence + audit — the photo shows inline so the monitor reads
          it at a glance; clicking still opens the full image */}
      <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
        {game.verifiedBy && <span>ยืนยันโดย {game.verifiedBy.username}</span>}
        {!game.verifiedBy && game.uploadedBy && <span>อัปโหลดโดย {game.uploadedBy.username}</span>}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            title="เปิดภาพหลักฐานเต็มจอ"
            className="group relative block flex-shrink-0"
          >
            <img
              src={url}
              alt={`หลักฐานเกม ${game.number ?? gameIndex + 1}`}
              loading="lazy"
              className="h-16 w-28 object-cover rounded-lg border border-border group-hover:border-brand transition-colors"
            />
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              เปิดเต็มจอ
            </span>
          </a>
        )}
      </div>
    </div>
  )
}
