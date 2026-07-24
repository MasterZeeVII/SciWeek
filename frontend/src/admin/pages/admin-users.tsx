import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Lock, Pencil, Plus, Trash2, User, UserCog, X } from "lucide-react"

import { useTournament } from "@/lib/tournament-context"
import { usersApi, type AdminUser } from "@/lib/users-api"
import { ROLE_LABEL, type Role } from "../admin-sidebar"

const ROLE_OPTIONS = Object.entries(ROLE_LABEL) as [Role, string][]

function roleChipClass(role: Role) {
  if (role === "ADMIN") return "bg-brand/10 text-brand border-brand/20"
  if (role === "MONITOR") return "bg-attention/10 text-attention border-attention/20"
  return "bg-muted text-muted-foreground border-border"
}

const inputClass =
  "w-full px-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"

export function AdminUsers() {
  const { user: currentUser } = useTournament()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("FIELD_STAFF")
  const [isActive, setIsActive] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    usersApi
      .list()
      .then((list) => {
        if (!cancelled) setUsers(list)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "โหลดรายชื่อผู้ใช้งานไม่สำเร็จ")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openCreate = () => {
    setEditing(null)
    setUsername("")
    setPassword("")
    setRole("FIELD_STAFF")
    setIsActive(true)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (target: AdminUser) => {
    setEditing(target)
    setUsername(target.username)
    setPassword("")
    setRole(target.role)
    setIsActive(target.isActive)
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleSubmit = async () => {
    if (busy) return
    setFormError(null)
    setBusy(true)
    try {
      if (editing) {
        const updated = await usersApi.update(editing.id, {
          role,
          isActive,
          password: password.trim() || undefined,
        })
        setUsers(updated)
      } else {
        const updated = await usersApi.create({ username: username.trim(), password, role })
        setUsers(updated)
      }
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (target: AdminUser) => {
    if (!window.confirm(`ลบผู้ใช้งาน "${target.username}"?`)) return
    setLoadError(null)
    try {
      const updated = await usersApi.remove(target.id)
      setUsers(updated)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "ลบผู้ใช้งานไม่สำเร็จ")
    }
  }

  const isSelf = (target: AdminUser) => currentUser?.id === target.id
  const canSubmit = editing
    ? !password || password.trim().length >= 6
    : username.trim().length > 0 && password.length >= 6

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-start justify-between gap-3 mb-6 flex-wrap"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">ผู้ใช้งาน</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            จัดการบัญชีเจ้าหน้าที่และสิทธิ์การเข้าถึง — เฉพาะผู้ดูแลระบบเท่านั้น
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand text-brand-foreground text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          เพิ่มผู้ใช้งานใหม่
        </button>
      </motion.div>

      {loadError && (
        <div className="mb-5 rounded-lg border border-lose/40 bg-lose/10 px-4 py-3 text-sm text-lose">
          {loadError}
        </div>
      )}

      {/* Users table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>ชื่อผู้ใช้</span>
          <span>สิทธิ์</span>
          <span>สถานะ</span>
          <span className="text-right">จัดการ</span>
        </div>
        {users === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <UserCog className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">ยังไม่มีผู้ใช้งาน</p>
          </div>
        ) : (
          users.map((target, i) => (
            <motion.div
              key={target.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(i * 0.02, 0.25) }}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <span className="text-sm font-medium text-foreground truncate">
                {target.username}
                {isSelf(target) && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(คุณ)</span>
                )}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${roleChipClass(target.role)}`}
              >
                {ROLE_LABEL[target.role]}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${
                  target.isActive
                    ? "bg-win/10 text-win border-win/30"
                    : "bg-lose/10 text-lose border-lose/30"
                }`}
              >
                {target.isActive ? "ใช้งานอยู่" : "ปิดใช้งาน"}
              </span>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(target)}
                  className="p-2 text-muted-foreground hover:text-brand rounded-lg hover:bg-muted transition-colors"
                  aria-label="แก้ไข"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(target)}
                  disabled={isSelf(target)}
                  title={isSelf(target) ? "ลบบัญชีของตัวเองไม่ได้" : undefined}
                  className="p-2 text-muted-foreground hover:text-lose rounded-lg hover:bg-lose/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="ลบ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* ── New/Edit user modal ─────────────────────────────────────── */}
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
              className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="px-6 pt-5 pb-4 border-b border-border flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">ผู้ใช้งาน /</p>
                  <h2 className="text-xl font-bold text-foreground">
                    {editing ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
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

              {/* Form body */}
              <div className="px-6 py-6 flex flex-col gap-4">
                {formError && (
                  <div className="rounded-lg border border-lose/40 bg-lose/10 px-3 py-2.5 text-sm text-lose">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    ชื่อผู้ใช้
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={!!editing}
                      autoComplete="off"
                      className={`${inputClass} pl-9 disabled:opacity-60 disabled:cursor-not-allowed`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {editing ? "รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)" : "รหัสผ่าน"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder={editing ? "เว้นว่างไว้ถ้าไม่เปลี่ยน" : "อย่างน้อย 6 ตัวอักษร"}
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    สิทธิ์การใช้งาน
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    disabled={!!editing && isSelf(editing)}
                    className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {editing && (
                  <label className="flex items-center gap-2.5 text-sm font-medium text-foreground select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      disabled={isSelf(editing)}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-border accent-brand disabled:opacity-60"
                    />
                    เปิดใช้งานบัญชีนี้
                  </label>
                )}
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
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
                  disabled={!canSubmit || busy}
                  className="bg-win text-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {busy ? "กำลังบันทึก..." : editing ? "บันทึก" : "สร้างผู้ใช้งาน"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
