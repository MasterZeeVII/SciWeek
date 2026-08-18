import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Lock, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react"

import { useTournament } from "@/lib/tournament-context"
import { schoolsApi } from "@/lib/schools-api"
import type { Team, TeamMember } from "@/lib/tournament-types"
import { LEVEL_LABEL, type Participant } from "@/lib/public-api"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DivisionTabs } from "./division-tabs"

const MAX_PLAYERS = 5
const MAX_TEAMS = 32
const NEW_SCHOOL_VALUE = "__new__"

type PlayerDraft = { name: string; inGameName: string }
type FormTab = number // 0 = team info, 1..5 = player n

function emptyPlayers(): PlayerDraft[] {
  return Array.from({ length: MAX_PLAYERS }, () => ({ name: "", inGameName: "" }))
}

function playersFromTeam(team: Team): PlayerDraft[] {
  const drafts = emptyPlayers()
  team.members.slice(0, MAX_PLAYERS).forEach((member, index) => {
    drafts[index] = { name: member.name, inGameName: member.inGameName ?? "" }
  })
  return drafts
}

/**
 * Editable roster for the **active** season only — it reads and writes through
 * `useTournament()`, which by backend design only ever holds the active
 * tournament. Rendered inside the per-season page (`/admin/tournaments/:id`)
 * so staff never lose track of which season they are filling in.
 */
export function ParticipantsPanel() {
  const { tournament, addTeam, updateTeam, removeTeam } = useTournament()
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [tab, setTab] = useState<FormTab>(0)
  const [schools, setSchools] = useState<string[]>([])
  const [schoolsError, setSchoolsError] = useState<string | null>(null)
  const [schoolChoice, setSchoolChoice] = useState("")
  const [newSchoolName, setNewSchoolName] = useState("")
  const [players, setPlayers] = useState<PlayerDraft[]>(emptyPlayers())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    schoolsApi
      .list()
      .then((list) => setSchools(list.map((s) => s.name)))
      .catch((err) => setSchoolsError(err instanceof Error ? err.message : "โหลดรายชื่อโรงเรียนไม่สำเร็จ"))
  }, [])

  const teams = tournament?.teams ?? []
  const locked = (tournament?.matches.length ?? 0) > 0
  const filtered = teams.filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase()),
  )

  const openCreate = () => {
    setEditing(null)
    setSchoolChoice("")
    setNewSchoolName("")
    setPlayers(emptyPlayers())
    setTab(0)
    setFormOpen(true)
  }

  const openEdit = (team: Team) => {
    setEditing(team)
    setSchoolChoice(team.name.replace(/\s#\d+$/, ""))
    setNewSchoolName("")
    setPlayers(playersFromTeam(team))
    setTab(0)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const isAddingNewSchool = schoolChoice === NEW_SCHOOL_VALUE
  const schoolName = (isAddingNewSchool ? newSchoolName : schoolChoice).trim()

  const handleSubmit = async () => {
    if (!schoolName || busy) return
    const members = players
      .filter((p) => p.name.trim())
      .map((p, index): TeamMember => ({
        id: String(index),
        name: p.name.trim(),
        inGameName: p.inGameName.trim() || null,
      }))
    setBusy(true)
    try {
      if (editing) {
        await updateTeam(editing.id, { name: schoolName, members })
      } else {
        await addTeam({ name: schoolName, members })
      }
      if (isAddingNewSchool && !schools.includes(schoolName)) {
        setSchools((current) => [...current, schoolName].sort((a, b) => a.localeCompare(b, "th")))
      }
      closeForm()
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (team: Team) => {
    if (!window.confirm(`ลบทีม "${team.name}"?`)) return
    await removeTeam(team.id)
  }

  const filledCount = players.filter((p) => p.name.trim()).length

  return (
    <div>
      {/* Section toolbar: division switch + search + add */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <DivisionTabs />
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาทีม/โรงเรียน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!tournament || locked || teams.length >= MAX_TEAMS}
          className="flex items-center gap-2 bg-brand text-brand-foreground text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          <Plus className="w-4 h-4" />
          เพิ่มทีมใหม่
        </button>
      </div>

      {locked && (
        <div className="mb-4 rounded-lg border border-attention/30 bg-attention/10 px-4 py-3 text-sm text-attention flex items-start gap-2">
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>รุ่นนี้จับสายแล้ว — ต้องรีเซ็ตสายที่แท็บ “จับสาย” ก่อนจึงจะแก้ไขทีมได้</span>
        </div>
      )}

      {/* Team table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span className="w-8">#</span>
          <span>ทีม / โรงเรียน</span>
          <span>ผู้เล่น</span>
          <span className="text-right">จัดการ</span>
        </div>
        {filtered.length === 0 ? (
          <div className="py-14 text-center px-6">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            {teams.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  ยังไม่มีทีมในรุ่นนี้ — เริ่มจากการเพิ่มทีมแรก
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  disabled={!tournament || locked}
                  className="inline-flex items-center gap-2 mt-3 bg-brand text-brand-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มทีมใหม่
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่พบทีมที่ค้นหา</p>
            )}
          </div>
        ) : (
          filtered.map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(i * 0.02, 0.25) }}
              className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-4 px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <span className="w-8 text-xs font-bold text-muted-foreground">{team.seed}</span>
              <span className="text-sm font-medium text-foreground truncate">{team.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                {team.members.length > 0
                  ? team.members.map((m) => m.inGameName || m.name).join(", ")
                  : "—"}
              </span>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(team)}
                  disabled={locked}
                  className="p-2 text-muted-foreground hover:text-brand rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                  aria-label="แก้ไข"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(team)}
                  disabled={locked}
                  className="p-2 text-muted-foreground hover:text-lose rounded-lg hover:bg-lose/10 disabled:opacity-40 transition-colors"
                  aria-label="ลบ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
      <p className="text-xs text-muted-foreground mt-3 text-right">
        {filtered.length} ทีม (สูงสุด {MAX_TEAMS} ทีมต่อรุ่น)
      </p>

      {/* ── New/Edit participant modal (Toornament-style tabs) ─────────── */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={closeForm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-xl shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="px-6 pt-5 pb-0 border-b border-border rounded-t-xl flex-shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {tournament?.name ?? "ผู้เข้าร่วม"} /
                    </p>
                    <h2 className="text-xl font-bold text-foreground">
                      {editing ? "แก้ไขทีม" : "เพิ่มทีมใหม่"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                    aria-label="ปิด"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tabs: team info + player 1-5 */}
                <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mb-px">
                  <FormTabButton active={tab === 0} onClick={() => setTab(0)}>
                    ข้อมูลทีม
                  </FormTabButton>
                  {Array.from({ length: MAX_PLAYERS }, (_, i) => (
                    <FormTabButton key={i} active={tab === i + 1} onClick={() => setTab(i + 1)}>
                      ผู้เล่น {i + 1}
                      {players[i].name.trim() && <span className="ml-1 text-win">●</span>}
                    </FormTabButton>
                  ))}
                </div>
              </div>

              {/* Tab body */}
              <div className="px-6 py-6 min-h-56 overflow-y-auto flex-1">
                {tab === 0 ? (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        โรงเรียน
                      </label>
                      {schoolsError && (
                        <p className="text-xs text-lose mb-1.5">{schoolsError}</p>
                      )}
                      <SearchableSelect
                        value={schoolChoice}
                        onChange={setSchoolChoice}
                        options={schools.map((name) => ({ value: name, label: name }))}
                        placeholder="-- เลือกโรงเรียน --"
                        searchPlaceholder="ค้นหาโรงเรียน..."
                        emptyLabel="ไม่พบโรงเรียนที่ค้นหา"
                        renderValue={(v) =>
                          v === NEW_SCHOOL_VALUE ? (newSchoolName.trim() || "โรงเรียนใหม่") : null
                        }
                        footer={(query, close) => (
                          <button
                            type="button"
                            onClick={() => {
                              setSchoolChoice(NEW_SCHOOL_VALUE)
                              setNewSchoolName(query)
                              close()
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-brand font-medium hover:bg-muted transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            เพิ่มโรงเรียนใหม่{query ? `: "${query}"` : ""}
                          </button>
                        )}
                      />
                      {isAddingNewSchool && (
                        <input
                          type="text"
                          value={newSchoolName}
                          onChange={(e) => setNewSchoolName(e.target.value)}
                          placeholder="ชื่อโรงเรียนใหม่ เช่น ร.ร.นครสวรรค์"
                          autoFocus
                          className="w-full mt-2 px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                        />
                      )}
                      <p className="text-xs text-muted-foreground mt-1.5">
                        ถ้าโรงเรียนเดียวกันส่งหลายทีม ระบบจะใส่หมายเลขทีม (#2, #3) ให้อัตโนมัติ
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        ผู้เล่น {filledCount}/{MAX_PLAYERS} คน — กรอกรายชื่อได้ที่แท็บ ผู้เล่น 1–5
                      </p>
                    </div>
                  </div>
                ) : (
                  <PlayerFields
                    index={tab - 1}
                    draft={players[tab - 1]}
                    onChange={(draft) => {
                      setPlayers((current) =>
                        current.map((p, i) => (i === tab - 1 ? draft : p)),
                      )
                    }}
                  />
                )}
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-border rounded-b-xl flex-shrink-0 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  ผู้เล่น {filledCount}/{MAX_PLAYERS} คน
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground border border-border px-4 py-2 rounded-lg transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!schoolName || busy}
                    className="bg-win text-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {busy ? "กำลังบันทึก..." : editing ? "บันทึก" : "สร้างทีม"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Roster of a season that is **not** currently active. The tournament context
 * can only ever hold the active season, so historical rosters are read from the
 * public detail payload (`fetchTournament(id).participants`) and shown
 * read-only — editing a past season is impossible by design.
 */
export function ReadOnlyRosterPanel({ participants }: { participants: Participant[] }) {
  const [search, setSearch] = useState("")

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const matches = participants.filter(
      (p) =>
        p.name.toLowerCase().includes(query) || p.school.toLowerCase().includes(query),
    )
    const levels: Participant["level"][] = ["JUNIOR", "SENIOR"]
    return levels
      .map((level) => ({ level, teams: matches.filter((p) => p.level === level) }))
      .filter((group) => group.teams.length > 0)
  }, [participants, search])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาทีม/โรงเรียน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
          />
        </div>
        <span className="text-xs text-muted-foreground">{participants.length} ทีม</span>
      </div>

      {groups.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-14 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {participants.length === 0 ? "ฤดูกาลนี้ไม่มีข้อมูลทีม" : "ไม่พบทีมที่ค้นหา"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <div key={group.level} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {LEVEL_LABEL[group.level]}
                </span>
                <span className="text-xs text-muted-foreground">{group.teams.length} ทีม</span>
              </div>
              {group.teams.map((team, i) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 px-5 py-2.5 border-b border-border last:border-0"
                >
                  <span className="w-6 text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <span className="text-sm text-foreground truncate">{team.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FormTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
        active
          ? "text-brand border-brand"
          : "text-muted-foreground border-transparent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

function PlayerFields({
  index,
  draft,
  onChange,
}: {
  index: number
  draft: PlayerDraft
  onChange: (draft: PlayerDraft) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          ชื่อ-นามสกุล ผู้เล่น {index + 1}
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="ชื่อจริงของผู้เล่น"
          className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          ชื่อในเกม (IGN)
        </label>
        <input
          type="text"
          value={draft.inGameName}
          onChange={(e) => onChange({ ...draft, inGameName: e.target.value })}
          placeholder="ไม่บังคับ"
          className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        เว้นว่างได้ถ้าทีมมีผู้เล่นไม่ครบ 5 คน — บันทึกเฉพาะช่องที่กรอกชื่อ
      </p>
    </div>
  )
}
