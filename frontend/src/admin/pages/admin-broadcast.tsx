import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { Radio, Trash2 } from "lucide-react"

import { broadcastApi } from "@/lib/broadcast-api"
import type { AdminBroadcastRecord } from "@/lib/public-api"
import {
  buildChecklist,
  computeSuggestions,
  EMPTY_SUGGESTIONS,
  nearestMatch,
  REQUIRED_FIELDS,
  tokenizeWithRanges,
  COMMANDS,
  type SuggestionItem,
  type SuggestionState,
} from "./broadcast-console"

type LogKind = "input" | "output" | "error"
interface LogLine {
  id: number
  kind: LogKind
  text: string
}

const HELP_LINES = [
  "commands:",
  "  /notify team1=<name> team2=<name> winner=team1|team2 message=\"<text>\" [kills1=#] [kills2=#] [round=\"...\"] [stage=\"...\"] [bestof=#] [gamenumber=#] [thirdplace=true]",
  "      push a result reveal to everyone on the live public tournament page",
  "  /dismiss",
  "      cancel the currently pushed broadcast (stops it being replayed to new viewers)",
  "  /help",
  "      show this again",
  "  clear",
  "      clear this console's scrollback (local only)",
  "",
  "tab-completes commands/fields, arrow keys browse suggestions, esc dismisses them.",
]

const EXAMPLE_COMMAND =
  '/notify team1="Aurora Nine" team2="Blackwater" winner=team1 kills1=2 kills2=1 round="รอบรองชนะเลิศ" message="ผ่านเข้าสู่รอบชิงชนะเลิศ"'

let nextLineId = 1

export function AdminBroadcast() {
  const [log, setLog] = useState<LogLine[]>(() =>
    HELP_LINES.map((text) => ({ id: nextLineId++, kind: "output" as const, text })),
  )
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState<AdminBroadcastRecord | null>(null)
  const [suggestion, setSuggestion] = useState<SuggestionState>(EMPTY_SUGGESTIONS)
  const [checklist, setChecklist] = useState<{ field: string; present: boolean }[] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Cursor position to restore after an autocomplete splice — the <input>
  // is controlled, so setSelectionRange only sticks once React has
  // re-rendered with the new value (hence the effect below, not an inline call).
  const pendingCursorRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    broadcastApi.latest().then((record) => {
      if (!cancelled) setActive(record)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [log])

  useEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const pos = pendingCursorRef.current
      inputRef.current.setSelectionRange(pos, pos)
      pendingCursorRef.current = null
    }
  }, [input])

  const print = (kind: LogKind, text: string) => {
    setLog((lines) => [...lines, { id: nextLineId++, kind, text }])
  }

  const refreshAssist = (value: string, cursor: number) => {
    const tokens = tokenizeWithRanges(value)
    setChecklist(buildChecklist(tokens))
    setSuggestion(computeSuggestions(value, tokens, cursor))
  }

  const acceptSuggestion = (item: SuggestionItem) => {
    if (!suggestion.range) return
    const { start, end } = suggestion.range
    const nextValue = input.slice(0, start) + item.insert + input.slice(end)
    const nextCursor = start + (item.cursorAfter ?? item.insert.length)
    setInput(nextValue)
    refreshAssist(nextValue, nextCursor)
    pendingCursorRef.current = nextCursor
  }

  const validateNotify = (tokens: ReturnType<typeof tokenizeWithRanges>): string | null => {
    const fields = new Map<string, string>()
    for (const token of tokens.slice(1)) {
      const eq = token.text.indexOf("=")
      if (eq === -1) continue
      fields.set(token.text.slice(0, eq).toLowerCase(), token.text.slice(eq + 1))
    }
    const missing = REQUIRED_FIELDS.filter((f) => !fields.get(f))
    if (missing.length > 0) return `missing required field${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`
    const winner = fields.get("winner")
    if (winner !== "team1" && winner !== "team2") return `winner must be team1 or team2, got '${winner}'`
    return null
  }

  const runCommand = async (raw: string) => {
    const command = raw.trim()
    if (!command) return
    print("input", command)
    const tokens = tokenizeWithRanges(command)
    const head = (tokens[0]?.text ?? "").toLowerCase()

    if (head === "clear") {
      setLog([])
      return
    }
    if (head === "/help") {
      HELP_LINES.forEach((line) => print("output", line))
      return
    }
    if (head === "/dismiss") {
      setBusy(true)
      try {
        await broadcastApi.clear()
        setActive(null)
        print("output", "broadcast dismissed.")
      } catch (err) {
        print("error", err instanceof Error ? err.message : "dismiss failed.")
      } finally {
        setBusy(false)
      }
      return
    }
    if (head === "/notify") {
      const problem = validateNotify(tokens)
      if (problem) {
        print("error", problem)
        return
      }
      setBusy(true)
      try {
        const record = await broadcastApi.push(command)
        setActive(record)
        print(
          "output",
          `pushed #${record.id} — ${record.payload.team1} vs ${record.payload.team2} (winner: ${
            record.payload.winner === "team1" ? record.payload.team1 : record.payload.team2
          }). Live viewers pick it up within ~8s.`,
        )
      } catch (err) {
        print("error", err instanceof Error ? err.message : "push failed.")
      } finally {
        setBusy(false)
      }
      return
    }

    const nearest = nearestMatch(head, [...COMMANDS])
    print("error", nearest ? `unknown command '${head}' — did you mean ${nearest}?` : `unknown command. type /help.`)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const command = input
    setInput("")
    setSuggestion(EMPTY_SUGGESTIONS)
    setChecklist(null)
    void runCommand(command)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)
    refreshAssist(value, e.target.selectionStart ?? value.length)
  }

  const onInputSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    refreshAssist(el.value, el.selectionStart ?? el.value.length)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestion.items.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSuggestion((s) => ({ ...s, highlight: (s.highlight + 1) % s.items.length }))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSuggestion((s) => ({ ...s, highlight: (s.highlight - 1 + s.items.length) % s.items.length }))
    } else if (e.key === "Tab") {
      e.preventDefault()
      acceptSuggestion(suggestion.items[suggestion.highlight])
    } else if (e.key === "Escape") {
      e.preventDefault()
      setSuggestion(EMPTY_SUGGESTIONS)
    }
  }

  const handleDismissActive = async () => {
    setBusy(true)
    try {
      await broadcastApi.clear()
      setActive(null)
      print("output", "broadcast dismissed.")
    } catch (err) {
      print("error", err instanceof Error ? err.message : "dismiss failed.")
    } finally {
      setBusy(false)
    }
  }

  const lineClass: Record<LogKind, string> = {
    input: "text-[#f0c04a]",
    output: "text-[#8b91b3]",
    error: "text-[#e23e3e]",
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Radio className="w-5 h-5 text-brand" />
          ประกาศสด
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          พิมพ์คำสั่ง <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">/notify</code>{" "}
          เพื่อดันการ์ดผลการแข่งขันไปแสดงเต็มจอบนหน้าเว็บสาธารณะของทัวร์นาเมนต์ที่กำลัง Live — ทุกคนที่เปิดหน้านั้นค้างไว้จะเห็นภายใน ~8 วินาที
        </p>
      </motion.div>

      {active && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">กำลังแสดงล่าสุด</p>
            <p className="text-sm text-foreground truncate">
              {active.payload.team1} vs {active.payload.team2} — {active.payload.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleDismissActive()}
            disabled={busy}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-lose border border-lose/30 rounded-lg px-3 py-1.5 hover:bg-lose/10 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            ยกเลิก
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
        className="rounded-xl border border-[#262c4d] bg-[#05060d] overflow-hidden shadow-xl"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[#262c4d]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e23e3e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#f0c04a]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3e7be2]" />
          <span className="ml-2 text-[11px] font-mono text-[#8b91b3] tracking-wide">sciweek — /notify</span>
        </div>

        <div ref={scrollRef} className="px-4 py-3 h-72 overflow-y-auto font-mono text-[13px] leading-relaxed">
          {log.map((line) => (
            <div key={line.id} className={lineClass[line.kind]}>
              {line.kind === "input" ? `> ${line.text}` : line.text}
            </div>
          ))}
        </div>

        {/* Required-field checklist for the line currently being typed —
            only shows once the line starts with /notify. */}
        {checklist && (
          <div className="flex items-center gap-3 flex-wrap px-4 py-2 border-t border-[#262c4d] bg-black/20">
            {checklist.map(({ field, present }) => (
              <span
                key={field}
                className={`text-[11px] font-mono ${present ? "text-[#3e7be2]" : "text-[#5b6083]"}`}
              >
                {present ? "✓" : "○"} {field}
              </span>
            ))}
          </div>
        )}

        {suggestion.hint && (
          <div className="px-4 py-1.5 border-t border-[#262c4d] text-[11px] font-mono text-[#f0c04a]">
            {suggestion.hint}
          </div>
        )}

        {suggestion.items.length > 0 && (
          <div className="border-t border-[#262c4d] max-h-40 overflow-y-auto">
            {suggestion.items.map((item, i) => (
              <button
                key={item.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  acceptSuggestion(item)
                }}
                onMouseEnter={() => setSuggestion((s) => ({ ...s, highlight: i }))}
                className={`w-full flex items-center gap-3 px-4 py-1.5 text-left font-mono text-[12px] ${
                  i === suggestion.highlight ? "bg-brand/15 text-[#f0c04a]" : "text-[#8b91b3]"
                }`}
              >
                <span className="text-[#f4f5fb]">{item.label}</span>
                {item.hint && <span className="text-[#5b6083] truncate">{item.hint}</span>}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-[#262c4d] px-4 py-3">
          <span className="font-mono text-sm text-[#f0c04a] select-none">{">"}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={onInputChange}
            onSelect={onInputSelect}
            onKeyDown={onKeyDown}
            disabled={busy}
            placeholder="/notify team1=... team2=... winner=team1 message=&quot;...&quot;"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent font-mono text-sm text-[#f4f5fb] placeholder:text-[#3f4463] outline-none disabled:opacity-60"
          />
        </form>
      </motion.div>

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          กด <code className="px-1 py-0.5 rounded bg-muted font-mono">Tab</code> เพื่อเติมคำสั่ง/ฟิลด์อัตโนมัติ,{" "}
          <code className="px-1 py-0.5 rounded bg-muted font-mono">↑↓</code> เลือก,{" "}
          <code className="px-1 py-0.5 rounded bg-muted font-mono">Esc</code> ปิดคำแนะนำ
        </p>
        <button
          type="button"
          onClick={() => {
            setInput(EXAMPLE_COMMAND)
            inputRef.current?.focus()
          }}
          className="text-xs font-semibold text-brand hover:underline"
        >
          แทรกตัวอย่างคำสั่ง
        </button>
      </div>
    </div>
  )
}
