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
    // Nothing typed yet — don't dump every command on someone who just
    // clicked into the box.
    if (!prefix) return EMPTY_SUGGESTIONS
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
    // Same rule as the command list — a bare "/notify " with nothing after
    // it shouldn't immediately dump all eleven fields.
    if (!prefix) return EMPTY_SUGGESTIONS
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

// ── Syntax highlighting ──────────────────────────────────────────────
// Renders as an absolutely-positioned overlay behind a transparent-text
// <input> (see admin-broadcast.tsx) — so every segment's `text` must
// concatenate back to exactly the original string, whitespace included,
// or the colored layer drifts out of alignment with the real caret.

export interface HighlightSegment {
  text: string
  className: string
}

export const HIGHLIGHT_CLASS = {
  base: "text-[#f4f5fb]",
  command: "text-[#f0c04a]",
  key: "text-[#3e7be2]",
  keyBad: "text-[#e23e3e]",
  punct: "text-[#5b6083]",
  string: "text-[#9ece6a]",
  number: "text-[#e0af68]",
  constant: "text-[#bb9af7]",
} as const

const NUMBER_RE = /^-?\d+(\.\d+)?$/
const FIELD_SET: ReadonlySet<string> = new Set(FIELD_ORDER)

function isQuoted(raw: string): boolean {
  return raw.length >= 2 && (raw[0] === '"' || raw[0] === "'") && raw[raw.length - 1] === raw[0]
}

/** Splits a raw (quote-including) `key=value` token on the first "="
 * that isn't inside quotes — so `message="score=2-1"` still treats the
 * outer "=" as the separator, not the one inside the string. */
function splitKeyValueRaw(raw: string): { key: string; eq: string; value: string } {
  let inQuote: string | null = null
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (inQuote) {
      if (ch === inQuote) inQuote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch
    } else if (ch === "=") {
      return { key: raw.slice(0, i), eq: "=", value: raw.slice(i + 1) }
    }
  }
  return { key: raw, eq: "", value: "" }
}

export function highlightSegments(value: string): HighlightSegment[] {
  const tokens = tokenizeWithRanges(value)
  const segments: HighlightSegment[] = []
  let cursor = 0

  const pushRange = (end: number, className: string) => {
    if (end > cursor) segments.push({ text: value.slice(cursor, end), className })
    cursor = end
  }

  const isNotify = tokens.length > 0 && value.slice(tokens[0].start, tokens[0].end).toLowerCase() === "/notify"

  tokens.forEach((token, index) => {
    pushRange(token.start, HIGHLIGHT_CLASS.base) // whitespace before this token

    if (index === 0) {
      pushRange(token.end, HIGHLIGHT_CLASS.command)
      return
    }
    if (!isNotify) {
      pushRange(token.end, HIGHLIGHT_CLASS.base)
      return
    }

    const raw = value.slice(token.start, token.end)
    const { key, eq, value: rawValue } = splitKeyValueRaw(raw)
    const keyLower = key.toLowerCase()

    pushRange(cursor + key.length, FIELD_SET.has(keyLower) ? HIGHLIGHT_CLASS.key : HIGHLIGHT_CLASS.keyBad)
    if (eq) pushRange(cursor + eq.length, HIGHLIGHT_CLASS.punct)
    if (rawValue) {
      let valueClass: string = HIGHLIGHT_CLASS.base
      if (isQuoted(rawValue)) valueClass = HIGHLIGHT_CLASS.string
      else if (NUMBER_RE.test(rawValue)) valueClass = HIGHLIGHT_CLASS.number
      else if (
        (keyLower === "winner" && (rawValue === "team1" || rawValue === "team2")) ||
        (keyLower === "thirdplace" && (rawValue === "true" || rawValue === "false"))
      ) {
        valueClass = HIGHLIGHT_CLASS.constant
      }
      pushRange(token.end, valueClass)
    }
    cursor = token.end
  })

  pushRange(value.length, HIGHLIGHT_CLASS.base)
  return segments
}
