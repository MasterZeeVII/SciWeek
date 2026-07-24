import { motion } from "motion/react"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  accent?: "brand" | "green" | "orange" | "red"
  delay?: number
}

const accentMap = {
  brand: "bg-primary/10 text-primary",
  green: "bg-success/10 text-success",
  orange: "bg-attention/10 text-attention",
  red: "bg-destructive/10 text-destructive",
}

export function StatCard({ label, value, sub, icon: Icon, accent = "brand", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="bg-card border border-border rounded-lg p-5 flex items-start gap-4"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accentMap[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </motion.div>
  )
}
