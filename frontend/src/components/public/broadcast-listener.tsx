import { useEffect, useRef, useState } from "react"

import { fetchLatestBroadcast } from "@/lib/public-api"
import { MatchResultBroadcast, type BroadcastGameResult } from "./match-result-broadcast"

// Deliberately unscoped — an admin's /notify push isn't tied to any
// tournament id or Live status (see service/broadcast.py), and neither is
// this: it polls from wherever it's mounted (see PublicLayout) so a push
// shows up on every public page, not just the one tournament a spectator
// happens to have open. Minecraft /title-style "broadcast to whoever's
// there," not "attached to a specific match."
// Cheap in-memory read, no auth/DB hit (see service/broadcast.py) — polling
// this fast is fine even with many spectator tabs open.
const POLL_MS = 1_500

export function BroadcastListener() {
  const [queue, setQueue] = useState<BroadcastGameResult[]>([])
  // Baseline, not history: the first poll after mount only records the
  // current id — it never replays something pushed before this tab opened.
  const lastIdRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const tick = async () => {
      if (!cancelled && document.visibilityState === "visible") {
        try {
          const broadcast = await fetchLatestBroadcast()
          if (!cancelled && broadcast && broadcast.id !== lastIdRef.current) {
            if (lastIdRef.current !== null) {
              setQueue((q) => [...q, broadcast.payload])
            }
            lastIdRef.current = broadcast.id
          }
        } catch {
          // Best-effort background poll — a hiccup here shouldn't be visible.
        }
      }
      if (!cancelled) timer = window.setTimeout(tick, POLL_MS)
    }

    timer = window.setTimeout(tick, 0)
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  const active = queue[0] ?? null

  // Auto-hide + exit-fade timing live inside MatchResultBroadcast itself;
  // this only advances the queue once that fade-out has actually finished.
  const dismiss = () => setQueue((q) => q.slice(1))

  if (!active) return null
  return <MatchResultBroadcast key={active.key} result={active} onClose={dismiss} />
}
