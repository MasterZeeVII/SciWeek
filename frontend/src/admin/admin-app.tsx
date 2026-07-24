import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Menu } from "lucide-react"

import { useTournament } from "@/lib/tournament-context"
import { AdminLogin } from "./admin-login"
import { AdminSidebar } from "./admin-sidebar"

export function AdminApp() {
  const { user, loading } = useTournament()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        กำลังโหลด...
      </div>
    )
  }

  if (!user) {
    return <AdminLogin />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar — sidebar becomes an off-canvas drawer below md */}
        <header className="md:hidden flex items-center gap-3 border-b border-border bg-card px-4 py-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="เปิดเมนู"
            className="p-1.5 -ml-1.5 rounded-lg text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-foreground">NSRU E-Sport</span>
        </header>
        <main className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
