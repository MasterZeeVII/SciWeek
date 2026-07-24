import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Users, Search } from "lucide-react"
import { LEVEL_LABEL, type DivisionLevel, type Participant } from "@/lib/public-api"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { StatusPill } from "@/components/ui/status-pill"

type Props = {
  participants: Participant[]
  totalTeams: number
}

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const cardVariant = {
  hidden: { opacity: 0, scale: 0.93, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
}

export function TabParticipants({ participants, totalTeams }: Props) {
  const [search, setSearch] = useState("")
  const [filterGroup, setFilterGroup] = useState<"all" | DivisionLevel>("all")

  const filtered = participants.filter((p) => {
    const matchGroup = filterGroup === "all" || p.level === filterGroup
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.school.toLowerCase().includes(search.toLowerCase())
    return matchGroup && matchSearch
  })

  const junior = participants.filter((p) => p.level === "JUNIOR")
  const senior = participants.filter((p) => p.level === "SENIOR")

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-wrap items-center justify-between gap-4 mb-5"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-brand" />
          <h2 className="text-xl font-bold text-foreground">ผู้เข้าร่วม</h2>
          <span className="ml-1 px-2.5 py-0.5 bg-brand text-brand-foreground text-xs font-bold rounded-full">
            {totalTeams} ทีม
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาทีม..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 w-52"
            />
          </div>
          <SegmentedControl
            layoutId="participant-filter-pill"
            value={filterGroup}
            onChange={setFilterGroup}
            options={(["all", "JUNIOR", "SENIOR"] as const).map((g) => ({
              value: g,
              label:
                g === "all"
                  ? `ทั้งหมด (${totalTeams})`
                  : `${LEVEL_LABEL[g]} (${g === "JUNIOR" ? junior.length : senior.length})`,
            }))}
          />
        </div>
      </motion.div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "ทีมทั้งหมด", value: totalTeams },
          { label: `ระดับ ${LEVEL_LABEL.JUNIOR}`, value: junior.length },
          { label: `ระดับ ${LEVEL_LABEL.SENIOR}`, value: senior.length },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 + i * 0.07 }}
            className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">ไม่พบทีมที่ค้นหา</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={filterGroup + search}
            variants={gridVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {filtered.map((team) => (
              <motion.div key={team.id} variants={cardVariant}>
                <TeamCard team={team} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

function TeamCard({ team }: { team: Participant }) {
  const isJunior = team.level === "JUNIOR"
  const initials = team.school.slice(0, 2)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl hover:border-brand/40 hover:shadow-sm transition-all group"
    >
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 border
        ${isJunior
          ? "bg-primary/10 text-primary border-primary/20"
          : "bg-attention/10 text-attention border-attention/20"
        }`}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate leading-tight" title={team.name}>
          {team.name}
        </p>
        <StatusPill variant={isJunior ? "brand" : "attention"} className="mt-1">
          {LEVEL_LABEL[team.level]}
        </StatusPill>
      </div>
    </motion.div>
  )
}
