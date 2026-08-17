import { Link, NavLink } from "react-router-dom"
import { motion } from "motion/react"
import {
  LayoutDashboard,
  Trophy,
  Swords,
  Users,
  Network,
  Camera,
  UserCog,
  ChevronRight,
  ArrowUpRight,
  LogOut,
  Gamepad2,
  X,
} from "lucide-react"

import { useTournament } from "@/lib/tournament-context"
import { hasRole, type Role } from "@/lib/roles"

export type { Role }

type NavItem = { to: string; label: string; icon: typeof Trophy; end: boolean; roles: Role[] }

// ADMIN never needs listing — hasRole() lets it through everywhere.
// The arrays only spell out the extra roles that share the page.
//
// Grouped by how staff actually use the panel: overview is its own thing,
// "setup" is done once before/between events, "live ops" is what MONITOR
// and FIELD_STAFF tap between all afternoon during a match, "admin" is
// housekeeping. A group with no visible items (e.g. FIELD_STAFF has no
// setup access) simply doesn't render.
const navGroups: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ to: "/admin", label: "ภาพรวม", icon: LayoutDashboard, end: true, roles: ["MONITOR", "FIELD_STAFF"] }],
  },
  {
    label: "ตั้งค่า",
    items: [
      { to: "/admin/tournaments", label: "ทัวร์นาเมนต์", icon: Trophy, end: false, roles: [] },
      { to: "/admin/participants", label: "ผู้เข้าร่วม", icon: Users, end: false, roles: [] },
    ],
  },
  {
    label: "ปฏิบัติการสด",
    items: [
      { to: "/admin/matches", label: "ผลการแข่งขัน", icon: Swords, end: false, roles: ["MONITOR"] },
      { to: "/admin/scan", label: "สแกนคะแนน", icon: Camera, end: false, roles: ["MONITOR", "FIELD_STAFF"] },
      { to: "/admin/bracket", label: "สายการแข่งขัน", icon: Network, end: false, roles: ["MONITOR", "FIELD_STAFF"] },
    ],
  },
  {
    label: "ผู้ดูแลระบบ",
    items: [{ to: "/admin/users", label: "ผู้ใช้งาน", icon: UserCog, end: false, roles: [] }],
  },
]

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  MONITOR: "ผู้ตรวจสอบ",
  FIELD_STAFF: "ทีมสนาม",
}

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useTournament()
  if (!user) return null

  const groups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => hasRole(user, ...item.roles)) }))
    .filter((group) => group.items.length > 0)

  return (
    <>
      {/* Backdrop — mobile only, closes the drawer on tap */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen bg-card border-r border-border flex flex-col transition-transform duration-200 ease-out
        md:static md:z-auto md:w-60 md:translate-x-0 md:flex-shrink-0
        ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight">NSRU E-Sport</p>
            <p className="text-xs text-muted-foreground leading-tight">Admin Panel</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดเมนู"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto">
          {groups.map((group, i) => (
            <div key={group.label ?? `group-${i}`} className="flex flex-col gap-0.5">
              {group.label && (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose}>
                  {({ isActive }) => (
                    <motion.span
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15 }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                        isActive
                          ? "bg-brand text-brand-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
                    </motion.span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer — user + links */}
        <div className="px-3 pb-4 border-t border-border pt-3">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-semibold text-foreground leading-tight">{user.username}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
          </div>
          <Link to="/" target="_blank" onClick={onClose}>
            <motion.span
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowUpRight className="w-4 h-4 flex-shrink-0" />
              ดูเว็บไซต์สาธารณะ
            </motion.span>
          </Link>
          <button type="button" onClick={() => { onClose(); void logout() }} className="w-full text-left">
            <motion.span
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-lose hover:bg-lose/10 transition-colors"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              ออกจากระบบ
            </motion.span>
          </button>
        </div>
      </aside>
    </>
  )
}
