"use client"

import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react"
import { Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Team, Match } from "@/lib/tournament-types"
import { RollingNumber } from "@/components/ui/rolling-number"

// ── Pure helpers — shared by the admin canvas and the public bracket tab ──

export function getWinner(match: Match): Team | null {
  if (!match.team1 || !match.team2) return null
  const winsNeeded = Math.ceil(match.bestOf / 2)
  let t1Wins = 0, t2Wins = 0
  for (const game of match.games) {
    if (game.winner === "team1") t1Wins++
    if (game.winner === "team2") t2Wins++
  }
  if (t1Wins >= winsNeeded) return match.team1
  if (t2Wins >= winsNeeded) return match.team2
  return null
}

export function getSeriesScore(match: Match): [number, number] {
  let t1 = 0, t2 = 0
  for (const game of match.games) {
    if (game.winner === "team1") t1++
    if (game.winner === "team2") t2++
  }
  return [t1, t2]
}

// DFS to find team's path through tournament
function findTeamPath(matches: Match[], teamId: string): Set<string> {
  const path = new Set<string>()
  for (const match of matches) {
    if (match.team1?.id === teamId || match.team2?.id === teamId) {
      path.add(match.id)
    }
  }
  return path
}

// Card geometry — shared by the absolutely-positioned match cards and the
// SVG connector layer so both agree on where a match actually sits.
const HEADER_HEIGHT = 28
const TEAM_ROW_HEIGHT = 32
const MATCH_WIDTH = 192
const MATCH_HEIGHT = HEADER_HEIGHT + TEAM_ROW_HEIGHT * 2
const THIRD_PLACE_OFFSET = 180

type RoundConfig = Record<number, { x: number; gapY: number; startY: number }>

// Generate round config based on bracket size - tighter spacing
function generateRoundConfig(totalRounds: number): RoundConfig {
  const config: RoundConfig = {}

  for (let round = 1; round <= totalRounds; round++) {
    const baseGap = 110 // Vertical gap between matches
    const gapMultiplier = Math.pow(2, round - 1)

    config[round] = {
      x: 40 + (round - 1) * 240, // Tighter horizontal spacing
      gapY: baseGap * gapMultiplier,
      startY: 50 + (gapMultiplier - 1) * baseGap / 2,
    }
  }

  return config
}

// A second match in the final round is the third-place decider
export function isThirdPlaceMatch(match: Match, totalRounds: number): boolean {
  return match.round === totalRounds && match.position > 0
}

// Single source of truth for a match card's top edge. The third-place card
// sits just below the final instead of a full bracket gap away.
function matchTop(match: Match, roundConfig: RoundConfig, totalRounds: number): number | null {
  const config = roundConfig[match.round]
  if (!config) return null
  return isThirdPlaceMatch(match, totalRounds)
    ? config.startY + THIRD_PLACE_OFFSET
    : config.startY + match.position * config.gapY
}

// The final is match 1 of the last round; skip the third-place decider that
// shares that round.
function findFinalMatch(matches: Match[], totalRounds: number): Match | undefined {
  return matches.find(m => m.round === totalRounds && !isThirdPlaceMatch(m, totalRounds))
}

export interface BracketLabels {
  subtitle: (teamCount: number) => string
  dragHint: string
  trackTeam: string
  champion: string
  roundName: (round: number, totalRounds: number) => string
  thirdPlace: string
}

export const DEFAULT_BRACKET_LABELS: BracketLabels = {
  subtitle: (teamCount) => `${teamCount} Teams - Single Elimination`,
  dragHint: "Drag to pan",
  trackTeam: "Track Team",
  champion: "Champion",
  roundName: (round, totalRounds) => {
    if (totalRounds && round === totalRounds) return "Final"
    if (totalRounds && round === totalRounds - 1) return "Semifinal"
    return `Round ${round}`
  },
  thirdPlace: "3rd Place",
}

function getMatchRoundName(match: Match, totalRounds: number, labels: BracketLabels): string {
  if (isThirdPlaceMatch(match, totalRounds)) return labels.thirdPlace
  return labels.roundName(match.round, totalRounds)
}

// Match card component
function MatchCard({
  match,
  roundName,
  isHighlighted,
  isSelected,
  hoveredTeamId,
  onClick,
  onTeamHover,
}: {
  match: Match
  roundName: string
  isHighlighted: boolean
  isSelected: boolean
  hoveredTeamId: string | null
  onClick: () => void
  onTeamHover: (teamId: string | null) => void
}) {
  const winner = getWinner(match)
  const [s1, s2] = getSeriesScore(match)

  const isTeam1Hovered = hoveredTeamId === match.team1?.id
  const isTeam2Hovered = hoveredTeamId === match.team2?.id

  return (
    <div
      className={cn(
        "w-48 rounded-sm border bg-card text-left shadow-sm transition-all duration-200",
        isSelected && "border-primary ring-2 ring-primary/30",
        isHighlighted && !isSelected && "border-primary/60",
        !isHighlighted && !isSelected && "border-border hover:border-muted-foreground"
      )}
    >
      {/* Header */}
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between border-b border-border bg-muted px-3 py-1 hover:bg-secondary"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {roundName}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">BO{match.bestOf}</span>
      </button>

      {/* Team 1 */}
      <div
        className={cn(
          "flex cursor-pointer items-center justify-between border-b border-border/70 py-1.5 pl-3 pr-1.5 transition-colors",
          isTeam1Hovered && "bg-primary/10"
        )}
        onMouseEnter={() => match.team1 && onTeamHover(match.team1.id)}
        onMouseLeave={() => onTeamHover(null)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
            {match.team1?.seed || "-"}
          </span>
          <span
            className={cn(
              "truncate text-sm",
              winner?.id === match.team1?.id ? "font-semibold text-foreground" : "text-secondary-foreground",
              winner && winner.id !== match.team1?.id && "text-muted-foreground",
              isTeam1Hovered && "text-primary"
            )}
          >
            {match.team1?.name || "TBD"}
          </span>
        </div>
        <span
          className={cn(
            "ml-2 flex h-6 w-7 shrink-0 items-center justify-center rounded-sm text-sm font-bold",
            winner?.id === match.team1?.id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          <RollingNumber value={s1} />
        </span>
      </div>

      {/* Team 2 */}
      <div
        className={cn(
          "flex cursor-pointer items-center justify-between py-1.5 pl-3 pr-1.5 transition-colors",
          isTeam2Hovered && "bg-primary/10"
        )}
        onMouseEnter={() => match.team2 && onTeamHover(match.team2.id)}
        onMouseLeave={() => onTeamHover(null)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
            {match.team2?.seed || "-"}
          </span>
          <span
            className={cn(
              "truncate text-sm",
              winner?.id === match.team2?.id ? "font-semibold text-foreground" : "text-secondary-foreground",
              winner && winner.id !== match.team2?.id && "text-muted-foreground",
              isTeam2Hovered && "text-primary"
            )}
          >
            {match.team2?.name || "TBD"}
          </span>
        </div>
        <span
          className={cn(
            "ml-2 flex h-6 w-7 shrink-0 items-center justify-center rounded-sm text-sm font-bold",
            winner?.id === match.team2?.id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          <RollingNumber value={s2} />
        </span>
      </div>
    </div>
  )
}

// SVG bracket lines - dynamic based on rounds
function BracketLines({
  matches,
  highlightedPath,
  totalRounds,
}: {
  matches: Match[]
  highlightedPath: Set<string>
  totalRounds: number
}) {
  const roundConfig = generateRoundConfig(totalRounds)

  function getWinnerYOffset(match: Match): number {
    return getTeamSlotY(match, getWinner(match))
  }

  function getTeamSlotY(match: Match, team: Team | null): number {
    if (!team) return HEADER_HEIGHT + TEAM_ROW_HEIGHT
    if (team.id === match.team1?.id) {
      return HEADER_HEIGHT + TEAM_ROW_HEIGHT / 2
    } else {
      return HEADER_HEIGHT + TEAM_ROW_HEIGHT + TEAM_ROW_HEIGHT / 2
    }
  }

  const paths: { d: string; highlighted: boolean }[] = []
  const nodes: { cx: number; cy: number; highlighted: boolean }[] = []

  // Connectors follow the real match graph (match -> the match its winner
  // advances into), never `position` arithmetic. A clean power-of-two
  // bracket happens to make match n feed match ceil(n/2), but brackets with
  // byes do not: 2021 Junior had 9 teams, so round 1 held a single match
  // whose winner joined round 2 match 4 while the other seven teams entered
  // round 2 with no round-1 predecessor at all. Bye-advanced matches simply
  // get no incoming line, which is the structurally correct picture.
  const matchById = new Map(matches.map(match => [match.id, match]))

  const edges: { from: Match; to: Match }[] = []
  for (const match of matches) {
    if (!match.nextMatchId) continue
    const next = matchById.get(match.nextMatchId)
    // Guard against a dangling / backwards pointer rather than drawing a
    // line that loops back across the canvas.
    if (!next || next.round <= match.round) continue
    edges.push({ from: match, to: next })
  }

  // Back-compat: a payload from a backend that predates nextMatchId carries
  // no topology at all. Fall back to the old halving assumption so such a
  // bracket still renders lines (it can only be a power-of-two bracket —
  // that is all generate_bracket() ever produced).
  if (edges.length === 0 && totalRounds > 1) {
    for (let round = 1; round < totalRounds; round++) {
      const current = matches.filter(m => m.round === round)
      const next = matches.filter(m => m.round === round + 1)
      current.forEach((match, i) => {
        const target = next[Math.floor(i / 2)]
        if (target) edges.push({ from: match, to: target })
      })
    }
  }

  for (const { from, to } of edges) {
    const config = roundConfig[from.round]
    const nextConfig = roundConfig[to.round]
    const fromTop = matchTop(from, roundConfig, totalRounds)
    const toTop = matchTop(to, roundConfig, totalRounds)
    if (!config || !nextConfig || fromTop === null || toTop === null) continue

    const winner = getWinner(from)
    const isHighlighted = highlightedPath.has(from.id) && highlightedPath.has(to.id)

    const x1 = config.x + MATCH_WIDTH
    const y1 = fromTop + getWinnerYOffset(from)

    const x2 = nextConfig.x
    const y2 = toTop + getTeamSlotY(to, winner)

    // 8px shy of the next card; identical to the old x1 + 40 for adjacent
    // rounds, still sane if a pointer ever skips a round.
    const midX = x2 - 8

    paths.push({
      d: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`,
      highlighted: isHighlighted,
    })

    nodes.push({ cx: midX, cy: y1, highlighted: isHighlighted })
  }

  // Final winner node
  const finalMatch = findFinalMatch(matches, totalRounds)
  if (finalMatch) {
    const champion = getWinner(finalMatch)
    const config = roundConfig[totalRounds]
    const finalTop = matchTop(finalMatch, roundConfig, totalRounds)
    if (champion && config && finalTop !== null) {
      const x1 = config.x + MATCH_WIDTH
      const y1 = finalTop + getWinnerYOffset(finalMatch)
      nodes.push({
        cx: x1 + 20,
        cy: y1,
        highlighted: highlightedPath.has(finalMatch.id),
      })
    }
  }

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {paths.map((path, i) => (
        <path
          key={i}
          d={path.d}
          fill="none"
          stroke={path.highlighted ? "var(--primary)" : "var(--border)"}
          strokeWidth={path.highlighted ? 3 : 2}
        />
      ))}

      {nodes.map((node, i) => (
        <circle
          key={i}
          cx={node.cx}
          cy={node.cy}
          r={node.highlighted ? 6 : 5}
          fill={node.highlighted ? "var(--primary)" : "var(--card)"}
          stroke={node.highlighted ? "var(--primary)" : "var(--border)"}
          strokeWidth={2}
        />
      ))}
    </svg>
  )
}

export interface BracketCanvasProps {
  tournamentName: string
  matches: Match[]
  teams: Team[]
  selectedMatchId: string | null
  onSelectMatch: (matchId: string | null) => void
  renderDetail?: (match: Match, roundName: string) => ReactNode
  labels?: Partial<BracketLabels>
}

export function BracketCanvas({
  tournamentName,
  matches,
  teams,
  selectedMatchId,
  onSelectMatch,
  renderDetail,
  labels: labelOverrides,
}: BracketCanvasProps) {
  const labels: BracketLabels = { ...DEFAULT_BRACKET_LABELS, ...labelOverrides }
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [highlightedPath, setHighlightedPath] = useState<Set<string>>(new Set())
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null)
  const [hoverPath, setHoverPath] = useState<Set<string>>(new Set())

  // Pan + zoom live in one state object so a zoom step can re-anchor the
  // pan in the same update (keeps the point under the cursor/fingers
  // fixed while scaling). y starts at 80 to clear the sticky header —
  // this used to be a marginTop, folded in so the zoom math stays simple.
  const HOME_VIEW = { x: 0, y: 80, zoom: 1 }
  const MIN_ZOOM = 0.4
  const MAX_ZOOM = 2.5
  const containerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [view, setView] = useState(HOME_VIEW)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null)
  const pinchRef = useRef<{
    dist: number
    mid: { x: number; y: number }
    view: { x: number; y: number; zoom: number }
  } | null>(null)

  const clampZoom = (zoom: number) => Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM)

  // New pan such that the content point currently under (cx, cy) —
  // container coordinates — stays put at the new zoom level.
  const zoomAt = useCallback(
    (
      current: { x: number; y: number; zoom: number },
      cx: number,
      cy: number,
      nextZoom: number,
    ) => {
      const ratio = nextZoom / current.zoom
      return {
        x: cx - ratio * (cx - current.x),
        y: cy - ratio * (cy - current.y),
        zoom: nextZoom,
      }
    },
    [],
  )

  // Zoom buttons scale around the middle of the viewport.
  const zoomBy = useCallback(
    (factor: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      setView((current) => {
        const next = clampZoom(current.zoom * factor)
        if (!rect) return { ...current, zoom: next }
        return zoomAt(current, rect.width / 2, rect.height / 2, next)
      })
    },
    [zoomAt],
  )

  const totalRounds = useMemo(() => {
    if (matches.length === 0) return 0
    return Math.max(...matches.map(m => m.round))
  }, [matches])

  const roundConfig = useMemo(() => generateRoundConfig(totalRounds), [totalRounds])

  // Calculate canvas size based on bracket
  const canvasWidth = useMemo(() => {
    if (totalRounds === 0) return 600
    return 60 + totalRounds * 280 + 150
  }, [totalRounds])

  // Derived from where the cards actually land, not from the round-1 match
  // count: a bye bracket's widest round is not round 1, and an undersized
  // canvas clips the SVG connector layer (svg overflow is hidden) so lines
  // below the fold vanish.
  const canvasHeight = useMemo(() => {
    let bottom = 0
    for (const match of matches) {
      const top = matchTop(match, roundConfig, totalRounds)
      if (top !== null) bottom = Math.max(bottom, top + MATCH_HEIGHT)
    }
    return Math.max(400, bottom + 100)
  }, [matches, roundConfig, totalRounds])

  const handleTeamSelect = (teamId: string) => {
    if (selectedTeam === teamId) {
      setSelectedTeam(null)
      setHighlightedPath(new Set())
    } else {
      setSelectedTeam(teamId)
      setHighlightedPath(findTeamPath(matches, teamId))
    }
  }

  const handleTeamHover = useCallback((teamId: string | null) => {
    if (teamId) {
      setHoveredTeam(teamId)
      setHoverPath(findTeamPath(matches, teamId))
    } else {
      setHoveredTeam(null)
      setHoverPath(new Set())
    }
  }, [matches])

  const activePath = hoveredTeam ? hoverPath : highlightedPath

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - view.x, y: e.clientY - view.y })
    }
    if (e.button === 0 && (e.target as HTMLElement).closest("[data-canvas]")) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - view.x, y: e.clientY - view.y })
    }
  }, [view.x, view.y])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setView((current) => ({
        ...current,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }))
    }
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Touch handlers — one finger pans, two fingers pinch-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setIsPanning(false)
      pinchRef.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        mid: {
          x: (a.clientX + b.clientX) / 2 - rect.left,
          y: (a.clientY + b.clientY) / 2 - rect.top,
        },
        view,
      }
      return
    }
    if (e.touches.length === 1 && !pinchRef.current) {
      const touch = e.touches[0]
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY }
      setIsPanning(true)
      setPanStart({ x: touch.clientX - view.x, y: touch.clientY - view.y })
    }
  }, [view])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const start = pinchRef.current
      const [a, b] = [e.touches[0], e.touches[1]]
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const mid = {
        x: (a.clientX + b.clientX) / 2 - rect.left,
        y: (a.clientY + b.clientY) / 2 - rect.top,
      }
      const nextZoom = clampZoom(start.view.zoom * (dist / start.dist))
      const ratio = nextZoom / start.view.zoom
      // Anchor the content point that was under the initial midpoint to
      // the current midpoint — pinch and drag in one gesture.
      setView({
        x: mid.x - ratio * (start.mid.x - start.view.x),
        y: mid.y - ratio * (start.mid.y - start.view.y),
        zoom: nextZoom,
      })
      return
    }
    if (isPanning && e.touches.length === 1) {
      const touch = e.touches[0]
      setView((current) => ({
        ...current,
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y,
      }))
    }
  }, [isPanning, panStart])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
    setIsPanning(false)
    lastTouchRef.current = null
  }, [])

  // Wheel zoom around the cursor. Attached manually because React can't
  // guarantee a non-passive wheel listener, and preventDefault must work
  // or the page scrolls instead of zooming.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      setView((current) => {
        const next = clampZoom(current.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12))
        return zoomAt(current, cx, cy, next)
      })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [zoomAt])

  // Fullscreen — the projector/monitor "verify wall" mode.
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void rootRef.current?.requestFullscreen()
    }
  }, [])

  useEffect(() => {
    const prevent = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }
    window.addEventListener("auxclick", prevent)
    window.addEventListener("mousedown", (e) => {
      if (e.button === 1) e.preventDefault()
    })
    return () => {
      window.removeEventListener("auxclick", prevent)
    }
  }, [])

  const selectedMatch = selectedMatchId ? matches.find(m => m.id === selectedMatchId) ?? null : null

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-background">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-10 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="hidden h-9 w-9 items-center justify-center rounded bg-primary sm:flex">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 3h14v2h2v5c0 1.66-1.34 3-3 3h-.35a6.01 6.01 0 0 1-3.65 3.65V19h3v2H7v-2h3v-2.35A6.01 6.01 0 0 1 6.35 13H6c-1.66 0-3-1.34-3-3V5h2V3zm14 4v4c.55 0 1-.45 1-1V7h-1zM5 7H4v3c0 .55.45 1 1 1V7z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-base font-semibold text-foreground sm:text-lg">{tournamentName}</h1>
              <p className="text-[10px] text-muted-foreground sm:text-xs">{labels.subtitle(teams.length)}</p>
            </div>
          </div>
          <div className="hidden rounded border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground sm:block">
            {labels.dragHint}
          </div>
        </div>
      </header>

      {/* Team selector - desktop */}
      <div className="absolute right-6 top-20 z-10 hidden max-h-[calc(100vh-120px)] flex-col gap-1.5 overflow-y-auto sm:flex">
        <span className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {labels.trackTeam}
        </span>
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => handleTeamSelect(team.id)}
            className={cn(
              "rounded-sm border px-3 py-1.5 text-left text-xs font-medium shadow-sm transition-all",
              selectedTeam === team.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-secondary-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            <span className="mr-2 text-[10px] text-muted-foreground">#{team.seed}</span>
            {team.name}
          </button>
        ))}
      </div>

      {/* Team selector - mobile */}
      <div className="absolute inset-x-0 top-16 z-10 flex gap-2 overflow-x-auto px-4 py-2 sm:hidden">
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => handleTeamSelect(team.id)}
            className={cn(
              "shrink-0 rounded-sm border px-2.5 py-1 text-xs font-medium transition-all",
              selectedTeam === team.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-secondary-foreground"
            )}
          >
            {team.name}
          </button>
        ))}
      </div>

      {/* Pannable canvas */}
      <div
        ref={containerRef}
        data-canvas
        className={cn("h-full w-full touch-none", isPanning ? "cursor-grabbing" : "cursor-grab")}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Bracket lines */}
          <BracketLines matches={matches} highlightedPath={activePath} totalRounds={totalRounds} />

          {/* Round labels */}
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
            <div
              key={round}
              className={cn(
                "absolute top-2 font-display text-xs font-semibold uppercase tracking-wider",
                round === totalRounds ? "text-primary" : "text-muted-foreground"
              )}
              style={{ left: roundConfig[round]?.x || 0 }}
            >
              {labels.roundName(round, totalRounds)}
            </div>
          ))}

          {/* Match cards */}
          {matches.map((match) => {
            const config = roundConfig[match.round]
            const top = matchTop(match, roundConfig, totalRounds)
            if (!config || top === null) return null

            return (
              <div
                key={match.id}
                className="absolute"
                style={{
                  left: config.x,
                  top,
                }}
              >
                <MatchCard
                  match={match}
                  roundName={getMatchRoundName(match, totalRounds, labels)}
                  isHighlighted={activePath.has(match.id)}
                  isSelected={selectedMatchId === match.id}
                  hoveredTeamId={hoveredTeam}
                  onClick={() => onSelectMatch(selectedMatchId === match.id ? null : match.id)}
                  onTeamHover={handleTeamHover}
                />
              </div>
            )
          })}

          {/* Champion indicator */}
          {(() => {
            const finalMatch = findFinalMatch(matches, totalRounds)
            const champion = finalMatch ? getWinner(finalMatch) : null
            if (!finalMatch || !champion) return null
            const config = roundConfig[totalRounds]
            const finalTop = matchTop(finalMatch, roundConfig, totalRounds)
            if (!config || finalTop === null) return null

            return (
              <div
                className="absolute flex items-center gap-2"
                style={{
                  left: config.x + 200,
                  top: finalTop + 30,
                }}
              >
                <div className="h-0.5 w-8 bg-primary" />
                <div className="rounded-sm bg-primary px-3 py-1.5 text-primary-foreground shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/80">{labels.champion}</p>
                  <p className="font-display text-sm font-semibold">{champion.name}</p>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* View controls — zoom for reading a far corner, fullscreen for the
          verify monitors / projector */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.25)}
          aria-label="ซูมออก"
          title="ซูมออก"
          className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setView((current) => ({ ...current, zoom: 1 }))}
          title="กลับเป็น 100%"
          className="w-12 text-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {Math.round(view.zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.25)}
          aria-label="ซูมเข้า"
          title="ซูมเข้า"
          className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <button
          type="button"
          onClick={() => setView(HOME_VIEW)}
          aria-label="รีเซ็ตมุมมอง"
          title="รีเซ็ตมุมมอง"
          className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "ออกจากเต็มจอ" : "แสดงเต็มจอ"}
          title={isFullscreen ? "ออกจากเต็มจอ" : "แสดงเต็มจอ"}
          className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>

      {/* Detail overlay — admin injects an editable panel, public passes none */}
      {selectedMatch && renderDetail?.(selectedMatch, getMatchRoundName(selectedMatch, totalRounds, labels))}
    </div>
  )
}
