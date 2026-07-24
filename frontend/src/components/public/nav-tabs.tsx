import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown } from "lucide-react"
import type { Stage } from "@/lib/public-api"

export type TabId = "overview" | "stage-1" | "stage-2" | "matches" | "participants"

type Props = {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  stages?: Stage[]
}

export function NavTabs({ activeTab, onTabChange, stages = [] }: Props) {
  const [stagesOpen, setStagesOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const stagesBtnRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)

  const isStageActive = activeTab === "stage-1" || activeTab === "stage-2"

  // Calculate dropdown position relative to the viewport each time it opens
  useEffect(() => {
    if (!stagesOpen || !stagesBtnRef.current || !navRef.current) return
    const btnRect = stagesBtnRef.current.getBoundingClientRect()
    const navRect = navRef.current.getBoundingClientRect()
    setDropdownStyle({
      left: btnRect.left - navRect.left,
      top: btnRect.bottom - navRect.top,
    })
  }, [stagesOpen])

  // Close on outside click
  useEffect(() => {
    if (!stagesOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (stagesBtnRef.current && stagesBtnRef.current.contains(e.target as Node)) return
      setStagesOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [stagesOpen])

  const tabClass = (active: boolean) =>
    [
      "relative px-4 py-3 text-sm font-semibold transition-colors cursor-pointer select-none whitespace-nowrap",
      "border-b-2",
      active
        ? "text-brand border-brand"
        : "text-muted-foreground hover:text-foreground border-transparent",
    ].join(" ")

  return (
    // position:relative on the nav so the dropdown is positioned against it, NOT clipped
    <nav ref={navRef} className="bg-card border-b border-border sticky top-0 z-20 shadow-sm" style={{ position: "relative" }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {/* Overview */}
        <button
          type="button"
          className={tabClass(activeTab === "overview")}
          onClick={() => onTabChange("overview")}
        >
          ภาพรวม
        </button>

        {/* Stages dropdown trigger — only show if tournament has stages */}
        {stages.length > 0 && (
          <button
            ref={stagesBtnRef}
            type="button"
            className={`${tabClass(isStageActive)} flex items-center gap-1`}
            onClick={() => setStagesOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={stagesOpen}
          >
            สายการแข่งขัน
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${stagesOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}

        {/* Matches */}
        <button
          type="button"
          className={tabClass(activeTab === "matches")}
          onClick={() => onTabChange("matches")}
        >
          ผลการแข่งขัน
        </button>

        {/* Participants */}
        <button
          type="button"
          className={tabClass(activeTab === "participants")}
          onClick={() => onTabChange("participants")}
        >
          ผู้เข้าร่วม
        </button>
      </div>

      {/* Dropdown — rendered inside nav (relative) but outside the overflow-x-auto div */}
      <AnimatePresence>
        {stagesOpen && stages.length > 0 && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute w-52 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50"
            style={{ left: dropdownStyle.left, top: dropdownStyle.top + 4 }}
          >
            {stages.map((stage, i) => {
              const tabId: TabId = i === 0 ? "stage-1" : "stage-2"
              const isActive = activeTab === tabId
              return (
                <button
                  key={stage.id}
                  role="option"
                  aria-selected={isActive}
                  type="button"
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2
                    ${isActive ? "bg-accent text-brand" : "text-foreground hover:bg-muted"}`}
                  onClick={() => { onTabChange(tabId); setStagesOpen(false) }}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${isActive ? "bg-brand text-white" : "bg-muted text-muted-foreground"}`}>
                    {stage.id}
                  </span>
                  สาย {stage.id} — {stage.name}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
