import { useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "motion/react"
import { ArrowLeft, Lock, User } from "lucide-react"

import { useTournament } from "@/lib/tournament-context"

export function AdminLogin() {
  const { login, error } = useTournament()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!username || !password || submitting) return
    setSubmitting(true)
    try {
      await login(username, password)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background font-sans flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-8 pb-6 text-center border-b border-border">
            <img
              src="/logo-scitec-icon.png"
              alt="SCITEC NSRU"
              className="mx-auto mb-4 w-14 h-14 object-contain"
            />
            <h1 className="text-xl font-bold text-foreground">NSRU E-Sport</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              เข้าสู่ระบบสำหรับเจ้าหน้าที่
            </p>
          </div>

          {/* Form */}
          <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-6 flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-lose/40 bg-lose/10 px-3 py-2.5 text-sm text-lose">
                {error}
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
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!username || !password || submitting}
              className="mt-1 w-full bg-brand text-brand-foreground text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>

        <Link
          to="/"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          กลับหน้าเว็บไซต์สาธารณะ
        </Link>
      </motion.div>
    </main>
  )
}
