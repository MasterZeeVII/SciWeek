import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"

/** Odometer-style number: when the value changes (e.g. a background poll
 * brings a new score), the old value rolls up and out while the new one
 * rolls in from below — instead of snapping instantly. Renders as a plain
 * span when the value never changes, so it's safe to drop in anywhere a
 * score is shown. */
export function RollingNumber({
  value,
  className,
}: {
  value: number | string
  className?: string
}) {
  return (
    <span className={cn("relative inline-flex justify-center overflow-hidden", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(value)}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.9 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
