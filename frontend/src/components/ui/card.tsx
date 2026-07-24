import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("bg-card border border-border rounded-lg overflow-hidden", className)}
      {...props}
    />
  )
}

function CardHeader({
  className,
  icon,
  title,
  action,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ReactNode
  title?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex items-center justify-between gap-3 px-5 py-4 border-b border-border",
        className,
      )}
      {...props}
    >
      {(icon || title) && (
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
          {icon}
          {title}
        </h2>
      )}
      {action}
    </div>
  )
}

function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-body" className={cn("p-5", className)} {...props} />
}

export { Card, CardHeader, CardBody }
