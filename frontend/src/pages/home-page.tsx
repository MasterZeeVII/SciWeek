import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "motion/react"
import { Calendar, Users, MapPin, Trophy, ChevronRight, Gamepad2 } from "lucide-react"
import { fetchTournaments, LEVEL_LABEL, type TournamentSummary } from "@/lib/public-api"
import { SITE } from "@/lib/site-config"
import { StatusPill } from "@/components/ui/status-pill"
import { SiteTopbar } from "@/components/public/site-topbar"

const statusConfig = {
  Past: { label: "เสร็จสิ้น", variant: "neutral" as const },
  Live: { label: "กำลังแข่ง", variant: "win" as const },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const, delay: i * 0.08 },
  }),
}

export function HomePage() {
  const [tournaments, setTournaments] = useState<TournamentSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTournaments()
      .then((data) => { if (!cancelled) setTournaments(data) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ") })
    return () => { cancelled = true }
  }, [])

  return (
    <main className="min-h-screen bg-background font-sans">
      <SiteTopbar />

      {/* Hero */}
      <div className="bg-card border-b border-border">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-5xl mx-auto flex items-center px-4 md:px-8 py-8 gap-5"
        >
          <div className="w-16 h-16 rounded-xl bg-brand flex items-center justify-center shadow-lg flex-shrink-0">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-widest uppercase text-brand mb-1">
              {SITE.seriesName}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight text-balance">
              {SITE.game}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {SITE.university}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="flex items-center gap-3 mb-5"
        >
          <Trophy className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-bold text-foreground">ทุกซีซั่น</h2>
          <div className="flex-1 h-px bg-border" />
        </motion.div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-5">
            {error}
          </div>
        )}
        {!error && tournaments === null && (
          <div className="py-16 text-center text-muted-foreground">กำลังโหลด...</div>
        )}
        {tournaments !== null && tournaments.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">ยังไม่มีการแข่งขัน</div>
        )}

        {/* Tournament cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(tournaments ?? []).map((t, i) => {
            const cfg = statusConfig[t.status]
            const isLive = t.status === "Live"

            return (
              <motion.div
                key={t.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                <Link
                  to={`/tournament/${t.id}`}
                  className={`group relative bg-card border rounded-lg overflow-hidden shadow-sm transition-shadow block
                    border-border hover:shadow-md hover:border-brand/40
                    ${isLive ? "ring-2 ring-success/40" : ""}
                  `}
                >
                  {/* Card banner */}
                  <div className="relative h-20 overflow-hidden bg-gradient-to-r from-surface to-accent">
                    {/* Year badge */}
                    <div className="absolute top-3 left-3">
                      <span className="text-2xl font-extrabold text-brand drop-shadow-sm">{t.year}</span>
                    </div>
                    {/* Status badge */}
                    <div className="absolute top-3 right-3">
                      <StatusPill variant={cfg.variant}>
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-success mr-0.5 animate-pulse" />}
                        {cfg.label}
                      </StatusPill>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-4 pt-3 pb-4">
                    <h3 className="font-bold text-foreground text-sm leading-snug text-balance">{t.name}</h3>
                    <div className="mt-2 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>ส.ค. {t.year}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{SITE.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{t.teamCount} ทีม</span>
                      </div>
                    </div>

                    {t.champions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border flex flex-col gap-1">
                        {t.champions.map((c) => (
                          <div key={c.level} className="flex items-center gap-1.5">
                            <StatusPill variant="gold" className="px-1.5">
                              แชมป์ {LEVEL_LABEL[c.level]}
                            </StatusPill>
                            <span className="text-xs text-foreground font-medium truncate">{c.team}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-end">
                      <span className="flex items-center gap-1 text-xs font-semibold text-brand group-hover:gap-2 transition-all">
                        ดูรายละเอียด
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>

    </main>
  )
}
