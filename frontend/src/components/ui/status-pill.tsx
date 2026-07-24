import * as React from "react"

import { cn } from "@/lib/utils"

type PillVariant = "neutral" | "brand" | "win" | "lose" | "live" | "attention" | "gold"

const variantClasses: Record<PillVariant, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  brand: "bg-primary/10 text-primary border-primary/20",
  win: "bg-success/10 text-success border-success/20",
  lose: "bg-destructive/10 text-destructive border-destructive/20",
  live: "bg-destructive/10 text-destructive border-destructive/20 animate-pulse",
  attention: "bg-attention/10 text-attention border-attention/20",
  gold: "bg-yellow-50 text-yellow-700 border-yellow-200",
}

function StatusPill({
  className,
  variant = "neutral",
  icon,
  children,
  ...props
}: React.ComponentProps<"span"> & { variant?: PillVariant; icon?: React.ReactNode }) {
  return (
    <span
      data-slot="status-pill"
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  )
}

export { StatusPill }
export type { PillVariant }
