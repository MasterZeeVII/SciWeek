import { motion } from "motion/react"

import { cn } from "@/lib/utils"

function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  layoutId,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  layoutId: string
  className?: string
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 bg-muted rounded-lg p-1", className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 bg-card border border-border rounded-md shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
