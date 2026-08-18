import { useCallback, useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { motion } from "motion/react"
import {
  ArrowLeft, ArrowDown, ArrowUp, ArrowLeftRight, CheckCircle2, Clock, Eye, GripVertical, Info,
  Network, Power, RotateCcw, Shuffle, Swords, Trophy, Users, Play, X,
} from "lucide-react"

import { fetchTournament, type TournamentDetail } from "@/lib/public-api"
import { useTournament } from "@/lib/tournament-context"
import { StatusPill } from "@/components/ui/status-pill"
import { DivisionTabs } from "../division-tabs"
import { ParticipantsPanel, ReadOnlyRosterPanel } from "../participants-panel"
import { BracketCanvas, type BracketLabels } from "@/components/bracket/bracket-canvas"
import type { Match, RoundConfig, Team } from "@/lib/tournament-types"

type PageTab = "overview" | "teams" | "bracket"

const TAB_LABEL: Record<PageTab, string> = {
  overview: "ภาพรวม",
  teams: "ทีมผู้เข้าร่วม",
  bracket: "จับสาย",
}

const PREVIEW_LABELS: Partial<BracketLabels> = {
  subtitle: (teamCount) => `${teamCount} ทีม — ตัวอย่างก่อนจับสายจริง`,
  dragHint: "ลากเพื่อเลื่อนดู",
  trackTeam: "ติดตามทีม",
  champion: "แชมป์เปี้ยน",
  thirdPlace: "ชิงอันดับ 3",
  roundName: (round, totalRounds) => {
    if (totalRounds && round === totalRounds) return "รอบชิงชนะเลิศ"
    if (totalRounds && round === totalRounds - 1) return "รอบรองชนะเลิศ"
    return `รอบที่ ${round}`
  },
}

// Mirrors exactly what bracket.generate_bracket() builds for a power-of-two,
// no-bye bracket (the only kind this setup UI can ever produce): round 1 is
// teams[2i] vs teams[2i+1] at position i, each later round halves, and a
// match's nextMatchId is the next round's match at floor(position / 2).
// Lets the setup screen preview the real bracket shape via the same
// BracketCanvas used post-generation, before anything is actually saved.
function buildPreviewMatches(teams: Team[], roundConfigs: RoundConfig[], thirdPlace: boolean): Match[] {
  if (roundConfigs.length === 0 || teams.length < 2) return []
  const matches: Match[] = []
  let prevRound: Match[] = []
  for (const config of roundConfigs) {
    const count = teams.length / 2 ** config.round
    const roundMatches: Match[] = Array.from({ length: count }, (_, position) => ({
      id: `preview-${config.round}-${position}`,
      round: config.round,
      position,
      nextMatchId: null,
      team1: config.round === 1 ? teams[position * 2] ?? null : null,
      team2: config.round === 1 ? teams[position * 2 + 1] ?? null : null,
      games: [],
      bestOf: config.bestOf,
    }))
    prevRound.forEach((match, i) => {
      match.nextMatchId = roundMatches[Math.floor(i / 2)]?.id ?? null
    })
    matches.push(...roundMatches)
    prevRound = roundMatches
  }
  if (thirdPlace && teams.length >= 4) {
    const finalConfig = roundConfigs[roundConfigs.length - 1]
    matches.push({
      id: `preview-${finalConfig.round}-thirdplace`,
      round: finalConfig.round,
      position: 1,
      nextMatchId: null,
      team1: null,
      team2: null,
      games: [],
      bestOf: finalConfig.bestOf,
    })
  }
  return matches
}

export function AdminTournamentManage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    tournament: active,
    error: contextError,
    activateTournament,
    reorderTeams,
    shuffleQueue,
    updateRoundConfig,
    generateBracket,
    resetTournament,
    getBracketSize,
    getRoundConfigs,
  } = useTournament()

  const [detail, setDetail] = useState<TournamentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [thirdPlace, setThirdPlace] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  // Tap-to-swap fallback for the first-round queue — dragging is not
  // discoverable (and barely works on a phone), so a team can also be picked
  // and swapped with a second tap.
  const [pickIndex, setPickIndex] = useState<number | null>(null)

  const isActive = !!id && active?.id === id

  const tabParam = searchParams.get("tab")
  const tab: PageTab =
    tabParam === "teams" || tabParam === "bracket" ? tabParam : "overview"
  const setTab = useCallback(
    (next: PageTab) => {
      const params = new URLSearchParams(searchParams)
      if (next === "overview") params.delete("tab")
      else params.set("tab", next)
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const reload = useCallback(async () => {
    if (!id) return
    try {
      setDetail(await fetchTournament(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ")
    }
  }, [id])

  useEffect(() => { void reload() }, [reload])

  // Keep the read-only stats fresh after mutations through the context
  useEffect(() => { void reload() }, [active, reload])

  // Esc cancels a pending tap-to-swap selection.
  useEffect(() => {
    if (pickIndex === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickIndex(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pickIndex])

  if (error) return <div className="p-8 text-sm text-lose">{error}</div>
  if (!detail) return <div className="p-8 text-sm text-muted-foreground">กำลังโหลด...</div>

  const totalMatches = detail.stages.reduce((s, st) =>
    s + st.rounds.reduce((r, rnd) => r + rnd.matches.length, 0), 0)
  const completedMatches = detail.stages.reduce((s, st) =>
    s + st.rounds.reduce((r, rnd) => r + rnd.matches.filter((m) => m.winner !== null).length, 0), 0)

  const bracketSize = getBracketSize()
  const hasBracket = (active?.matches.length ?? 0) > 0
  const teams = active?.teams ?? []
  const previewMatches = bracketSize ? buildPreviewMatches(teams, getRoundConfigs(), thirdPlace) : []

  const moveTeam = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= teams.length) return
    swapTeams(index, target)
  }

  const swapTeams = (a: number, b: number) => {
    const next = [...teams]
    ;[next[a], next[b]] = [next[b], next[a]]
    reorderTeams(next)
  }

  const pickTeam = (index: number) => {
    if (pickIndex === null) {
      setPickIndex(index)
      return
    }
    if (pickIndex === index) {
      setPickIndex(null)
      return
    }
    swapTeams(pickIndex, index)
    setPickIndex(null)
  }

  const dropTeam = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const next = [...teams]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(index, 0, moved)
    reorderTeams(next)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleGenerate = async (randomize: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      await generateBracket({ randomize, thirdPlace })
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async () => {
    if (busy) return
    if (!window.confirm("รีเซ็ตสายการแข่งขัน? ผลการแข่งขันทั้งหมดของรุ่นนี้จะถูกลบ")) return
    setBusy(true)
    try {
      await resetTournament()
    } finally {
      setBusy(false)
    }
  }

  const inactiveNotice = (
    <div className="bg-card border border-border rounded-xl p-6 text-center">
      <Power className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-foreground font-medium">ฤดูกาลนี้ยังไม่ได้เปิดใช้งาน</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        ระบบแก้ไขทีมและจับสายได้เฉพาะฤดูกาลที่เปิดใช้งานอยู่เท่านั้น
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => { if (id) void activateTournament(id) }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-foreground bg-brand px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        <Power className="w-3.5 h-3.5" />
        เปิดใช้งานฤดูกาลนี้
      </button>
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Back */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-6"
      >
        <Link
          to="/admin/tournaments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายการทัวร์นาเมนต์
        </Link>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-start justify-between gap-3 mb-5 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{detail.name}</h1>
            <StatusPill variant={isActive ? "win" : "neutral"}>
              {isActive ? "กำลังใช้งาน" : "ผ่านมาแล้ว"}
            </StatusPill>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ปี {detail.year}{detail.season > 1 ? ` ครั้งที่ ${detail.season}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isActive && (
            <button
              type="button"
              disabled={busy}
              onClick={() => { if (id) void activateTournament(id) }}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-foreground bg-brand px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Power className="w-3.5 h-3.5" />
              เปิดใช้งานฤดูกาลนี้
            </button>
          )}
          <Link
            to={`/tournament/${detail.id}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground border border-border px-3 py-2 rounded-lg hover:text-foreground transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            ดูหน้าสาธารณะ
          </Link>
        </div>
      </motion.div>

      {/* Section tabs — everything about this season lives on this one URL */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["overview", "teams", "bracket"] as PageTab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === key
                ? "text-brand border-brand"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {TAB_LABEL[key]}
            {key === "teams" && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {detail.teamCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {contextError && (
        <div className="mb-5 rounded-lg border border-lose/40 bg-lose/10 px-4 py-3 text-sm text-lose">
          {contextError}
        </div>
      )}

      {/* ── ภาพรวม ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "ทีมทั้งหมด", value: detail.teamCount, icon: Users },
              { label: "นัดทั้งหมด", value: totalMatches, icon: Swords },
              { label: "นัดที่เสร็จแล้ว", value: completedMatches, icon: CheckCircle2 },
              { label: "สาย", value: detail.stages.length, icon: Trophy },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.06 }}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
              >
                <item.icon className="w-5 h-5 text-brand flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Next-step strip — the setup flow in the order staff actually do it */}
          {isActive && (
            <div className="bg-card border border-border rounded-xl p-5 mb-8">
              <h2 className="text-sm font-semibold text-foreground mb-1">ขั้นตอนการจัดการฤดูกาลนี้</h2>
              <p className="text-xs text-muted-foreground mb-4">
                ทำตามลำดับ: เพิ่มทีมให้ครบ → จัดคู่และจับสาย → บันทึกผลระหว่างแข่ง
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab("teams")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-foreground bg-brand px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Users className="w-3.5 h-3.5" />
                  1. จัดการทีมผู้เข้าร่วม
                </button>
                <button
                  type="button"
                  onClick={() => setTab("bracket")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-foreground border border-border px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Network className="w-3.5 h-3.5" />
                  2. {hasBracket ? "ดู / รีเซ็ตสาย" : "จับสายการแข่งขัน"}
                </button>
                <Link
                  to="/admin/matches"
                  className="flex items-center gap-1.5 text-xs font-semibold text-foreground border border-border px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Swords className="w-3.5 h-3.5" />
                  3. บันทึกผลการแข่งขัน
                </Link>
              </div>
            </div>
          )}

          {/* Stage progress */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.2 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">สาย / รุ่น</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {detail.stages.map((stage) => {
                const stageMatches = stage.rounds.reduce((r, rnd) => r + rnd.matches.length, 0)
                const stageDone = stage.rounds.reduce((r, rnd) =>
                  r + rnd.matches.filter((m) => m.winner !== null).length, 0)
                return (
                  <div key={stage.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">สาย {stage.id} — {stage.name}</p>
                        <p className="text-xs text-muted-foreground">{stage.type} · {stage.slots} ทีม</p>
                      </div>
                      <StatusPill
                        variant={stage.status === "completed" ? "win" : stage.status === "ongoing" ? "attention" : "neutral"}
                        icon={stage.status === "completed" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      >
                        {stage.status === "completed" ? "เสร็จสิ้น" : stage.status === "ongoing" ? "กำลังแข่ง" : "รอเริ่ม"}
                      </StatusPill>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{stageDone}/{stageMatches} นัด</span>
                      <div className="flex-1 mx-3 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: stageMatches > 0 ? `${(stageDone / stageMatches) * 100}%` : "0%" }}
                        />
                      </div>
                      <span>{stage.rounds.length} รอบ</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </>
      )}

      {/* ── ทีมผู้เข้าร่วม ──────────────────────────────────────────────── */}
      {tab === "teams" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {isActive ? (
            <ParticipantsPanel />
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                ฤดูกาลนี้ผ่านมาแล้ว — ดูรายชื่อทีมย้อนหลังได้อย่างเดียว
                หากต้องการแก้ไข ให้เปิดใช้งานฤดูกาลนี้ก่อน
              </div>
              <ReadOnlyRosterPanel participants={detail.participants} />
            </>
          )}
        </motion.div>
      )}

      {/* ── จับสาย ─────────────────────────────────────────────────────── */}
      {tab === "bracket" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {!isActive || !active ? (
            inactiveNotice
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  ตั้งค่าสายการแข่งขัน
                </h2>
                <DivisionTabs />
              </div>

              {hasBracket ? (
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-sm text-foreground mb-4">
                    รุ่นนี้จับสายแล้ว — จัดการผลได้ที่หน้า
                    <Link to="/admin/matches" className="text-brand font-semibold mx-1 hover:underline">ผลการแข่งขัน</Link>
                    หรือดู
                    <Link to="/admin/bracket" className="text-brand font-semibold mx-1 hover:underline">สายการแข่งขัน</Link>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/admin/bracket"
                      className="flex items-center gap-1.5 text-xs font-semibold text-brand-foreground bg-brand px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Network className="w-3.5 h-3.5" />
                      ดูสายการแข่งขัน
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleReset()}
                      className="flex items-center gap-1.5 text-xs font-semibold text-lose border border-lose/40 px-3 py-2 rounded-lg hover:bg-lose/10 disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      รีเซ็ตสาย (ลบผลทั้งหมด)
                    </button>
                  </div>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Round configs + generate */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-1">รูปแบบการแข่งขัน</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      ต้องมีทีม 2, 4, 8, 16 หรือ 32 ทีมก่อนจับสาย (ตอนนี้ {teams.length} ทีม)
                    </p>

                    {bracketSize ? (
                      <>
                        <div className="flex flex-col gap-2 mb-4">
                          {getRoundConfigs().map((rc) => (
                            <div key={rc.round} className="flex items-center justify-between">
                              <span className="text-sm text-foreground">{rc.name}</span>
                              <select
                                value={rc.bestOf}
                                onChange={(e) => updateRoundConfig(rc.round, Number(e.target.value))}
                                className="px-2 py-1.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
                              >
                                {[1, 3, 5, 7].map((n) => (
                                  <option key={n} value={n}>BO{n}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>

                        {teams.length >= 4 && (
                          <label
                            className="flex items-center gap-2 text-sm text-foreground mb-4 cursor-pointer"
                            title="เพิ่มนัดชิงอันดับ 3 ระหว่างทีมที่แพ้ในรอบรองชนะเลิศทั้งสองทีม หากไม่เลือก ทีมที่แพ้รอบรองฯ จะตกรอบทันทีโดยไม่มีนัดชิงอันดับ 3"
                          >
                            <input
                              type="checkbox"
                              checked={thirdPlace}
                              onChange={(e) => setThirdPlace(e.target.checked)}
                              className="w-4 h-4 accent-[var(--brand)]"
                            />
                            มีนัดชิงอันดับ 3
                            <Info className="w-3.5 h-3.5 text-muted-foreground" />
                          </label>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleGenerate(false)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-brand-foreground bg-brand px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                          >
                            <Play className="w-3.5 h-3.5" />
                            จับสายตามคิว
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleGenerate(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-foreground border border-border px-3 py-2 rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                            สุ่มจับสาย
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="py-2">
                        <p className="text-sm text-muted-foreground mb-3">
                          จำนวนทีมยังไม่ถึงขนาดสายที่รองรับ — เพิ่มหรือลบทีมให้ครบ 2, 4, 8, 16 หรือ 32 ทีมก่อน
                        </p>
                        <button
                          type="button"
                          onClick={() => setTab("teams")}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-foreground bg-brand px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
                        >
                          <Users className="w-3.5 h-3.5" />
                          ไปที่แท็บทีมผู้เข้าร่วม
                        </button>
                      </div>
                    )}
                  </div>

                  {/* First-round queue */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground">คิวรอบแรก</h3>
                      <button
                        type="button"
                        onClick={() => { setPickIndex(null); shuffleQueue() }}
                        disabled={teams.length < 2}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <Shuffle className="w-3 h-3" />
                        สลับคิว
                      </button>
                    </div>

                    {teams.length === 0 ? (
                      <div className="py-8 text-center">
                        <Users className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-3">ยังไม่มีทีมในรุ่นนี้</p>
                        <button
                          type="button"
                          onClick={() => setTab("teams")}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-foreground bg-brand px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
                        >
                          เพิ่มทีมก่อน
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* How-to / active selection banner — the drag handle
                            alone was not discoverable, so spell out the tap flow. */}
                        {pickIndex !== null && teams[pickIndex] ? (
                          <div className="mb-3 flex items-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-foreground">
                            <ArrowLeftRight className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                            <span className="flex-1">
                              เลือก <span className="font-semibold">{teams[pickIndex].name}</span> ไว้แล้ว —
                              แตะอีกทีมเพื่อสลับตำแหน่งกัน
                            </span>
                            <button
                              type="button"
                              onClick={() => setPickIndex(null)}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                              aria-label="ยกเลิกการเลือก"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">วิธีจัดคู่:</span>{" "}
                            แตะทีมที่ต้องการย้าย แล้วแตะอีกทีมเพื่อสลับตำแหน่งกัน
                            (หรือจะลากที่ไอคอน <GripVertical className="inline w-3 h-3 -mt-0.5" /> ก็ได้)
                            — แต่ละการ์ดคือคู่ที่จะเจอกันในรอบแรก
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto pr-1">
                          {Array.from({ length: Math.ceil(teams.length / 2) }, (_, pairIndex) => {
                            const slots: (typeof teams[number] | null)[] = [
                              teams[pairIndex * 2] ?? null,
                              teams[pairIndex * 2 + 1] ?? null,
                            ]
                            return (
                              <div key={pairIndex} className="rounded-xl border border-border overflow-hidden bg-card">
                                <div className="px-3 py-1.5 bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  คู่ที่ {pairIndex + 1}
                                </div>
                                {slots.map((team, slot) => {
                                  const index = pairIndex * 2 + slot
                                  const isPicked = pickIndex === index
                                  const isSwapTarget = pickIndex !== null && !isPicked
                                  return (
                                    <div key={team?.id ?? `${pairIndex}-${slot}-empty`}>
                                      {slot === 1 && (
                                        <div className="flex items-center gap-2 px-3">
                                          <div className="flex-1 h-px bg-border" />
                                          <span className="text-[10px] font-bold text-muted-foreground">VS</span>
                                          <div className="flex-1 h-px bg-border" />
                                        </div>
                                      )}
                                      {team ? (
                                        <div
                                          role="button"
                                          tabIndex={0}
                                          title={isPicked ? "แตะอีกครั้งเพื่อยกเลิก" : "แตะเพื่อเลือก แล้วแตะอีกทีมเพื่อสลับ"}
                                          onClick={() => pickTeam(index)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                              e.preventDefault()
                                              pickTeam(index)
                                            }
                                          }}
                                          draggable
                                          onDragStart={() => setDragIndex(index)}
                                          onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
                                          onDragOver={(e) => { e.preventDefault(); if (dragIndex !== null) setDragOverIndex(index) }}
                                          onDrop={(e) => { e.preventDefault(); dropTeam(index) }}
                                          className={`flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer outline-none transition-colors
                                            focus-visible:ring-2 focus-visible:ring-brand/40
                                            ${isPicked ? "bg-brand/15 ring-1 ring-inset ring-brand/50" : "hover:bg-muted/50"}
                                            ${isSwapTarget ? "hover:bg-brand/10" : ""}
                                            ${dragIndex === index ? "opacity-40" : ""}
                                            ${dragOverIndex === index && dragIndex !== index ? "bg-brand/10" : ""}`}
                                        >
                                          <GripVertical
                                            className="w-3.5 h-3.5 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0"
                                            aria-hidden="true"
                                          />
                                          <span className="w-5 text-xs font-bold text-muted-foreground flex-shrink-0">{index + 1}</span>
                                          <span className="flex-1 truncate text-foreground font-medium">{team.name}</span>
                                          {isSwapTarget ? (
                                            <span className="flex items-center gap-1 text-[10px] font-semibold text-brand flex-shrink-0">
                                              <ArrowLeftRight className="w-3 h-3" />
                                              สลับ
                                            </span>
                                          ) : (
                                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                              <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); moveTeam(index, -1) }}
                                                disabled={index === 0}
                                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                aria-label="เลื่อนขึ้น"
                                              >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); moveTeam(index, 1) }}
                                                disabled={index === teams.length - 1}
                                                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                aria-label="เลื่อนลง"
                                              >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="px-3 py-2.5 text-sm text-muted-foreground italic">
                                          รอคู่แข่ง
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Live bracket-tree preview — the same BracketCanvas used
                    after generation, driven off the queue above, so staff see
                    the real shape before committing (generating locks it in:
                    editing again means resetting and losing all results). */}
                {previewMatches.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                      <h3 className="text-sm font-semibold text-foreground">ตัวอย่างสาย</h3>
                      <span className="text-xs text-muted-foreground">
                        อัปเดตตามคิวด้านบนแบบเรียลไทม์ — ยังไม่บันทึกจนกว่าจะกด “จับสาย”
                      </span>
                    </div>
                    <div className="h-[420px] sm:h-[560px] bg-card border border-border rounded-xl overflow-hidden">
                      <BracketCanvas
                        tournamentName={detail.name}
                        matches={previewMatches}
                        teams={teams}
                        selectedMatchId={null}
                        onSelectMatch={() => {}}
                        labels={PREVIEW_LABELS}
                      />
                    </div>
                  </div>
                )}
                </>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  )
}
