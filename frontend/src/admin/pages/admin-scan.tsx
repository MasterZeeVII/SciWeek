import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import {
  ArrowLeft, Camera, CheckCircle2, CloudUpload, Download, ImageUp, Loader2, RefreshCcw, RotateCcw,
  RotateCw, ScanLine, ScanText, Swords, Trophy,
} from "lucide-react"

import type { ScoreRoi } from "@/lib/api"
import { STATUS_LABEL, evidenceUrl, statusClass } from "@/lib/game-status"
import { getScanInfo } from "@/lib/scan-info"
import { hasRole } from "@/lib/roles"
import { useTournament } from "@/lib/tournament-context"
import type { Game, Match } from "@/lib/tournament-types"
import { DivisionTabs } from "../division-tabs"

// Same starting boxes as the backend OCR defaults; staff drag them into
// place on the photo, so the numbers can be anywhere on screen.
const INITIAL_WIN_ROI: ScoreRoi = { x: 0.26, y: 0.12, width: 0.15, height: 0.08 }
const INITIAL_LOSE_ROI: ScoreRoi = { x: 0.56, y: 0.12, width: 0.15, height: 0.08 }
// Whole photo is kept as the verification evidence.
const FULL_ROI: ScoreRoi = { x: 0, y: 0, width: 1, height: 1 }
// Starting crop box for the "trim the raw camera frame down to just the
// screen" step — inset a bit from the edges so staff can see there's a
// box to drag, not react to it as pre-cropped already.
const INITIAL_SCREEN_ROI: ScoreRoi = { x: 0.05, y: 0.05, width: 0.9, height: 0.9 }

// Phones with rotation lock on hand back the camera sensor's native buffer
// (e.g. always 1920x1080) regardless of how the phone is actually held, so
// a landscape photo can come out sideways. Let staff spin it back manually.
function rotatePhotoDataUrl(dataUrl: string, degrees: 90 | -90): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalHeight
      canvas.height = img.naturalWidth
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Cannot rotate image."))
        return
      }
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((degrees * Math.PI) / 180)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      resolve(canvas.toDataURL("image/jpeg", 0.92))
    }
    img.onerror = () => reject(new Error("Cannot load image to rotate."))
    img.src = dataUrl
  })
}

// The raw camera frame includes whatever background is around the photographed
// screen (desk, bezel, hands). Trimming it down client-side — before the photo
// is even base64-encoded — cuts upload bytes without losing any resolution on
// the part that actually matters (the score screen itself).
function cropPhotoDataUrl(dataUrl: string, roi: ScoreRoi): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const sx = Math.round(roi.x * img.naturalWidth)
      const sy = Math.round(roi.y * img.naturalHeight)
      const sw = Math.round(roi.width * img.naturalWidth)
      const sh = Math.round(roi.height * img.naturalHeight)
      const canvas = document.createElement("canvas")
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Cannot crop image."))
        return
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      resolve(canvas.toDataURL("image/jpeg", 0.92))
    }
    img.onerror = () => reject(new Error("Cannot load image to crop."))
    img.src = dataUrl
  })
}

// Saves whatever's currently in `photo` state to the device's own storage —
// the result screen on the players' phone only stays up for a few seconds,
// so if a scan comes back wrong, staff need the original shot to retry from
// (re-adjust ROI, re-upload) instead of having to recreate a screen that's
// already gone.
function downloadPhoto(dataUrl: string, target: Target) {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9ก-๙]+/g, "_")
  const filename = `scan_${safe(target.match.team1?.name ?? "T1")}_vs_${safe(target.match.team2?.name ?? "T2")}_g${target.gameIndex + 1}.jpg`
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

type Step = "pick" | "winner" | "photo" | "crop" | "adjust" | "done"

interface Target {
  match: Match
  gameIndex: number
  game: Game
}

// Series score counted the same way the matches page does (verified games
// only) so both pages always show the same numbers.
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

export function AdminScan() {
  const { user, tournament, updateMatchResult, scanGameScore, getRoundConfigs } = useTournament()
  const canVerify = hasRole(user, "MONITOR")
  const location = useLocation()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>("pick")
  const [target, setTarget] = useState<Target | null>(null)
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [screenRoi, setScreenRoi] = useState<ScoreRoi>(INITIAL_SCREEN_ROI)
  const [cropping, setCropping] = useState(false)
  const [winRoi, setWinRoi] = useState<ScoreRoi>(INITIAL_WIN_ROI)
  const [loseRoi, setLoseRoi] = useState<ScoreRoi>(INITIAL_LOSE_ROI)
  const [busy, setBusy] = useState(false)
  // Two-phase feedback while the single scan request runs: the upload is
  // quick, the OCR read is the long part — showing which phase we're in
  // answers "did my photo actually reach the server?"
  const [scanStage, setScanStage] = useState<"uploading" | "reading" | null>(null)
  const [rotating, setRotating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ victory: number | null; lose: number | null } | null>(null)
  // Where the server says it stored the evidence — shown back on the done
  // step as proof the upload landed.
  const [evidencePath, setEvidencePath] = useState<string | null>(null)

  const matches = (tournament?.matches ?? []).filter((m) => m.team1 && m.team2)
  const roundConfigs = getRoundConfigs()
  const totalRounds = matches.reduce((max, m) => Math.max(max, m.round), 0)
  const roundName = (round: number) =>
    roundConfigs.find((rc) => rc.round === round)?.name ?? `รอบที่ ${round}`

  const rotatePhoto = async (degrees: 90 | -90) => {
    if (!photo || rotating) return
    setRotating(true)
    try {
      setPhoto(await rotatePhotoDataUrl(photo, degrees))
      // Box positions were for the old orientation — reset so nobody
      // accidentally scans with boxes over the wrong spot.
      setWinRoi(INITIAL_WIN_ROI)
      setLoseRoi(INITIAL_LOSE_ROI)
    } catch {
      setError("หมุนภาพไม่สำเร็จ")
    } finally {
      setRotating(false)
    }
  }

  // Deep link from the bracket page's "Scan photo" button: jump straight
  // to the winner step for that specific match+game instead of the picker.
  const [cameFromBracket, setCameFromBracket] = useState(false)
  const consumedDeepLink = useRef(false)
  useEffect(() => {
    if (consumedDeepLink.current || !tournament) return
    const linkState = location.state as { matchId?: string; gameIndex?: number } | null
    if (!linkState?.matchId || linkState.gameIndex == null) return
    const match = tournament.matches.find((m) => m.id === linkState.matchId)
    const game = match?.games[linkState.gameIndex]
    if (!match || !game) return
    consumedDeepLink.current = true
    setCameFromBracket(true)
    setTarget({ match, gameIndex: linkState.gameIndex, game })
    setWinnerTeamId(null)
    setStep("winner")
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, tournament, navigate])

  const reset = () => {
    setStep("pick")
    setTarget(null)
    setWinnerTeamId(null)
    setPhoto(null)
    setScreenRoi(INITIAL_SCREEN_ROI)
    setResult(null)
    setError(null)
    setEvidencePath(null)
  }

  const confirmCrop = async () => {
    if (!photo || cropping) return
    setCropping(true)
    try {
      setPhoto(await cropPhotoDataUrl(photo, screenRoi))
      setWinRoi(INITIAL_WIN_ROI)
      setLoseRoi(INITIAL_LOSE_ROI)
      setStep("adjust")
    } catch {
      setError("ตัดกรอบภาพไม่สำเร็จ")
    } finally {
      setCropping(false)
    }
  }

  // "Back" from a step that has nowhere earlier to fall back to: if we
  // arrived via the bracket's deep link there's no picker screen we came
  // from, so leave the wizard entirely instead of dropping into "pick".
  const goBack = () => {
    if (cameFromBracket) {
      navigate("/admin/bracket")
      return
    }
    reset()
  }

  const handleScan = async () => {
    if (!target || !photo || busy) return
    setBusy(true)
    setError(null)
    setScanStage("uploading")
    // The request is one round trip; the upload itself finishes in a couple
    // of seconds on LAN and the rest is the OCR engine reading the crops.
    const stageTimer = window.setTimeout(() => setScanStage("reading"), 2_000)
    try {
      // Backend contract: roi_score_left = winner side, roi_score_right =
      // loser side. The green/red boxes ARE that mapping — no left/right
      // screen assumption involved.
      const scores = await scanGameScore(
        target.match.id,
        target.gameIndex,
        photo,
        { roi_score_left: winRoi, roi_score_right: loseRoi, roi_full: FULL_ROI },
        winnerTeamId,
      )
      setResult({ victory: scores.team1Score, lose: scores.team2Score })
      setEvidencePath(scores.evidenceFull)
      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "สแกนไม่สำเร็จ")
    } finally {
      window.clearTimeout(stageTimer)
      setScanStage(null)
      setBusy(false)
    }
  }

  const handleConfirm = async () => {
    if (!target || !winnerTeamId || busy) return
    const winner = winnerTeamId === target.match.team1?.id ? "team1" : "team2"
    setBusy(true)
    try {
      await updateMatchResult(target.match.id, target.gameIndex, winner, null, null, {
        useScanScores: true,
      })
      goBack()
    } finally {
      setBusy(false)
    }
  }

  const winnerName = (target && winnerTeamId
    ? (winnerTeamId === target.match.team1?.id ? target.match.team1?.name : target.match.team2?.name)
    : null) ?? null
  const loserName = (target && winnerTeamId
    ? (winnerTeamId === target.match.team1?.id ? target.match.team2?.name : target.match.team1?.name)
    : null) ?? null

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-5"
      >
        <h1 className="text-2xl font-bold text-foreground">สแกนคะแนน</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          ถ่ายภาพหน้าจอสรุปผลจากมือถือผู้เล่น แล้วลากกรอบครอบตัวเลข
        </p>
      </motion.div>

      {error && (
        <div className="mb-4 rounded-lg border border-lose/40 bg-lose/10 px-4 py-3 text-sm text-lose">
          {error}
        </div>
      )}

      {/* ── Step 1: pick a game — same round grouping + series score +
             status chips as the matches page, so both read the same ──── */}
      {step === "pick" && (
        <div>
          <div className="mb-4"><DivisionTabs /></div>
          {matches.length === 0 ? (
            <div className="bg-card border border-border rounded-xl py-16 text-center">
              <Swords className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">ยังไม่มีแมตช์ที่พร้อมแข่งในรุ่นนี้</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Array.from(
                matches.reduce((byRound, match) => {
                  const list = byRound.get(match.round) ?? []
                  list.push(match)
                  byRound.set(match.round, list)
                  return byRound
                }, new Map<number, Match[]>()).entries(),
              )
                .sort((a, b) => a[0] - b[0])
                .map(([round, roundMatches]) => (
                  <section key={round}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-brand/10 text-brand border-brand/20">
                        {round === totalRounds && <Trophy className="w-3 h-3" />}
                        {roundName(round)}
                      </span>
                      <span className="text-xs text-muted-foreground">BO{roundMatches[0]?.bestOf}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="flex flex-col gap-2">
                      {roundMatches.map((match) => {
                        const [wins1, wins2] = seriesScore(match)
                        return (
                          <div key={match.id} className="bg-card border border-border rounded-xl px-4 py-3">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-2.5">
                              <span className="text-sm font-semibold text-foreground truncate text-right">
                                {match.team1?.name}
                              </span>
                              <span className="text-sm font-black text-foreground whitespace-nowrap">
                                {wins1} <span className="text-xs text-muted-foreground font-normal">vs</span> {wins2}
                              </span>
                              <span className="text-sm font-semibold text-foreground truncate">
                                {match.team2?.name}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 justify-center">
                              {match.games.map((game, index) => {
                                const status = game.ocrStatus ?? "PENDING"
                                return (
                                  <button
                                    key={game.id}
                                    type="button"
                                    onClick={() => {
                                      setTarget({ match, gameIndex: index, game })
                                      setWinnerTeamId(null)
                                      setStep("winner")
                                    }}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors hover:border-brand/50 ${
                                      status === "PENDING"
                                        ? "bg-background text-foreground border-border"
                                        : statusClass(status)
                                    }`}
                                  >
                                    เกม {game.number ?? index + 1}
                                    {status !== "PENDING" && (
                                      <span className="block text-[10px] font-medium mt-0.5">
                                        {STATUS_LABEL[status]}
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: which TEAM won this game ────────────────────────── */}
      {step === "winner" && target && (
        <div>
          <BackBar onBack={goBack} label={`เกม ${target.game.number ?? target.gameIndex + 1}`} />

          {/* Which bracket match this is — same info the bracket page shows,
              so staff never scan into the wrong pairing */}
          <TargetCard
            target={target}
            roundLabel={roundName(target.match.round)}
          />

          {/* This game was scanned before — show the old evidence so nobody
              overwrites data without realizing it exists */}
          <PreviousScanPanel game={target.game} match={target.match} />

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-bold text-foreground mb-1">ทีมไหนชนะเกมนี้?</h2>
            <p className="text-xs text-muted-foreground mb-4">
              ตอบตามที่เห็นจริงหน้างาน — ระบบไม่เดาจากฝั่งซ้าย/ขวาของจอ
              เพราะเกมสลับฝั่งแดง/น้ำเงินระหว่างเกมได้
            </p>
            <div className="flex flex-col gap-2">
              {[target.match.team1, target.match.team2].map((team) =>
                team ? (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => { setWinnerTeamId(team.id); setStep("photo") }}
                    className="w-full text-left px-4 py-3.5 rounded-xl border border-border bg-background hover:border-win hover:bg-win/5 text-sm font-semibold text-foreground transition-colors"
                  >
                    🏆 {team.name}
                  </button>
                ) : null,
              )}
              <button
                type="button"
                onClick={() => { setWinnerTeamId(null); setStep("photo") }}
                className="w-full text-center px-4 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                ยังไม่ระบุ — ให้ผู้ตรวจสอบ (Monitor) ตัดสินจากภาพ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: take / choose the photo ─────────────────────────── */}
      {step === "photo" && target && (
        <PhotoStep
          onBack={() => setStep("winner")}
          winnerName={winnerName}
          onPhoto={(dataUrl) => {
            setPhoto(dataUrl)
            setScreenRoi(INITIAL_SCREEN_ROI)
            setStep("crop")
          }}
        />
      )}

      {/* ── Step 3b: trim the raw camera frame down to just the screen —
             cuts upload bytes without losing evidence resolution ──────── */}
      {step === "crop" && target && photo && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" style={{ height: "100dvh" }}>
          <div className="flex-shrink-0 px-4 py-3 bg-black/70 backdrop-blur">
            <div className="flex items-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={() => setStep("photo")}
                aria-label="ย้อนกลับ"
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <p className="text-sm font-semibold flex-1">ตัดกรอบเฉพาะหน้าจอ</p>
            </div>
            <p className="text-xs text-white/70">
              ลาก<span className="font-semibold text-brand"> กรอบฟ้า </span>
              ให้พอดีกับขอบจอในภาพ — ตัดพื้นหลัง โต๊ะ หรือมือที่ถือมือถือออกไปเพื่อลดขนาดไฟล์
              ที่ต้องอัปโหลด โดยไม่เสียความคมชัดของตัวเลข
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <CropEditor photo={photo} roi={screenRoi} onChange={setScreenRoi} />
          </div>

          <div
            className="flex-shrink-0 flex gap-2 px-4 pt-3 bg-black/70 backdrop-blur"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={() => setStep("photo")}
              className="flex items-center gap-1.5 text-sm font-medium text-white/80 border border-white/20 px-4 py-2.5 rounded-lg hover:text-white transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              ถ่ายใหม่
            </button>
            <button
              type="button"
              onClick={() => downloadPhoto(photo, target)}
              title="บันทึกภาพนี้ลงเครื่อง เผื่อสแกนพลาดจะได้ใช้ภาพเดิมแทนการถ่ายใหม่"
              aria-label="บันทึกภาพลงเครื่อง"
              className="flex items-center gap-1.5 text-sm font-medium text-white/80 border border-white/20 px-3 py-2.5 rounded-lg hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={cropping}
              onClick={() => void confirmCrop()}
              className="flex-1 flex items-center justify-center gap-2 bg-brand text-brand-foreground text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {cropping ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
              {cropping ? "กำลังตัดภาพ..." : "ใช้ขอบเขตนี้"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: drag the ROI boxes, then scan ───────────────────── */}
      {step === "adjust" && target && photo && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" style={{ height: "100dvh" }}>
          {/* Header — pinned */}
          <div className="flex-shrink-0 px-4 py-3 bg-black/70 backdrop-blur">
            <div className="flex items-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={() => setStep("photo")}
                aria-label="ย้อนกลับ"
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <p className="text-sm font-semibold flex-1">ปรับกรอบคะแนน</p>
              <button
                type="button"
                onClick={() => void rotatePhoto(-90)}
                disabled={rotating}
                aria-label="หมุนภาพทวนเข็ม 90 องศา"
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void rotatePhoto(90)}
                disabled={rotating}
                aria-label="หมุนภาพตามเข็ม 90 องศา"
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/70">
              ลาก<span className="font-semibold text-win"> กรอบเขียว </span>ครอบตัวเลขคะแนนของ
              <span className="font-semibold text-white"> {winnerName ?? "ทีมที่ชนะ"} </span>
              และ<span className="font-semibold text-lose"> กรอบแดง </span>ครอบคะแนนของ
              <span className="font-semibold text-white"> {loserName ?? "ทีมที่แพ้"} </span>
              — มุมล่างขวาของกรอบใช้ปรับขนาด
            </p>
          </div>

          {/* Photo + ROI boxes — scrolls internally if the photo is taller
              than the available space; the action bar below never moves */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <RoiEditor
              photo={photo}
              winRoi={winRoi}
              loseRoi={loseRoi}
              onWinRoi={setWinRoi}
              onLoseRoi={setLoseRoi}
            />
          </div>

          {/* Actions — pinned to the bottom, reachable without scrolling */}
          <div
            className="flex-shrink-0 flex gap-2 px-4 pt-3 bg-black/70 backdrop-blur"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={() => setStep("photo")}
              className="flex items-center gap-1.5 text-sm font-medium text-white/80 border border-white/20 px-4 py-2.5 rounded-lg hover:text-white transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              ถ่ายใหม่
            </button>
            <button
              type="button"
              onClick={() => downloadPhoto(photo, target)}
              title="บันทึกภาพนี้ลงเครื่อง เผื่อสแกนพลาดจะได้ใช้ภาพเดิมแทนการถ่ายใหม่"
              aria-label="บันทึกภาพลงเครื่อง"
              className="flex items-center gap-1.5 text-sm font-medium text-white/80 border border-white/20 px-3 py-2.5 rounded-lg hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleScan()}
              className="flex-1 flex items-center justify-center gap-2 bg-brand text-brand-foreground text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <ScanLine className="w-4 h-4" />
              {busy ? "กำลังสแกน..." : "สแกนคะแนน"}
            </button>
          </div>

          {/* Progress overlay — tells the staff their photo is really on
              its way instead of a silent frozen button */}
          {busy && scanStage && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-8">
              <div className="w-full max-w-xs flex flex-col gap-4">
                <ProgressStage
                  icon={CloudUpload}
                  label="อัปโหลดรูปขึ้นเซิร์ฟเวอร์"
                  state={scanStage === "uploading" ? "active" : "done"}
                />
                <ProgressStage
                  icon={ScanText}
                  label="AI กำลังอ่านตัวเลขจากภาพ (OCR)"
                  state={scanStage === "reading" ? "active" : "waiting"}
                />
                <p className="text-center text-xs text-white/60 mt-2">
                  ใช้เวลาประมาณ 5–15 วินาที — อย่าปิดหน้านี้
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: result ──────────────────────────────────────────── */}
      {step === "done" && target && result && (
        <div>
          <BackBar onBack={goBack} label="ผลการสแกน" />
          <TargetCard target={target} roundLabel={roundName(target.match.round)} />
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <CheckCircle2 className="w-8 h-8 text-win mx-auto mb-2" />
            <p className="text-sm font-semibold text-win mb-1">อัปโหลดสำเร็จ</p>
            <p className="text-xs text-muted-foreground mb-3">
              เซิร์ฟเวอร์บันทึกภาพเป็นหลักฐานแล้ว — ภาพด้านล่างคือไฟล์ที่เก็บไว้จริง
            </p>
            {evidencePath && (
              <a
                href={evidenceUrl(evidencePath) ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="block mb-4"
                title="เปิดภาพหลักฐานเต็มจอ"
              >
                <img
                  src={evidenceUrl(evidencePath) ?? undefined}
                  alt="หลักฐานที่เซิร์ฟเวอร์บันทึก"
                  className="w-full max-h-56 object-contain rounded-lg border border-border bg-muted"
                />
              </a>
            )}
            <div className="flex items-center justify-center gap-4 mb-1">
              <div className="text-right">
                <p className="text-xs text-win font-semibold">ทีมชนะ</p>
                <p className="text-sm font-bold text-foreground max-w-40 truncate">{winnerName ?? "ยังไม่ระบุ"}</p>
              </div>
              <p className="text-3xl font-black">
                <span className="text-win">{result.victory ?? "?"}</span>
                <span className="text-muted-foreground text-xl mx-2">:</span>
                <span className="text-lose">{result.lose ?? "?"}</span>
              </p>
              <div className="text-left">
                <p className="text-xs text-lose font-semibold">ทีมแพ้</p>
                <p className="text-sm font-bold text-foreground max-w-40 truncate">{loserName ?? "ยังไม่ระบุ"}</p>
              </div>
            </div>
            {(result.victory === null || result.lose === null) && (
              <p className="text-xs text-attention mb-2">
                อ่านตัวเลขไม่ครบ — ลองปรับกรอบแล้วสแกนใหม่ หรือให้ Monitor กรอกเอง
              </p>
            )}
            <div className="flex flex-col gap-2 mt-4">
              <button
                type="button"
                onClick={() => setStep("adjust")}
                className="w-full text-sm font-medium text-muted-foreground border border-border px-4 py-2.5 rounded-lg hover:text-foreground transition-colors"
              >
                ปรับกรอบ / สแกนภาพเดิมอีกครั้ง
              </button>
              {canVerify && winnerTeamId && result.victory !== null && result.lose !== null && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleConfirm()}
                  className="w-full bg-win text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  ยืนยันผลเกมนี้เลย ({winnerName} ชนะ)
                </button>
              )}
              {!canVerify && (
                <p className="text-xs text-muted-foreground">
                  รอผู้ตรวจสอบ (Monitor) ยืนยันผลจากหลักฐานภาพ
                </p>
              )}
              <button
                type="button"
                onClick={reset}
                className="w-full bg-brand text-brand-foreground text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                สแกนเกมถัดไป
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Match context: which pairing in the bracket this scan belongs to ── */

function TargetCard({ target, roundLabel }: { target: Target; roundLabel: string }) {
  // Series score sits between the names like a broadcast HUD — it follows
  // the TEAM, so staff see where the series stands at a glance.
  const [wins1, wins2] = seriesScore(target.match)
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 mb-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-brand/10 text-brand border-brand/20">
          {roundLabel}
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground">
          BO{target.match.bestOf} · เกม {target.game.number ?? target.gameIndex + 1}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <p className="text-sm font-bold text-foreground truncate text-right">{target.match.team1?.name}</p>
        <p className="text-base font-black text-foreground whitespace-nowrap">
          {wins1} <span className="text-[10px] font-normal text-muted-foreground align-middle">vs</span> {wins2}
        </p>
        <p className="text-sm font-bold text-foreground truncate">{target.match.team2?.name}</p>
      </div>
    </div>
  )
}

/* ── Old scan warning: this game already has evidence on file ─────────── */

function PreviousScanPanel({ game, match }: { game: Game; match: Match }) {
  const status = game.ocrStatus ?? "PENDING"
  if (status === "PENDING") return null
  const scan = getScanInfo(game)
  const url = evidenceUrl(game.imagePath)
  const uploader = game.verifiedBy ?? game.uploadedBy
  const hintName =
    scan?.winnerTeamId === match.team1?.id ? match.team1?.name
    : scan?.winnerTeamId === match.team2?.id ? match.team2?.name
    : null

  return (
    <div className="rounded-lg border border-attention/30 bg-attention/10 p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusClass(status)}`}>
          {STATUS_LABEL[status]}
        </span>
        <p className="text-xs font-semibold text-attention">
          เกมนี้เคยสแกนแล้ว — การสแกนใหม่จะบันทึกทับข้อมูลเดิม
        </p>
      </div>
      <div className="flex items-center gap-3">
        {url && (
          <a href={url} target="_blank" rel="noreferrer" title="เปิดภาพหลักฐานเดิมเต็มจอ" className="flex-shrink-0">
            <img
              src={url}
              alt="หลักฐานเดิม"
              loading="lazy"
              className="h-16 w-24 object-cover rounded-lg border border-attention/30"
            />
          </a>
        )}
        <div className="text-xs text-attention min-w-0">
          {scan && (
            <p>
              คะแนนเดิม: <span className="font-bold">{scan.victory ?? "?"}</span> ชนะ/แพ้{" "}
              <span className="font-bold">{scan.lose ?? "?"}</span>
              {hintName && <span className="block truncate">สนามระบุผู้ชนะ: {hintName}</span>}
            </p>
          )}
          {uploader && <p className="mt-0.5">โดย {uploader.username}</p>}
        </div>
      </div>
    </div>
  )
}

/* ── One row of the scan progress overlay ─────────────────────────────── */

function ProgressStage({
  icon: Icon,
  label,
  state,
}: {
  icon: typeof CloudUpload
  label: string
  state: "waiting" | "active" | "done"
}) {
  return (
    <div className={`flex items-center gap-3 transition-opacity ${state === "waiting" ? "opacity-40" : ""}`}>
      <span className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 ${
        state === "done" ? "bg-win text-white" : "bg-white/10 text-white"
      }`}>
        {state === "done" ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : state === "active" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </span>
      <p className={`text-sm font-medium ${state === "active" ? "text-white" : "text-white/70"}`}>
        {label}
      </p>
    </div>
  )
}

function BackBar({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  )
}

/* ── Photo capture: live camera + file fallback ─────────────────────── */

function PhotoStep({
  onBack,
  onPhoto,
  winnerName,
}: {
  onBack: () => void
  onPhoto: (dataUrl: string) => void
  winnerName: string | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("เบราว์เซอร์ไม่รองรับกล้อง (ต้องใช้ HTTPS) — ใช้ปุ่มเลือกรูปแทน")
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (err) {
        if (!cancelled) {
          setCameraError(err instanceof Error ? err.message : "เปิดกล้องไม่สำเร็จ — ใช้ปุ่มเลือกรูปแทน")
        }
      }
    }
    void start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    onPhoto(canvas.toDataURL("image/jpeg", 0.92))
  }

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onPhoto(String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" style={{ height: "100dvh" }}>
      {/* Header — pinned, never scrolls away */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-black/70 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          aria-label="ย้อนกลับ"
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-semibold truncate">
          ถ่ายภาพผล — {winnerName ?? "ยังไม่ระบุผู้ชนะ"}
        </p>
      </div>

      {/* Camera preview — fills whatever space is left, any orientation */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="mx-4 rounded-lg bg-white/10 border border-white/20 px-4 py-6 text-center">
            <Camera className="w-6 h-6 text-white/60 mx-auto mb-2" />
            <p className="text-xs text-white/70">{cameraError}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      {/* Actions — pinned to the bottom, reachable without scrolling */}
      <div
        className="flex-shrink-0 flex flex-col gap-2 px-4 pt-3 bg-black/70 backdrop-blur"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {!cameraError && (
          <button
            type="button"
            onClick={capture}
            className="w-full flex items-center justify-center gap-2 bg-brand text-brand-foreground text-sm font-semibold px-4 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Camera className="w-4 h-4" />
            ถ่ายภาพ
          </button>
        )}
        <label className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white/80 border border-white/20 px-4 py-3 rounded-lg hover:text-white cursor-pointer transition-colors">
          <ImageUp className="w-4 h-4" />
          เลือกรูป / ใช้กล้องของเครื่อง
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        </label>
      </div>
    </div>
  )
}

/* ── ROI editor: two draggable/resizable boxes over the photo ───────── */

function RoiEditor({
  photo,
  winRoi,
  loseRoi,
  onWinRoi,
  onLoseRoi,
}: {
  photo: string
  winRoi: ScoreRoi
  loseRoi: ScoreRoi
  onWinRoi: (roi: ScoreRoi) => void
  onLoseRoi: (roi: ScoreRoi) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="relative w-full select-none rounded-lg overflow-hidden border border-white/20">
      <img src={photo} alt="ภาพหน้าจอผลการแข่งขัน" className="w-full block" draggable={false} />
      <RoiBox roi={winRoi} onChange={onWinRoi} containerRef={containerRef} label="ชนะ" tone="win" />
      <RoiBox roi={loseRoi} onChange={onLoseRoi} containerRef={containerRef} label="แพ้" tone="lose" />
    </div>
  )
}

/* ── Crop editor: single draggable/resizable box over the raw photo ─── */

function CropEditor({
  photo,
  roi,
  onChange,
}: {
  photo: string
  roi: ScoreRoi
  onChange: (roi: ScoreRoi) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="relative w-full select-none rounded-lg overflow-hidden border border-white/20">
      <img src={photo} alt="ภาพที่ถ่ายก่อนตัดกรอบ" className="w-full block" draggable={false} />
      <RoiBox roi={roi} onChange={onChange} containerRef={containerRef} label="ขอบเขตจอ" tone="crop" />
    </div>
  )
}

const MIN_SIZE = 0.04

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function RoiBox({
  roi,
  onChange,
  containerRef,
  label,
  tone,
}: {
  roi: ScoreRoi
  onChange: (roi: ScoreRoi) => void
  containerRef: React.RefObject<HTMLDivElement | null>
  label: string
  tone: "win" | "lose" | "crop"
}) {
  const drag = useRef<{ mode: "move" | "resize"; startX: number; startY: number; start: ScoreRoi } | null>(null)

  const begin = (mode: "move" | "resize") => (event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
    drag.current = { mode, startX: event.clientX, startY: event.clientY, start: roi }
  }

  const move = useCallback(
    (event: React.PointerEvent) => {
      const state = drag.current
      const rect = containerRef.current?.getBoundingClientRect()
      if (!state || !rect) return
      const dx = (event.clientX - state.startX) / rect.width
      const dy = (event.clientY - state.startY) / rect.height
      if (state.mode === "move") {
        onChange({
          ...roi,
          x: clamp(state.start.x + dx, 0, 1 - roi.width),
          y: clamp(state.start.y + dy, 0, 1 - roi.height),
        })
      } else {
        onChange({
          ...roi,
          width: clamp(state.start.width + dx, MIN_SIZE, 1 - roi.x),
          height: clamp(state.start.height + dy, MIN_SIZE, 1 - roi.y),
        })
      }
    },
    [containerRef, onChange, roi],
  )

  const end = () => { drag.current = null }

  const colors = tone === "win"
    ? "border-win bg-win/15"
    : tone === "lose"
    ? "border-lose bg-lose/15"
    : "border-brand bg-brand/15"
  const chip = tone === "win" ? "bg-win" : tone === "lose" ? "bg-lose" : "bg-brand"

  return (
    <div
      role="presentation"
      className={`absolute border-2 rounded ${colors} cursor-move`}
      style={{
        left: `${roi.x * 100}%`,
        top: `${roi.y * 100}%`,
        width: `${roi.width * 100}%`,
        height: `${roi.height * 100}%`,
        touchAction: "none",
      }}
      onPointerDown={begin("move")}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span className={`absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${chip}`}>
        {label}
      </span>
      {/* Resize handle */}
      <span
        role="presentation"
        className={`absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full border-2 border-white shadow ${chip} cursor-nwse-resize`}
        style={{ touchAction: "none" }}
        onPointerDown={begin("resize")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
    </div>
  )
}
