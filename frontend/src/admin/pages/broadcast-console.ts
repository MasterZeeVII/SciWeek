// Pure logic for the /notify console's autocomplete + typo-guard — no React
// here so it's easy to reason about (and test) independent of the widget.

export interface Token {
  /** Unquoted text — `team1="Aurora Nine"` tokenizes to `team1=Aurora Nine`. */
  text: string
  /** Indices into the original input string, quotes included — used to
   * splice a replacement back in without disturbing the rest of the line. */
  start: number
  end: number
}

export interface SuggestionItem {
  label: string
  hint?: string
  /** Raw text spliced in at the active token's range. */
  insert: string
  /** Cursor offset from the start of `insert` after accepting; defaults to
   * the end (e.g. lands inside the quotes for a `team1=""` snippet). */
  cursorAfter?: number
}

export interface SuggestionState {
  items: SuggestionItem[]
  highlight: number
  range: { start: number; end: number } | null
  /** "did you mean…" text shown when nothing matches by prefix. */
  hint: string | null
}

export const EMPTY_SUGGESTIONS: SuggestionState = { items: [], highlight: 0, range: null, hint: null }

export const COMMANDS = ["/notify", "/dismiss", "/help", "clear"] as const

export const COMMAND_HINT: Record<string, string> = {
  "/notify": "ดันผลประกาศไปหน้าเว็บสาธารณะ",
  "/dismiss": "ยกเลิกประกาศปัจจุบัน",
  "/help": "แสดงวิธีใช้คำสั่ง",
  clear: "ล้างข้อความในคอนโซล (ในเครื่องเท่านั้น)",
}

export const FIELD_ORDER = [
  "team1",
  "team2",
  "winner",
  "message",
  "kills1",
  "kills2",
  "round",
  "stage",
  "bestof",
  "gamenumber",
  "thirdplace",
] as const

export const REQUIRED_FIELDS = ["team1", "team2", "winner", "message"] as const

export const FIELD_HINT: Record<string, string> = {
  team1: "ชื่อทีม 1",
  team2: "ชื่อทีม 2",
  winner: "ทีมที่ชนะ (team1/team2)",
  kills1: "คะแนน/คิลทีม 1",
  kills2: "คะแนน/คิลทีม 2",
  message: "ข้อความประกาศ",
  round: "ชื่อรอบ",
  stage: "ชื่อสาย/ดิวิชัน",
  bestof: "Best of กี่เกม",
  gamenumber: "เกมที่",
  thirdplace: "ชิงอันดับ 3 (true/false)",
}

// Fields whose value is free text — suggest a quoted, cursor-inside snippet.
// Everything else (enum/numeric) just completes to "field=" and lets the
// user keep typing, or Tab again for enum value suggestions below.
const QUOTED_FIELDS = new Set(["team1", "team2", "message", "round", "stage"])

const VALUE_SUGGESTIONS: Record<string, string[]> = {
  winner: ["team1", "team2"],
  thirdplace: ["true", "false"],
}

export function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

/** Closest candidate to `prefix` within edit-distance 2, or null if nothing's close. */
export function nearestMatch(prefix: string, candidates: string[]): string | null {
  if (!prefix) return null
  let best: string | null = null
  let bestDistance = Infinity
  for (const candidate of candidates) {
    const distance = levenshtein(prefix, candidate)
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }
  return bestDistance <= 2 ? best : null
}

/** Splits on whitespace, respecting "..."/'...' quoting (quotes stripped
 * from `text`, but `start`/`end` still index the raw original string so a
 * replacement can splice cleanly, quotes and all). */
export function tokenizeWithRanges(value: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = value.length
  while (i < n) {
    while (i < n && /\s/.test(value[i])) i++
    if (i >= n) break
    const start = i
    let text = ""
    while (i < n && !/\s/.test(value[i])) {
      const ch = value[i]
      if (ch === '"' || ch === "'") {
        const quote = ch
        i++
        while (i < n && value[i] !== quote) {
          text += value[i]
          i++
        }
        if (i < n) i++
      } else {
        text += ch
        i++
      }
    }
    tokens.push({ text, start, end: i })
  }
  return tokens
}

export function buildChecklist(tokens: Token[]): { field: string; present: boolean }[] | null {
  if (tokens.length === 0 || tokens[0].text.toLowerCase() !== "/notify") return null
  const seen = new Set<string>()
  for (const token of tokens.slice(1)) {
    const eq = token.text.indexOf("=")
    if (eq === -1) continue
    const key = token.text.slice(0, eq).toLowerCase()
    const value = token.text.slice(eq + 1)
    if (value) seen.add(key)
  }
  return REQUIRED_FIELDS.map((field) => ({ field, present: seen.has(field) }))
}

/** Note: only precise when the cursor sits at/after the token's own "="
 * (the common append-as-you-type flow) — editing back into an already-typed
 * key doesn't re-detect "still typing the key" vs "typing the value". Good
 * enough for a console meant to be typed forward, not edited in place.
 *
 * `value` is the raw input string — needed (beyond `tokens`) to tell "cursor
 * sitting in trailing whitespace after the last token" apart from "cursor
 * parked in a gap between two earlier tokens", which gets no suggestions. */
export function computeSuggestions(value: string, tokens: Token[], cursor: number): SuggestionState {
  let activeIndex = tokens.findIndex((t) => cursor >= t.start && cursor <= t.end)
  let active: Token

  if (activeIndex === -1) {
    const atTrailingEnd = cursor >= (tokens.length ? tokens[tokens.length - 1].end : 0) && cursor <= value.length
    if (atTrailingEnd) {
      active = { text: "", start: cursor, end: cursor }
      activeIndex = tokens.length
    } else {
      return EMPTY_SUGGESTIONS
    }
  } else {
    active = tokens[activeIndex]
  }

  if (activeIndex === 0) {
    const prefix = active.text.toLowerCase()
    const items: SuggestionItem[] = COMMANDS.filter((c) => c !== prefix && c.startsWith(prefix)).map((c) => ({
      label: c,
      hint: COMMAND_HINT[c],
      insert: `${c} `,
    }))
    let hint: string | null = null
    if (items.length === 0 && prefix.length >= 2) {
      const nearest = nearestMatch(prefix, [...COMMANDS])
      if (nearest && nearest !== prefix) hint = `ไม่รู้จักคำสั่ง '${active.text}' — หมายถึง ${nearest} ใช่ไหม?`
    }
    return { items, highlight: 0, range: items.length ? { start: active.start, end: active.end } : null, hint }
  }

  if (tokens[0]?.text.toLowerCase() !== "/notify") {
    return EMPTY_SUGGESTIONS
  }

  const usedKeys = new Set(
    tokens
      .slice(1, activeIndex)
      .map((t) => (t.text.includes("=") ? t.text.slice(0, t.text.indexOf("=")).toLowerCase() : null))
      .filter((k): k is string => !!k),
  )

  const eqIndex = active.text.indexOf("=")
  if (eqIndex === -1) {
    const prefix = active.text.toLowerCase()
    const available = FIELD_ORDER.filter((f) => !usedKeys.has(f))
    const items: SuggestionItem[] = available
      .filter((f) => f.startsWith(prefix))
      .map((f) => ({
        label: `${f}=`,
        hint: FIELD_HINT[f],
        insert: QUOTED_FIELDS.has(f) ? `${f}=""` : `${f}=`,
        cursorAfter: QUOTED_FIELDS.has(f) ? f.length + 2 : undefined,
      }))
    let hint: string | null = null
    if (items.length === 0 && prefix.length >= 2) {
      const nearest = nearestMatch(prefix, available)
      if (nearest) hint = `ไม่รู้จักฟิลด์ '${prefix}' — หมายถึง ${nearest}= ใช่ไหม?`
    }
    return { items, highlight: 0, range: items.length ? { start: active.start, end: active.end } : null, hint }
  }

  const key = active.text.slice(0, eqIndex).toLowerCase()
  const valuePrefix = active.text.slice(eqIndex + 1).toLowerCase()
  const candidates = VALUE_SUGGESTIONS[key]
  if (!candidates) return EMPTY_SUGGESTIONS
  const items: SuggestionItem[] = candidates
    .filter((v) => v.startsWith(valuePrefix))
    .map((v) => ({ label: v, insert: `${v} ` }))
  return { items, highlight: 0, range: items.length ? { start: active.start, end: active.end } : null, hint: null }
}
