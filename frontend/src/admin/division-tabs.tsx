import { LEVEL_LABEL } from "@/lib/public-api"
import { useTournament } from "@/lib/tournament-context"

/** Switch between the active tournament's divisions (ม.ต้น / ม.ปลาย). */
export function DivisionTabs() {
  const { tournament, selectedDivisionId, selectDivision } = useTournament()
  const divisions = tournament?.divisions ?? []
  if (divisions.length < 2) return null

  return (
    <div className="inline-flex gap-1 bg-muted rounded-lg p-1">
      {divisions.map((division) => {
        const isActive = division.id === selectedDivisionId
        const label = LEVEL_LABEL[division.level] ?? division.levelLabel
        return (
          <button
            key={division.id}
            type="button"
            onClick={() => void selectDivision(division.id)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
              isActive
                ? "bg-card text-brand shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {division.teamCount}
            </span>
          </button>
        )
      })}
    </div>
  )
}
