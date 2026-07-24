import { motion } from "motion/react"
import { MapPin, Calendar, Users, Trophy } from "lucide-react"
import type { TournamentDetail } from "@/lib/public-api"
import { SITE } from "@/lib/site-config"
import { StatusPill } from "@/components/ui/status-pill"

type Props = {
  tournament: TournamentDetail
}

export function TournamentHeader({ tournament }: Props) {
  const isLive = tournament.status === "Live"
  return (
    <header className="bg-card border-b border-border">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-6xl mx-auto flex items-center px-4 md:px-8 py-6 gap-5"
      >
        <div className="w-16 h-16 rounded-xl bg-brand flex items-center justify-center shadow-md flex-shrink-0">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight text-balance">
            {tournament.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {tournament.year}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
              <MapPin className="w-3.5 h-3.5" />
              {SITE.location}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
              <Users className="w-3.5 h-3.5" />
              {tournament.teamCount} ทีม
            </span>
            <StatusPill variant={isLive ? "win" : "neutral"}>
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-success mr-0.5 animate-pulse" />}
              {isLive ? "กำลังแข่ง" : "เสร็จสิ้น"}
            </StatusPill>
          </div>
        </div>
      </motion.div>
    </header>
  )
}
