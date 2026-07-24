import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "motion/react"
import { Trophy, Swords, Users, School, ChevronRight, Crown, Flame } from "lucide-react"

import {
  fetchDashboardStats,
  fetchTournaments,
  type HallOfFameEntry,
  type TournamentSummary,
} from "@/lib/public-api"
import { StatCard } from "../stat-card"
import { StatusPill } from "@/components/ui/status-pill"
import { CardHeader } from "@/components/ui/card"

interface DashboardStats {
  seasons: TournamentSummary[]
  totalTeams: number
  totalMatches: number
  schoolCount: number
  topSchools: { name: string; wins: number }[]
  totalSeasons: number
  hallOfFame: HallOfFameEntry[]
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // One request for the season list plus one for pre-aggregated
        // cross-season stats — not a full-detail fetch per season, which
        // is what used to make this page noticeably slower to load than
        // every other admin page as more seasons piled up.
        const [seasons, aggregate] = await Promise.all([
          fetchTournaments(),
          fetchDashboardStats(),
        ])
        if (cancelled) return
        setStats({
          seasons,
          totalTeams: seasons.reduce((acc, t) => acc + t.teamCount, 0),
          totalMatches: aggregate.totalMatches,
          schoolCount: aggregate.schoolCount,
          topSchools: aggregate.topSchools,
          totalSeasons: aggregate.totalSeasons,
          hallOfFame: aggregate.hallOfFame,
        })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ")
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  if (error) {
    return <div className="p-8 text-sm text-lose">{error}</div>
  }
  if (!stats) {
    return <div className="p-8 text-sm text-muted-foreground">กำลังโหลด...</div>
  }

  const maxWins = stats.topSchools[0]?.wins ?? 1

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground">ภาพรวม</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          ข้อมูลสรุปทั้งหมดของ NSRU E-Sport Arena of Valor
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="ฤดูกาลทั้งหมด" value={stats.seasons.length} sub="รวมฤดูกาลปัจจุบัน" icon={Trophy} accent="brand" delay={0} />
        <StatCard label="ทีมที่เข้าร่วม" value={stats.totalTeams} sub="รวมทุกฤดูกาล" icon={Users} accent="green" delay={0.06} />
        <StatCard label="นัดที่แข่งทั้งหมด" value={stats.totalMatches} sub="รวมทุกสาย" icon={Swords} accent="orange" delay={0.12} />
        <StatCard label="โรงเรียนที่เข้าร่วม" value={stats.schoolCount} sub="ไม่ซ้ำกัน" icon={School} accent="red" delay={0.18} />
      </div>

      {/* Bottom row: top schools + seasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top schools by wins */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.22 }}
          className="bg-card border border-border rounded-lg p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">อันดับโรงเรียนตามจำนวนชนะ</h2>
          </div>
          {stats.topSchools.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">ยังไม่มีผลการแข่งขัน</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.topSchools.map((school, i) => {
                const pct = Math.round((school.wins / maxWins) * 100)
                return (
                  <motion.div
                    key={school.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut", delay: 0.26 + i * 0.04 }}
                    className="flex items-center gap-3"
                  >
                    <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                      i === 0 ? "bg-yellow-400 text-white" :
                      i === 1 ? "bg-slate-300 text-slate-700" :
                      i === 2 ? "bg-orange-300 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">{school.name}</span>
                        <span className="text-xs font-bold text-brand ml-2 flex-shrink-0">{school.wins} W</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: 0.34 + i * 0.04 }}
                          className={`h-full rounded-full ${i === 0 ? "bg-amber-400" : "bg-brand"}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Season list quick view */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.26 }}
          className="bg-card border border-border rounded-lg p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-semibold text-foreground">ฤดูกาลทั้งหมด</h2>
            </div>
            <Link to="/admin/tournaments" className="text-xs text-brand font-medium hover:underline">
              จัดการทั้งหมด
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {stats.seasons.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 + i * 0.06 }}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">ปี {t.year} · {t.teamCount} ทีม</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill variant={t.status === "Live" ? "win" : "neutral"}>
                    {t.status === "Live" ? "กำลังแข่ง" : "ผ่านมาแล้ว"}
                  </StatusPill>
                  <Link to={`/admin/tournaments/${t.id}`}>
                    <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Hall of fame: which school takes a division title, and which
          school has taken one every single season on record */}
      {stats.hallOfFame.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
          className="bg-card border border-border rounded-lg overflow-hidden mt-6"
        >
          <CardHeader
            icon={<Flame className="w-4 h-4 text-attention" />}
            title="ทำเนียบแชมป์ (ทุกฤดูกาล)"
            action={
              <span className="text-xs text-muted-foreground">
                {stats.totalSeasons} ฤดูกาลที่ผ่านมา
              </span>
            }
          />
          <div className="divide-y divide-border">
            {stats.hallOfFame.map((entry, i) => (
              <motion.div
                key={entry.school}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.34 + i * 0.04 }}
                className={`flex items-center gap-3 px-5 py-3 ${entry.everySeason ? "bg-attention/5" : ""}`}
              >
                <span className="text-sm font-semibold text-foreground flex-1 min-w-0 truncate flex items-center gap-2">
                  {entry.school}
                  {entry.everySeason && (
                    <StatusPill variant="attention" icon={<Flame className="w-3 h-3" />}>
                      แชมป์ทุกปี
                    </StatusPill>
                  )}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {entry.years.join(", ")}
                </span>
                <span className="text-sm font-bold text-brand w-16 text-right flex-shrink-0">
                  {entry.titles} แชมป์
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
