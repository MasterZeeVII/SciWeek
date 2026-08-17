import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import {
  Trophy, Users, Calendar, ChevronRight, Plus, Eye, Power, X,
} from "lucide-react"

import { fetchTournaments, LEVEL_LABEL, type TournamentSummary } from "@/lib/public-api"
import { useTournament } from "@/lib/tournament-context"
import { StatusPill } from "@/components/ui/status-pill"

export function AdminTournaments() {
  const { tournament: active, createTournament, activateTournament } = useTournament()
  const [seasons, setSeasons] = useState<TournamentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("NSRU E-Sport SCIWEEK")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [season, setSeason] = useState("1")
  const [busy, setBusy] = useState(false)

  // Prefill the season field with the first unused number for the typed year
  // so staff never have to guess (and never accidentally rename an existing
  // season by reusing its number).
  useEffect(() => {
    const numericYear = Number(year)
    if (!seasons || !Number.isFinite(numericYear)) return
    const used = seasons.filter((t) => t.year === numericYear).map((t) => t.season)
    setSeason(String(used.length > 0 ? Math.max(...used) + 1 : 1))
  }, [year, seasons])

  const reload = useCallback(async () => {
    try {
      setSeasons(await fetchTournaments())
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ")
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await createTournament(name.trim(), Number(year) || undefined, Number(season) || undefined)
      setShowCreate(false)
      await reload()
    } catch {
      // error surfaced by context
    } finally {
      setBusy(false)
    }
  }

  const handleActivate = async (id: string) => {
    if (busy) return
    setBusy(true)
    try {
      await activateTournament(id)
      await reload()
    } catch {
      // error surfaced by context
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">ทัวร์นาเมนต์</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            จัดการฤดูกาลทั้งหมด — เปิดฤดูกาลใหม่ได้ทุกปี
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 bg-brand text-brand-foreground text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? "ยกเลิก" : "เพิ่มฤดูกาลใหม่"}
        </button>
      </motion.div>

      {error && (
        <div className="mb-5 rounded-lg border border-lose/40 bg-lose/10 px-4 py-3 text-sm text-lose">
          {error}
        </div>
      )}

      {/* Create season form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onSubmit={(e) => void handleCreate(e)}
            className="overflow-hidden mb-6"
          >
            <div className="bg-card border border-border rounded-xl p-5 flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-52">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  ชื่อการแข่งขัน
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  ปี (ค.ศ.)
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  ครั้งที่
                </label>
                <input
                  type="number"
                  min={1}
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim() || busy}
                className="bg-brand text-brand-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {busy ? "กำลังสร้าง..." : "สร้างและเปิดใช้งาน"}
              </button>
              <p className="w-full text-xs text-muted-foreground">
                ฤดูกาลใหม่จะถูกเปิดใช้งานทันที และสร้างรุ่น ม.ต้น / ม.ปลาย ให้อัตโนมัติ
                — จัดแข่งปีเดียวกันได้หลายครั้งโดยเพิ่มเลข "ครั้งที่"
                (ถ้าปีและครั้งที่ตรงกับฤดูกาลที่มีอยู่แล้ว จะเป็นการเปลี่ยนชื่อและเปิดใช้งานฤดูกาลนั้นแทน)
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Season cards */}
      {seasons === null ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      ) : seasons.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">ยังไม่มีฤดูกาล — เพิ่มฤดูกาลใหม่เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {seasons.map((t, i) => {
            const isActive = t.status === "Live" || t.id === active?.id
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 + i * 0.06 }}
                className={`bg-card border rounded-xl p-5 ${isActive ? "border-brand/40 ring-1 ring-brand/20" : "border-border"}`}
              >
                <div className="flex items-start gap-4">
                  {/* Year badge (season superscript when a year has 2+ events) */}
                  <div className="relative w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-brand">{String(t.year).slice(-2)}</span>
                    {t.season > 1 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-brand text-brand-foreground text-[10px] font-bold flex items-center justify-center">
                        #{t.season}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-foreground">{t.name}</h2>
                      <StatusPill variant={isActive ? "win" : "neutral"}>
                        {isActive ? "กำลังใช้งาน" : "ผ่านมาแล้ว"}
                      </StatusPill>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        ปี {t.year}{t.season > 1 ? ` ครั้งที่ ${t.season}` : ""}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {t.teamCount} ทีม
                      </span>
                    </div>

                    {/* Champions row */}
                    {t.champions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {t.champions.map((c) => (
                          <span key={c.level} className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                            <Trophy className="w-3 h-3" />
                            {LEVEL_LABEL[c.level]}: {c.team}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isActive && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleActivate(t.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Power className="w-3.5 h-3.5" />
                        เปิดใช้งาน
                      </button>
                    )}
                    <Link
                      to={`/tournament/${t.id}`}
                      target="_blank"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      ดูสาธารณะ
                    </Link>
                    <Link
                      to={`/admin/tournaments/${t.id}`}
                      className="flex items-center gap-1.5 text-xs font-semibold text-brand-foreground bg-brand hover:opacity-90 px-3 py-1.5 rounded-lg transition-opacity"
                    >
                      จัดการ
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
