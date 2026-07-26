import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

/* ------------------------------------------------------------------
   MatchResultBroadcast — full-screen result reveal for the public site.

   Adapted from a standalone template: each team owns an opaque PLATE.
   When the result lands, the winner's plate rises in the stack and its
   clip expands across the loser's plate, physically covering it — an
   occlusion wipe instead of a fade/cross-dissolve (crisper on text).

   This is trimmed to the one case the app actually triggers: a single
   game that just got OCR-verified, always decided (never scheduled/live/
   draw — a game always has exactly one winner).
------------------------------------------------------------------ */

const REVEAL_MS = 1150
const HOLD_MS = 6000
const EXIT_MS = 450

const STYLES = `
.mb-stage {
  --brass: #f0c04a;
  --text:  #f4f5fb;
  --muted: #8b91b3;
  --dim:   #3f4463;
  --void:  #05060d;
  --sideA: #e23e3e;
  --sideB: #3e7be2;

  --slide: 1.05s cubic-bezier(.6,0,.15,1);
  --lift:  .85s cubic-bezier(.5,0,.15,1);
  --edge:  23vw;
  --shift: 8vw;

  position: fixed; inset: 0; z-index: 100;
  background: var(--void);
  font-family: var(--font-sans);
  color: var(--text);
  overflow: hidden;
  opacity: 0; transition: opacity .4s ease;
  -webkit-font-smoothing: antialiased;
}
.mb-stage * { box-sizing: border-box; }
.mb-stage[data-open="true"] { opacity: 1; }

.mb-plate {
  position: absolute; inset: 0; z-index: 1;
  transition: clip-path var(--slide);
}
.mb-plate[data-side="a"] {
  clip-path: polygon(0 0, 57% 0, 43% 100%, 0 100%);
  animation: mb-in-l .7s cubic-bezier(.16,.84,.28,1) both;
}
.mb-plate[data-side="b"] {
  clip-path: polygon(57% 0, 100% 0, 100% 100%, 43% 100%);
  animation: mb-in-r .7s cubic-bezier(.16,.84,.28,1) both;
}
@keyframes mb-in-l { from { opacity: 0; transform: translateX(-12%); } to { opacity: 1; transform: translateX(0); } }
@keyframes mb-in-r { from { opacity: 0; transform: translateX(12%);  } to { opacity: 1; transform: translateX(0); } }

.mb-plate[data-outcome="win"]  { z-index: 3; }
.mb-plate[data-outcome="loss"] { z-index: 1; }
.mb-stage[data-verdict="a"] .mb-plate[data-side="a"] { clip-path: polygon(0 0, 80% 0, 66% 100%, 0 100%); }
.mb-stage[data-verdict="b"] .mb-plate[data-side="b"] { clip-path: polygon(34% 0, 100% 0, 100% 100%, 20% 100%); }

.mb-plate-bg {
  position: absolute; inset: 0;
  transition: filter var(--lift) .1s;
}
.mb-plate[data-side="a"] .mb-plate-bg {
  background: linear-gradient(103deg,
    color-mix(in srgb, var(--sideA) 52%, var(--void)) 0%,
    color-mix(in srgb, var(--sideA) 14%, var(--void)) 46%,
    var(--void) 82%);
}
.mb-plate[data-side="b"] .mb-plate-bg {
  background: linear-gradient(-103deg,
    color-mix(in srgb, var(--sideB) 52%, var(--void)) 0%,
    color-mix(in srgb, var(--sideB) 14%, var(--void)) 46%,
    var(--void) 82%);
}
.mb-plate[data-outcome="loss"] .mb-plate-bg { filter: saturate(.07) brightness(.5); }

.mb-body {
  position: absolute; top: 0; bottom: 0;
  display: flex; align-items: center;
  gap: clamp(20px, 5vw, 64px);
  transition: transform var(--slide);
}
.mb-plate[data-side="a"] .mb-body {
  left: 0; right: 50%;
  padding: 0 clamp(18px, 5vw, 60px) 0 clamp(28px, 7vw, 104px);
  flex-direction: row; text-align: right;
}
.mb-plate[data-side="b"] .mb-body {
  left: 50%; right: 0;
  padding: 0 clamp(28px, 7vw, 104px) 0 clamp(18px, 5vw, 60px);
  flex-direction: row-reverse; text-align: left;
}
.mb-stage[data-verdict="a"] .mb-plate[data-side="a"] .mb-body { transform: translateX(var(--shift)); }
.mb-stage[data-verdict="b"] .mb-plate[data-side="b"] .mb-body { transform: translateX(calc(var(--shift) * -1)); }

.mb-team { flex: 1; min-width: 0; }
.mb-plate[data-side="a"] .mb-team { animation: mb-rise-l .75s cubic-bezier(.16,.84,.28,1) .16s both; }
.mb-plate[data-side="b"] .mb-team { animation: mb-rise-r .75s cubic-bezier(.16,.84,.28,1) .16s both; }
@keyframes mb-rise-l { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: translateX(0); } }
@keyframes mb-rise-r { from { opacity: 0; transform: translateX(28px);  } to { opacity: 1; transform: translateX(0); } }

.mb-name {
  font-family: var(--font-display);
  font-size: clamp(30px, 6.2vw, 78px);
  line-height: .95; letter-spacing: .004em;
  overflow-wrap: anywhere; color: var(--text);
  transition: color var(--lift), font-size var(--lift), text-shadow var(--lift);
}
.mb-plate[data-outcome="win"] .mb-name {
  font-size: clamp(33px, 6.9vw, 88px);
  text-shadow: 0 22px 40px rgba(0,0,0,.85);
}
.mb-plate[data-outcome="loss"] .mb-name { color: #5b6083; }

.mb-sub {
  margin-top: 12px; font-size: clamp(9px, 1.05vw, 11px); font-weight: 600;
  letter-spacing: .24em; text-transform: uppercase; color: var(--muted);
  transition: color var(--lift);
}
.mb-plate[data-outcome="loss"] .mb-sub { color: var(--dim); }

.mb-rule {
  height: 3px; width: 0; margin-top: 16px;
  background: var(--accent); box-shadow: 0 0 20px var(--accent);
  transition: width .75s cubic-bezier(.16,.84,.28,1) .28s;
}
.mb-plate[data-side="a"] .mb-rule { margin-left: auto; }
.mb-plate[data-outcome="win"] .mb-rule { width: clamp(64px, 26%, 150px); }

.mb-num {
  font-family: var(--font-mono);
  font-weight: 700; font-variant-numeric: tabular-nums;
  font-size: clamp(42px, 9.4vw, 116px); line-height: 1; color: var(--text);
  transition: color var(--lift), text-shadow var(--lift);
  animation: mb-punch .5s cubic-bezier(.2,1.4,.4,1) .48s both;
}
.mb-plate[data-side="b"] .mb-num { animation-delay: .6s; }
@keyframes mb-punch { from { opacity: 0; } to { opacity: 1; } }
.mb-plate[data-outcome="win"] .mb-num { color: var(--brass); text-shadow: 0 20px 34px rgba(0,0,0,.9); }
.mb-plate[data-outcome="loss"] .mb-num { color: var(--dim); }

.mb-cast {
  position: absolute; top: -18%; bottom: -18%; z-index: 2;
  width: clamp(100px, 13vw, 210px); pointer-events: none; opacity: 0;
  filter: blur(16px);
  transition: transform var(--slide), opacity var(--lift) .12s;
}
.mb-cast--r { left: 50%; background: linear-gradient(90deg, rgba(0,0,0,.85), rgba(0,0,0,0)); transform: translateX(0) rotate(7deg); }
.mb-cast--l { right: 50%; background: linear-gradient(270deg, rgba(0,0,0,.85), rgba(0,0,0,0)); transform: translateX(0) rotate(7deg); }
.mb-stage[data-verdict="a"] .mb-cast--r { opacity: 1; transform: translateX(var(--edge)) rotate(7deg); }
.mb-stage[data-verdict="b"] .mb-cast--l { opacity: 1; transform: translateX(calc(var(--edge) * -1)) rotate(7deg); }

.mb-seam-wrap { position: absolute; inset: 0; z-index: 4; pointer-events: none; animation: mb-fade .8s ease both; }
@keyframes mb-fade { from { opacity: 0; } to { opacity: 1; } }
.mb-seam {
  position: absolute; top: -12%; bottom: -12%; left: 50%; width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255,255,255,.42) 20%, rgba(255,255,255,.42) 80%, transparent);
  transform: translateX(0) rotate(7deg);
  transition: transform var(--slide), background var(--lift), box-shadow var(--lift), width var(--lift);
}
.mb-stage[data-verdict="a"] .mb-seam,
.mb-stage[data-verdict="b"] .mb-seam {
  width: 2px;
  background: linear-gradient(180deg, transparent, var(--brass) 18%, var(--brass) 82%, transparent);
  box-shadow: 0 0 38px 5px rgba(240,192,74,.38);
}
.mb-stage[data-verdict="a"] .mb-seam { transform: translateX(var(--edge)) rotate(7deg); }
.mb-stage[data-verdict="b"] .mb-seam { transform: translateX(calc(var(--edge) * -1)) rotate(7deg); }

.mb-vignette {
  position: absolute; inset: 0; z-index: 5; pointer-events: none;
  background: radial-gradient(ellipse 80% 74% at 50% 48%, transparent 44%, rgba(0,0,0,.62) 100%);
}

.mb-sweep { position: absolute; inset: 0; z-index: 5; pointer-events: none; opacity: 0;
  background: linear-gradient(78deg, transparent 42%, rgba(255,255,255,.07) 50%, transparent 58%); }
.mb-stage[data-verdict="a"] .mb-sweep,
.mb-stage[data-verdict="b"] .mb-sweep { animation: mb-sweep 1.6s ease-out .3s 1 both; }
@keyframes mb-sweep { from { opacity: 1; transform: translateX(-60%); } to { opacity: 0; transform: translateX(60%); } }

.mb-meta {
  position: absolute; top: clamp(20px, 4vh, 44px); left: 0; right: 0; z-index: 6;
  display: flex; align-items: center; justify-content: center;
  gap: 14px; flex-wrap: wrap; padding: 0 clamp(60px, 12vw, 140px);
  font-size: clamp(9px, 1.05vw, 11px); font-weight: 600;
  letter-spacing: .28em; text-transform: uppercase; color: var(--muted);
  animation: mb-fade-up .6s ease .08s both;
}
.mb-meta i { width: 3px; height: 3px; border-radius: 50%; background: var(--dim); font-style: normal; }
.mb-chip { display: inline-flex; align-items: center; gap: 7px; color: var(--brass); }
.mb-chip b { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
@keyframes mb-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.mb-verdict-wrap {
  position: absolute; bottom: clamp(24px, 6vh, 60px); left: 0; right: 0; z-index: 6;
  display: flex; justify-content: center; padding: 0 clamp(20px, 6vw, 80px);
}
.mb-verdict {
  display: inline-flex; align-items: center; gap: clamp(10px, 2vw, 20px);
  padding: clamp(10px, 1.7vh, 15px) clamp(20px, 4.5vw, 44px);
  border-top: 1px solid rgba(240,192,74,.35);
  border-bottom: 1px solid rgba(240,192,74,.35);
  background: rgba(5,6,13,.55);
  font-family: var(--font-display);
  font-size: clamp(10px, 1.45vw, 15px); letter-spacing: .26em;
  text-transform: uppercase; color: var(--brass); text-align: center;
  clip-path: inset(0 50% 0 50%); opacity: 0;
  transition: clip-path .7s cubic-bezier(.6,0,.15,1) .32s, opacity .4s ease .32s;
}
.mb-verdict[data-shown="true"] { clip-path: inset(0 0 0 0); opacity: 1; }
.mb-verdict em { font-style: normal; color: var(--text); }
.mb-verdict u {
  text-decoration: none; font-family: var(--font-mono); font-weight: 700;
  letter-spacing: .1em; color: var(--brass);
}

.mb-close {
  position: absolute; top: clamp(14px, 2.6vw, 28px); right: clamp(14px, 2.6vw, 28px);
  z-index: 7; appearance: none; background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.14); border-radius: 4px;
  color: var(--muted); cursor: pointer;
  font: 600 10px/1 var(--font-sans); letter-spacing: .18em; text-transform: uppercase;
  padding: 9px 12px;
}
.mb-close:hover { color: var(--text); border-color: rgba(255,255,255,.32); }
.mb-close:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }

@media (max-width: 820px) {
  /* Mobile flips the split from left/right to top/bottom. The plate boundary
     runs edge-to-edge, dropping by --seam-drop below the mid-line on the left
     and rising the same amount on the right, so its mid-point is always at
     50% (+/- --edge once a verdict lands).

     --seam-drop is a LENGTH, not a percentage of the plate box: a percentage
     would resolve against viewport *height* while the run resolves against
     viewport *width*, making the on-screen angle depend on aspect ratio while
     the seam decoration below used a fixed rotation. Same length unit on both
     sides => one slope drives the clip AND the seam. Capped in vh so a short
     landscape viewport doesn't get a wedge deep enough to eat the score text. */
  .mb-stage {
    --edge: 29vh; --shift: 7vh;
    --seam-drop: min(7vw, 4.5vh);
    /* atan(2 * 7vw / 100vw) — static fallback for engines without CSS trig. */
    --seam-angle: -7.97deg;
  }
  @supports (rotate: atan2(1px, 2px)) {
    /* rise = -2 * --seam-drop over a run of 100vw. */
    .mb-stage { --seam-angle: atan2(calc(var(--seam-drop) * -2), 100vw); }
  }

  .mb-plate[data-side="a"] {
    clip-path: polygon(0 0, 100% 0, 100% calc(50% - var(--seam-drop)), 0 calc(50% + var(--seam-drop)));
  }
  .mb-plate[data-side="b"] {
    clip-path: polygon(0 calc(50% + var(--seam-drop)), 100% calc(50% - var(--seam-drop)), 100% 100%, 0 100%);
  }
  .mb-stage[data-verdict="a"] .mb-plate[data-side="a"] {
    clip-path: polygon(0 0, 100% 0, 100% calc(50% + var(--edge) - var(--seam-drop)), 0 calc(50% + var(--edge) + var(--seam-drop)));
  }
  .mb-stage[data-verdict="b"] .mb-plate[data-side="b"] {
    clip-path: polygon(0 calc(50% - var(--edge) + var(--seam-drop)), 100% calc(50% - var(--edge) - var(--seam-drop)), 100% 100%, 0 100%);
  }
  @keyframes mb-in-l { from { opacity: 0; transform: translateY(-10%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes mb-in-r { from { opacity: 0; transform: translateY(10%);  } to { opacity: 1; transform: translateY(0); } }

  .mb-plate[data-side="a"] .mb-body,
  .mb-plate[data-side="b"] .mb-body {
    left: 0; right: 0; flex-direction: column; justify-content: center;
    gap: clamp(10px, 2.4vh, 22px); text-align: center;
  }
  .mb-plate[data-side="a"] .mb-body { top: 0; bottom: 50%; padding: clamp(56px, 12vh, 110px) 22px 12px; }
  .mb-plate[data-side="b"] .mb-body { top: 50%; bottom: 0; padding: 12px 22px clamp(84px, 16vh, 150px); flex-direction: column-reverse; }
  .mb-stage[data-verdict="a"] .mb-plate[data-side="a"] .mb-body { transform: translateY(var(--shift)); }
  .mb-stage[data-verdict="b"] .mb-plate[data-side="b"] .mb-body { transform: translateY(calc(var(--shift) * -1)); }
  .mb-team { flex: none; }
  .mb-plate[data-side="a"] .mb-rule { margin-left: auto; margin-right: auto; }
  .mb-plate[data-side="b"] .mb-rule { margin-left: auto; margin-right: auto; }
  @keyframes mb-rise-l { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes mb-rise-r { from { opacity: 0; transform: translateY(20px);  } to { opacity: 1; transform: translateY(0); } }

  /* The seam's box is centred on the boundary's mid-point (top: 50%, and
     horizontally centred by the symmetric -12% insets), so rotating it by the
     boundary's own slope puts it exactly on the boundary line — at rest and
     after the mid-point slides by --edge. */
  .mb-seam {
    top: 50%; bottom: auto; left: -12%; right: -12%; width: auto; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.42) 20%, rgba(255,255,255,.42) 80%, transparent);
    transform: translateY(0) rotate(var(--seam-angle));
  }
  .mb-stage[data-verdict="a"] .mb-seam,
  .mb-stage[data-verdict="b"] .mb-seam {
    width: auto; height: 2px;
    background: linear-gradient(90deg, transparent, var(--brass) 18%, var(--brass) 82%, transparent);
  }
  .mb-stage[data-verdict="a"] .mb-seam { transform: translateY(var(--edge)) rotate(var(--seam-angle)); }
  .mb-stage[data-verdict="b"] .mb-seam { transform: translateY(calc(var(--edge) * -1)) rotate(var(--seam-angle)); }

  /* Casts hang off the boundary rather than straddling it, so they pivot about
     the edge that touches it (top edge for --r, bottom edge for --l) instead of
     their own centre — otherwise rotation lifts that edge off the boundary. */
  .mb-cast { top: auto; bottom: auto; left: -18%; right: -18%; width: auto; height: clamp(90px, 15vh, 180px); }
  .mb-cast--r { top: 50%; transform-origin: 50% 0; background: linear-gradient(180deg, rgba(0,0,0,.85), rgba(0,0,0,0)); transform: translateY(0) rotate(var(--seam-angle)); }
  .mb-cast--l { bottom: 50%; top: auto; transform-origin: 50% 100%; background: linear-gradient(0deg, rgba(0,0,0,.85), rgba(0,0,0,0)); transform: translateY(0) rotate(var(--seam-angle)); }
  .mb-stage[data-verdict="a"] .mb-cast--r { transform: translateY(var(--edge)) rotate(var(--seam-angle)); }
  .mb-stage[data-verdict="b"] .mb-cast--l { transform: translateY(calc(var(--edge) * -1)) rotate(var(--seam-angle)); }

  .mb-meta { padding: 0 20px; gap: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .mb-stage, .mb-stage * { animation: none !important; transition: none !important; }
  .mb-verdict { clip-path: none; opacity: 1; }
}
`

/* ------------------------------------------------------------------ */

/** Everything the broadcast needs to describe one freshly-verified game. */
export interface BroadcastGameResult {
  /** `${matchId}:${gameNumber}` — stable identity for queueing/keying. */
  key: string
  stageName: string
  roundName: string
  isThirdPlace: boolean
  bestOf: number
  gameNumber: number
  team1: string
  team2: string
  kills1: number | null
  kills2: number | null
  winner: "team1" | "team2"
  /** null when the match is still open after this game (mid-series). */
  outcome: "advance" | "champion" | "third-place" | null
  /** Only set when outcome === "advance". */
  advanceRoundName: string | null
  /** Free-text verdict line, e.g. from an admin's manual /notify push.
   * When set, it replaces the outcome-derived copy below entirely. */
  message?: string | null
}

function Plate({
  side,
  name,
  score,
  outcome,
}: {
  side: "a" | "b"
  name: string
  score: number | null
  outcome: "pending" | "win" | "loss"
}) {
  return (
    <div className="mb-plate" data-side={side} data-outcome={outcome}>
      <div className="mb-plate-bg" />
      <div className="mb-body">
        <div className="mb-team">
          <div className="mb-name">{name}</div>
          <div className="mb-rule" />
        </div>
        <div className="mb-num">{score ?? "–"}</div>
      </div>
    </div>
  )
}

export function MatchResultBroadcast({
  result,
  onClose,
}: {
  result: BroadcastGameResult
  onClose: () => void
}) {
  const [phase, setPhase] = useState<"reveal" | "resolved">("reveal")
  // Two-stage lifecycle so the stage's opacity transition has something to
  // animate from/to: mounts closed, opens a frame later (entrance fade-in),
  // then flips back to closed on requestClose and only unmounts (via
  // onClose) once that fade-out transition has actually finished.
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setPhase("reveal")
    setOpen(false)
    setClosing(false)
    const raf = requestAnimationFrame(() => setOpen(true))
    const t = window.setTimeout(() => setPhase("resolved"), REVEAL_MS)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [result.key])

  const requestClose = useCallback(() => setClosing(true), [])

  useEffect(() => {
    if (closing) return
    const t = window.setTimeout(requestClose, HOLD_MS)
    return () => window.clearTimeout(t)
  }, [result.key, closing, requestClose])

  useEffect(() => {
    if (!closing) return
    const t = window.setTimeout(onClose, EXIT_MS)
    return () => window.clearTimeout(t)
  }, [closing, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose()
    window.addEventListener("keydown", onKey)
    closeRef.current?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [requestClose])

  const resolved = phase === "resolved"
  const aWins = result.winner === "team1"
  const bWins = result.winner === "team2"
  const verdict = resolved ? (aWins ? "a" : "b") : "none"
  const outcomeFor = (win: boolean): "pending" | "win" | "loss" => (!resolved ? "pending" : win ? "win" : "loss")
  const winnerName = aWins ? result.team1 : result.team2
  const scoreLine = `${result.kills1 ?? "–"}–${result.kills2 ?? "–"}`

  let verdictLine: ReactNode
  if (result.message) {
    verdictLine = (
      <>
        <em>{winnerName}</em>
        <u>{scoreLine}</u>
        <span>{result.message}</span>
      </>
    )
  } else if (result.outcome === "champion") {
    verdictLine = (
      <>
        <em>{winnerName}</em>
        <u>{scoreLine}</u>
        <span>คว้าแชมป์!</span>
      </>
    )
  } else if (result.outcome === "advance") {
    verdictLine = (
      <>
        <em>{winnerName}</em>
        <u>{scoreLine}</u>
        <span>ผ่านเข้าสู่{result.advanceRoundName}</span>
      </>
    )
  } else if (result.outcome === "third-place") {
    verdictLine = (
      <>
        <em>{winnerName}</em>
        <u>{scoreLine}</u>
        <span>คว้าอันดับ 3</span>
      </>
    )
  } else {
    verdictLine = (
      <>
        <em>{winnerName}</em>
        <u>{scoreLine}</u>
        <span>นำในซีรีส์ BO{result.bestOf}</span>
      </>
    )
  }

  return (
    <div
      className="mb-stage"
      role="dialog"
      aria-modal="true"
      aria-label={`ผลเกม ${result.gameNumber}: ${result.team1} ${result.kills1 ?? "?"} - ${result.team2} ${result.kills2 ?? "?"}`}
      data-open={open && !closing}
      data-verdict={verdict}
    >
      <style>{STYLES}</style>

      <Plate side="a" name={result.team1} score={result.kills1} outcome={outcomeFor(aWins)} />
      <Plate side="b" name={result.team2} score={result.kills2} outcome={outcomeFor(bWins)} />

      <div className="mb-cast mb-cast--r" />
      <div className="mb-cast mb-cast--l" />
      <div className="mb-seam-wrap"><div className="mb-seam" /></div>
      <div className="mb-sweep" />
      <div className="mb-vignette" />

      <div className="mb-meta">
        <span>{result.stageName}</span>
        <i />
        <span>
          {result.roundName}
          {result.isThirdPlace ? " · ชิงอันดับ 3" : ""}
        </span>
        <i />
        <span>
          BO{result.bestOf} · เกม {result.gameNumber}
        </span>
        <i />
        <span className="mb-chip">
          <b />
          ยืนยันผลแล้ว
        </span>
      </div>

      <div className="mb-verdict-wrap">
        <div className="mb-verdict" data-shown={resolved}>
          {verdictLine}
        </div>
      </div>

      <button className="mb-close" ref={closeRef} onClick={requestClose}>
        ปิด
      </button>
    </div>
  )
}
