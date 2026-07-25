import { Link } from "react-router-dom"
import { Gamepad2, LogIn } from "lucide-react"
import { SITE } from "@/lib/site-config"

type Props = {
  /** Breadcrumb text shown after the brand mark, e.g. the current tournament's name. */
  crumb?: string
}

// Single source of truth for the public-site topbar so every page (/, /tournament/:id, ...)
// renders the exact same bar instead of each page hand-rolling its own header.
export function SiteTopbar({ crumb }: Props) {
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-8 py-3 gap-4">
        <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <Gamepad2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-brand">
              {SITE.seriesName}
            </p>
            <p className="text-sm font-bold text-foreground truncate group-hover:text-brand transition-colors">
              {SITE.game}
            </p>
          </div>
        </Link>

        {crumb && (
          <div className="hidden sm:flex items-center min-w-0 flex-1 text-sm text-muted-foreground truncate">
            <span className="mx-3 text-border">/</span>
            <span className="truncate font-medium text-foreground">{crumb}</span>
          </div>
        )}

        <Link
          to="/admin"
          className="flex items-center gap-1.5 flex-shrink-0 text-sm font-semibold text-muted-foreground hover:text-brand border border-border hover:border-brand/40 px-3.5 py-1.5 rounded-lg transition-colors"
        >
          <LogIn className="w-4 h-4" />
          <span className="hidden xs:inline">เข้าสู่ระบบ</span>
        </Link>
      </div>
    </header>
  )
}
