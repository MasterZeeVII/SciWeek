import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { motion } from "motion/react"
import {
  ArrowLeft, ArrowDown, ArrowUp, CheckCircle2, Clock, Eye, Info, Network,
  Power, RotateCcw, Shuffle, Swords, Trophy, Users, Play,
} from "lucide-react"

import { fetchTournament, type TournamentDetail } from "@/lib/public-api"
import { useTournament } from "@/lib/tournament-context"
import { StatusPill } from "@/components/ui/status-pill"
import { DivisionTabs } from "../division-tabs"

export function AdminTournamentManage() {
  const { id } = useParams<{ id: string }>()
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

  const isActive = !!id && active?.id === id

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

  if (error) return <div className="p-8 text-sm text-lose">{error}</div>
  if (!detail) return <div className="p-8 text-sm text-muted-foreground">กำลังโหลด...</div>

  const totalMatches = detail.stages.reduce((s, st) =>
    s + st.rounds.reduce((r, rnd) => r + rnd.matches.length, 0), 0)
  const completedMatches = detail.stages.reduce((s, st) =>
    s + st.rounds.reduce((r, rnd) => r + rnd.matches.filter((m) => m.winner !== null).length, 0), 0)

  const bracketSize = getBracketSize()
  const hasBracket = (active?.matches.length ?? 0) > 0
  const teams = active?.teams ?? []

  const moveTeam = (index: number, direction: -1 | 1) => {
    const next = [...teams]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    reorderTeams(next)
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

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
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
        className="flex items-start justify-between gap-3 mb-8 flex-wrap"
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

      {contextError && (
        <div className="mb-5 rounded-lg border border-lose/40 bg-lose/10 px-4 py-3 text-sm text-lose">
          {contextError}
        </div>
      )}

      {/* Stat strip */}
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

      {/* Stage progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.2 }}
        className="mb-8"
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

      {/* Bracket setup — only for the active season */}
      {isActive && active && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.26 }}
        >
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
                  <p className="text-sm text-muted-foreground py-4">
                    เพิ่มทีมได้ที่หน้า
                    <Link to="/admin/participants" className="text-brand font-semibold mx-1 hover:underline">ผู้เข้าร่วม</Link>
                  </p>
                )}
              </div>

              {/* First-round queue */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">คิวรอบแรก</h3>
                  <button
                    type="button"
                    onClick={shuffleQueue}
                    disabled={teams.length < 2}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <Shuffle className="w-3 h-3" />
                    สลับคิว
                  </button>
                </div>
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">ยังไม่มีทีมในรุ่นนี้</p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-1">
                    {teams.map((team, index) => (
                      <div
                        key={team.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm
                          ${index % 2 === 0 ? "bg-muted/40" : "bg-card"}`}
                      >
                        <span className="w-6 text-xs font-bold text-muted-foreground">{index + 1}</span>
                        <span className="flex-1 truncate text-foreground">{team.name}</span>
                        <span className="text-xs text-muted-foreground mr-1">
                          คู่ที่ {Math.floor(index / 2) + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveTeam(index, -1)}
                          disabled={index === 0}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          aria-label="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTeam(index, 1)}
                          disabled={index === teams.length - 1}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          aria-label="เลื่อนลง"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {!isActive && (
        <p className="text-xs text-muted-foreground">
          ฤดูกาลนี้ยังไม่ได้เปิดใช้งาน — เปิดใช้งานก่อนจึงจะแก้ไขทีมและสายการแข่งขันได้
        </p>
      )}
    </div>
  )
}
