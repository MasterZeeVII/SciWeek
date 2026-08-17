# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Django tournament control system for an NSRU E-Sport SCIWEEK bracket event. Manages tournaments, divisions (Junior/Senior), schools, teams, rounds, single-elimination brackets, and match score capture with camera OCR verification. The only UI is the React/Vite SPA in `frontend/`; the backend is a JSON API only (the old server-rendered Django pages were removed).

**The database owns the schema.** `sciweek.sql` at the repo root is the source of truth (a phpMyAdmin dump of the live MySQL 8 / MariaDB database, hand-maintained). There are intentionally **no Django migrations** — models in `src/common/models.py` mirror the SQL columns exactly. If the schema changes: update the database and `sciweek.sql` first, then mirror the change in the models. Never run `makemigrations`.

## Layout

Backend code lives under `src/` (put on `sys.path` by `manage.py`/`wsgi.py`), organized by layer rather than as one Django app:

- `src/config/` — Django project config: `settings.py`, root `urls.py`, `wsgi.py`/`asgi.py`. `config/__init__.py` installs PyMySQL as the MySQLdb stand-in.
- `src/common/` — the only Django app in `INSTALLED_APPS`: ORM models, session auth helpers (`auth.py`), and management commands (`common/management/commands/`).
- `src/service/` — business logic, plain modules: `bracket.py` (generation/reset), `results.py` (winners, status, advancement), `tournament.py` (activation, default divisions). All rules live here, not in endpoints.
- `src/api/` — HTTP layer: `endpoints.py` (request handlers), `serializers.py` (payload builders), `urls.py`. Mounted under `/api/` by `config/urls.py`.
- `src/ocr.py` — **hand-finetuned OCR scanner; do not modify without asking the user.** Lazy-imports `cv2`/`easyocr`/`numpy` so the core app runs without them.
- `frontend/` — React/Vite SPA (no separate design-reference copy checked in anymore).
- `paper/` — Thai thesis chapter 3 (analysis/design) generator: `make_diagrams.py`/`build_chapter3.py` produce the diagram set and the `.docx`. Unrelated to the running app; only touch it when asked to work on the paper.

## Commands

Backend (run from repo root; `env/` is the venv):

```powershell
.\env\Scripts\python.exe manage.py runserver 0.0.0.0:8000   # dev server, LAN-visible
.\env\Scripts\python.exe manage.py check
.\env\Scripts\python.exe manage.py create_admin --username admin --password ...
.\env\Scripts\python.exe manage.py wipe_data --teams --yes  # wipe brackets+teams; also --tournaments/--schools/--users (dry-run without --yes)
```

There is no test suite in this repo currently. `manage.py migrate` only applies Django's own `sessions` migrations — domain tables come from `sciweek.sql`.

Frontend (run from repo root, or `cd frontend` and drop the `--prefix`):

```powershell
npm.cmd --prefix frontend install
npm.cmd --prefix frontend run dev      # Vite dev server on :5173, proxies /api and /media to Django on :8000
npm.cmd --prefix frontend run build    # tsc --noEmit type-check, then vite build
```

Django must be running whenever the Vite dev server is used — the SPA has no mock/standalone mode.

OCR is an optional heavy dependency set, installed separately:

```powershell
.\env\Scripts\python.exe -m pip install -r requirements-ocr.txt
```

Config: copy `.env.example` to `.env` and set `DB_*` vars for the MySQL connection (defaults point at `192.168.1.37`). `DJANGO_DEBUG`/`DJANGO_SECRET_KEY`/`DJANGO_ALLOWED_HOSTS` also come from `.env` via `src/config/settings.py`.

## Architecture

### Domain model (`src/common/models.py`)

Chain: `Tournament` (one `is_active` at a time) → `Division` (JUNIOR/SENIOR, unique per tournament) → `Round` (round_number + round_name + best_of, unique per division) → `Match` (match_number unique per round, linked to `next_match` for advancement) → `MatchGame` (one row per game in a best-of series, carries OCR + verification state). `Team` hangs off `Division` (school + team_number).

`Round` is the schema change that motivated the 2026-07 rebuild: `best_of` and `round_number` live on the round row, not the match. `Match.best_of`/`Match.division` exist only as convenience properties that walk `match.round` — query with `select_related("round")` where they're used.

### Business rules (`src/service/`)

Key invariants enforced in services, not the DB:

- `bracket.generate_bracket(division, team_ids, round_configs, randomize)` only accepts power-of-two team counts (2/4/8/16/32) — no bracket-slot table, so byes aren't supported. Rejected if the division already has rounds; call `reset_division_bracket()` first (deleting rounds cascades to matches and games). `round_configs` is the frontend's `{round, bestOf, name}` shape and is persisted to the `rounds` table.
- Round 1 matches get concrete `MatchGame` rows immediately (`create_games_for_match`); later rounds only get games once **both** feeder matches have decided winners (`results.try_create_next_match_games`).
- `MatchGame.OcrStatus` is a linear pipeline: `PENDING → UPLOADED → OCR_DONE → VERIFIED` (or `REJECTED`). A match is won once one team reaches `(best_of // 2) + 1` verified game wins (`results.get_match_winner`).
- Changing a game result after the match already had a decided winner cascades: `results.set_game_result()` detects the winner change and calls `clear_downstream_matches()` to recursively wipe next-round games/status that depended on the old result.
- `results.refresh_match_status()` is the single place that recomputes a `Match.status` and triggers next-round game creation — call it after any game mutation rather than setting `match.status` directly.
- **Third-place decider** (`generate_bracket(..., third_place=True)`, or `thirdPlace: true` in the generate API): by convention it is match_number 2 of the final round, with no `next_match` and no feeder pointers. `results.get_match_participants` resolves its teams as the semifinal *losers*, and `try_create_next_match_games`/`clear_downstream_matches` handle it alongside the final. `bracket.is_third_place_match()` is the detector. The frontend labels it "3rd Place" (`isThirdPlaceMatch` in `components/bracket/bracket-canvas.tsx`).

### API (`src/api/`)

Session-authenticated against the schema `users` table via `common/auth.py` (`get_current_user`/`require_user`/`require_role` raising `PermissionError`) — **not** `django.contrib.auth`, which isn't installed. CSRF middleware is not installed either; the SPA sends only the session cookie. The `api_handler(*methods)` decorator in `endpoints.py` maps `PermissionError` → 403 and `ValidationError` → 400 for every handler.

**ADMIN is the wildcard role**: `require_role()` lets ADMIN through every gate without being listed; other roles (MONITOR, FIELD_STAFF) pass only the gates that name them. The frontend mirrors this in `lib/roles.ts` (`hasRole()`); never write `user.role === "ADMIN" || ...` checks by hand on either side.

Read-only endpoints require no auth: `GET /api/state/` plus the public-site trio `GET /api/public/tournaments/` (season list with champions), `GET /api/public/tournaments/<id>/` (divisions as bracket "stages" with series scores, per-match `games` — **verified games only**, with kill scores; unverified scans never leak to the public payload — participants, standings), and `GET /api/public/dashboard-stats/` (cross-season aggregates — total matches, distinct schools with teams, top-8 schools by wins, per-division championship history — computed server-side in `serializers.dashboard_stats_payload()` specifically to avoid the admin dashboard fanning out to every season's full bracket detail) — payload builders `public_tournaments_payload`/`public_tournament_payload`/`dashboard_stats_payload` in `serializers.py`. `GET /api/schools/` (ADMIN-only) lists schools for the team-creation dropdown. Only mutations demand a role. Season switching: `POST /api/tournaments/` upserts by year and activates; `POST /api/tournaments/<id>/activate/` re-activates a past season (both ADMIN-only). User management (`/api/users/`, ADMIN-only) backs the `/admin/users` page.

Every mutation endpoint returns the same `serializers.state_payload()` shape (tournament + divisions + selected division with nested teams/matches/games) so the client treats any response as a full state refresh.

### OCR score capture (`src/ocr.py`)

`scan_score_image()` takes a base64 data-URL frame from the browser camera, crops three regions (score-left, score-right, full) using ROI percentages (defaults in `DEFAULT_ROI_*`), runs EasyOCR on the two score crops, and saves the crops plus a JSON dump under `media/evidence/ocr/`. It only writes the JSON file when the parsed score differs from the last scan (`_last_score`, a module-level global — not safe across multiple worker processes). The EasyOCR `Reader` is cached process-globally. `api_scan_score` calls it, then `service.results.save_scan_result()` attaches the result to a game.

**Side-swap safety (critical invariant):** RoV teams swap blue/red between games, so screen position never identifies a team. The pipeline therefore treats OCR output as two side-agnostic numbers — the `roi_score_left` box is *defined* as the winning side's score and `roi_score_right` as the loser's (the mobile scan page has staff drag labeled green/red boxes onto the numbers, so layout doesn't matter). Team binding is always an explicit human input: the field staff sends a `winnerTeamId` hint with the scan (stored in `raw_ocr_json` as `{"victory", "lose", "winnerTeamId", "ocr"}` — `get_scan_scores()` reads both this and the legacy shape), and the monitor's verification (`set_game_result(..., use_scan_scores=True)` via `useScanScores` in the game-result API) assigns victory-score→chosen winner, lose-score→loser. Never map scan scores to teams positionally in new code.

### React SPA (`frontend/src`)

Two faces behind a `react-router-dom` router in `App.tsx`:

- **Public site (no login)** — `/` (season list, `pages/home-page.tsx`) and `/tournament/:id` (overview/bracket/matches/participants tabs, `pages/tournament-page.tsx`; polls every 8s while the tournament is Live). Components live in `components/public/`, data client in `lib/public-api.ts` (maps `JUNIOR`/`SENIOR` to Thai labels), static event copy (venue/organizer/prizes — not in the DB) in `lib/site-config.ts`. The matches tab shows per-game kill-score chips; clicking a bracket match opens a read-only detail card (`PublicMatchDetail` in `tab-bracket.tsx`).
- **Staff control panel** — `/admin/*`, the only routes that show a login form. Sidebar app in `src/admin/`: `admin-app.tsx` (auth guard + layout), `admin-sidebar.tsx` (nav filtered via `hasRole` — ADMIN implicit everywhere, MONITOR gets matches/scan/bracket, FIELD_STAFF scan/bracket), `admin-login.tsx`, and `pages/` — `admin-dashboard` (cross-season KPIs), `admin-tournaments` (+create season by year / activate), `admin-tournament-manage` (round configs, first-round queue, third-place toggle, generate/reset bracket), `admin-participants` (team table + tabbed create form: team info + player 1–5), `admin-matches` (per-game score entry, winner buttons, status chips, **inline evidence thumbnails**, rows dim when PENDING / glow orange when a scan waits, "รอยืนยัน N" badge on collapsed matches), `admin-users` (ADMIN account management), `admin-scan` (the **mobile scan wizard**: pick game → pick winner → photo (live camera or file) → drag ROI boxes → staged upload/OCR progress → server-confirmed evidence; warns with the old evidence photo if the game was already scanned), `admin-bracket` (bracket canvas; its "scan" button deep-links into `/admin/scan` via router state). `lib/api.ts`: thin `fetch` wrapper (`credentials: "include"`) plus the `ApiState` → `Tournament` mapping (`toTournament`); small per-domain clients sit alongside it (`lib/schools-api.ts`, `lib/users-api.ts`, `lib/scan-info.ts`) and `fetchDashboardStats` lives in `lib/public-api.ts` even though the admin dashboard is its only caller (it hits the no-auth `/api/public/dashboard-stats/` endpoint). `lib/tournament-context.tsx`: React context with state + all mutation functions, plus a 6s background poll that diffs games and toasts other devices' scans/verifies.

Shared frontend pieces to reuse (don't re-implement):

- `components/bracket/bracket-canvas.tsx` — the pan/zoom/fullscreen bracket canvas used by **both** `/admin/bracket` and the public bracket tab (wheel zoom around cursor, two-finger pinch, bottom-right toolbar with fullscreen via the Fullscreen API; admin injects an editable detail panel through `renderDetail`, public injects a read-only one).
- `lib/game-status.ts` — the single source for OCR-status labels/colors (`STATUS_LABEL`, `statusClass`, `needsVerify`, `evidenceUrl`).
- `lib/roles.ts` — `hasRole()` (ADMIN wildcard).
- `components/ui/rolling-number.tsx` — odometer animation for any score that changes under a poll.
- Toast/diff rule: never call `toast()` (or any side effect) inside a `setState` updater — React StrictMode double-invokes updaters (this once caused every poll toast to fire twice). Diff against a ref before setting state, and give toasts stable `id`s.

Path alias `@/*` → `frontend/src/*`; styling is Tailwind v4 via `@tailwindcss/vite` (public-site tokens `brand`/`win`/`lose`/`surface` live alongside the admin theme in `styles/globals.css`).

### Data conventions to preserve

- `db_table` names are fixed by `sciweek.sql` (`schools`, `users`, `tournaments`, `divisions`, `rounds`, `teams`, `team_members`, `matches`, `match_games`).
- `MatchGame` keeps both `ocr_kill_team1/2` (raw OCR/manual entry) and `kill_team1/2` (only populated once verified) — `_serialize_game` prefers the verified value and falls back to the OCR value; keep that precedence in new score-reading code paths.
- API responses always key game winners as the string `"team1"`/`"team2"` (relative to the game's own team1/team2 FK), never a raw team ID.
