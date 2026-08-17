import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { fetchTournament, type TournamentDetail } from "@/lib/public-api"
import { SiteTopbar } from "@/components/public/site-topbar"
import { TournamentHeader } from "@/components/public/tournament-header"
import { NavTabs, type TabId } from "@/components/public/nav-tabs"
import { TabOverview } from "@/components/public/tab-overview"
import { TabBracket } from "@/components/public/tab-bracket"
import { TabMatches } from "@/components/public/tab-matches"
import { TabParticipants } from "@/components/public/tab-participants"

// Kept close to the admin panel's own 6s poll so a spectator's bracket
// doesn't visibly lag behind what staff are looking at during live play.
const LIVE_REFRESH_MS = 8_000

export function TournamentPage() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<TournamentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("overview")

  useEffect(() => {
    if (!id) return
    let cancelled = false
    let timer: number | undefined

    const load = async () => {
      try {
        const detail = await fetchTournament(id)
        if (cancelled) return
        setTournament(detail)
        setError(null)
        // Live tournament: keep the projector/spectator view fresh
        if (detail.status === "Live") {
          timer = window.setTimeout(load, LIVE_REFRESH_MS)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ")
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [id])

  if (error) {
    return (
      <main className="min-h-screen bg-background font-sans flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Link to="/" className="text-sm font-semibold text-brand">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </main>
    )
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-background font-sans flex items-center justify-center">
        <p className="text-muted-foreground">กำลังโหลด...</p>
      </main>
    )
  }

  const stage1 = tournament.stages[0]
  const stage2 = tournament.stages[1]

  return (
    <main className="min-h-screen bg-background font-sans">
      <SiteTopbar crumb={tournament.name} />

      <TournamentHeader tournament={tournament} />
      <NavTabs activeTab={activeTab} onTabChange={setActiveTab} stages={tournament.stages} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {activeTab === "overview" && (
              <TabOverview tournament={tournament} onTabChange={setActiveTab} />
            )}
            {activeTab === "stage-1" && stage1 && (
              <TabBracket stage={stage1} />
            )}
            {activeTab === "stage-2" && stage2 && (
              <TabBracket stage={stage2} />
            )}
            {activeTab === "matches" && (
              <TabMatches tournament={tournament} />
            )}
            {activeTab === "participants" && (
              <TabParticipants
                participants={tournament.participants}
                totalTeams={tournament.teamCount}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  )
}
