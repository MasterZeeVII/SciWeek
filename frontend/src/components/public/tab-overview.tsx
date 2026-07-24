import { motion } from "motion/react"
import {
  Trophy,
  MapPin,
  Smartphone,
  Users,
  Building2,
  CheckCircle2,
  ChevronRight,
  Gamepad2,
  TrendingUp,
} from "lucide-react"
import { LEVEL_LABEL, type TournamentDetail } from "@/lib/public-api"
import { SITE } from "@/lib/site-config"
import { CardHeader } from "@/components/ui/card"
import { StatusPill } from "@/components/ui/status-pill"
import type { TabId } from "./nav-tabs"
import { SchoolStats } from "./school-stats"

type Props = {
  tournament: TournamentDetail
  onTabChange: (tab: TabId) => void
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const, delay },
})

const STAGE_STATUS = {
  completed: { label: "เสร็จสิ้น", variant: "win" as const },
  ongoing: { label: "กำลังดำเนินการ", variant: "attention" as const },
  upcoming: { label: "ยังไม่เริ่ม", variant: "neutral" as const },
}

export function TabOverview({ tournament, onTabChange }: Props) {
  const hasStandings = tournament.standings.some((s) => s.first || s.second || s.third)

  return (
    <div className="flex flex-col gap-6">
      {/* Top two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — main info */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Info card */}
          <motion.section {...fadeUp(0)} className="bg-card rounded-lg border border-border overflow-hidden">
            <CardHeader icon={<Building2 className="w-4 h-4 text-brand" />} title="ข้อมูลการแข่งขัน" />
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                  <Gamepad2 className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">เกม</p>
                  <p className="font-semibold text-sm text-foreground">{SITE.game}</p>
                  <p className="text-xs text-muted-foreground">{SITE.platform}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">สถานที่</p>
                  <p className="font-semibold text-sm text-foreground">{SITE.country}</p>
                  <p className="text-xs text-muted-foreground">{SITE.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ขนาด</p>
                  <p className="font-semibold text-sm text-foreground">{tournament.teamCount} ทีม</p>
                  <p className="text-xs text-muted-foreground">({tournament.playersPerTeam} คน/ทีม)</p>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {SITE.description}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                จัดโดย <span className="font-semibold text-foreground">{SITE.organizer}</span>
              </p>
            </div>
          </motion.section>

          {/* Stages quick view */}
          <motion.section {...fadeUp(0.08)} className="bg-card rounded-lg border border-border overflow-hidden">
            <CardHeader icon={<Smartphone className="w-4 h-4 text-brand" />} title="สายการแข่งขัน" />
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tournament.stages.map((stage, i) => {
                const status = STAGE_STATUS[stage.status]
                return (
                  <motion.button
                    key={stage.id}
                    type="button"
                    onClick={() => onTabChange(i === 0 ? "stage-1" : "stage-2")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group flex items-center justify-between p-4 rounded-lg border border-border bg-surface hover:border-brand hover:bg-accent transition-colors cursor-pointer text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-brand bg-accent px-2 py-0.5 rounded-full">
                          สาย {stage.id}
                        </span>
                        <StatusPill variant={status.variant}>{status.label}</StatusPill>
                      </div>
                      <p className="font-bold text-foreground">{stage.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {stage.type} · {stage.slots} slots
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-brand transition-colors" />
                  </motion.button>
                )
              })}
            </div>
          </motion.section>
        </div>

        {/* RIGHT — final standing & prizes */}
        <div className="flex flex-col gap-5">
          {/* Final Standing */}
          <motion.section {...fadeUp(0.12)} className="bg-card rounded-lg border border-border overflow-hidden">
            <CardHeader icon={<Trophy className="w-4 h-4 text-brand" />} title="ผลการแข่งขันสุดท้าย" />
            <div className="p-5 flex flex-col gap-3">
              {!hasStandings && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ยังไม่มีผลสรุป — การแข่งขันยังไม่จบ
                </p>
              )}
              {hasStandings &&
                tournament.standings.map((standing, groupIdx) => (
                  <div key={standing.level}>
                    {groupIdx > 0 && <div className="border-t border-border mb-3" />}
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      {LEVEL_LABEL[standing.level]}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {standing.first && (
                        <StandingRow rank={1} team={standing.first} gold delay={0.18 + groupIdx * 0.12} />
                      )}
                      {standing.second && (
                        <StandingRow rank={2} team={standing.second} delay={0.22 + groupIdx * 0.12} />
                      )}
                      {standing.third && (
                        <StandingRow rank={3} team={standing.third} delay={0.26 + groupIdx * 0.12} />
                      )}
                      {!standing.first && !standing.second && !standing.third && (
                        <p className="text-xs text-muted-foreground italic px-1">ยังไม่สรุปผล</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </motion.section>

          {/* Prizes */}
          <motion.section {...fadeUp(0.16)} className="bg-card rounded-lg border border-border overflow-hidden">
            <CardHeader icon={<Trophy className="w-4 h-4 text-brand" />} title="รางวัล" />
            <div className="p-5">
              <ul className="flex flex-col gap-2">
                {SITE.prizes.map((prize, i) => (
                  <li key={i} className={`flex gap-2 text-sm leading-relaxed
                    ${prize.startsWith("รางวัลของ") ? "font-semibold text-foreground mt-2 first:mt-0" : "text-muted-foreground"}`}>
                    {!prize.startsWith("รางวัลของ") && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand mt-0.5 flex-shrink-0" />
                    )}
                    <span>{prize.replace(/^•\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        </div>
      </div>

      {/* School analytics — full width. Held back while the tournament is
          still Live so a losing school's aggregate record isn't broadcast
          mid-event; it appears once the season is decided. */}
      {tournament.status === "Past" ? (
        <SchoolStats tournament={tournament} />
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <CardHeader icon={<TrendingUp className="w-4 h-4 text-brand" />} title="สถิติโรงเรียน" />
          <p className="p-5 text-sm text-muted-foreground text-center">
            สถิติโรงเรียนจะแสดงหลังจบการแข่งขัน
          </p>
        </div>
      )}
    </div>
  )
}

function StandingRow({ rank, team, gold, delay = 0 }: { rank: number; team: string; gold?: boolean; delay?: number }) {
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg
        ${gold ? "bg-yellow-50 border border-yellow-200" : "bg-surface"}`}
    >
      <span className="text-base w-6 text-center flex-shrink-0">{medals[rank]}</span>
      <span className={`text-sm font-medium truncate ${gold ? "text-yellow-800" : "text-foreground"}`}>
        {team}
      </span>
    </motion.div>
  )
}
