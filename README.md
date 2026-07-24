# NSRU E-Sport SCIWEEK

Django JSON API + React frontend for running a single-elimination e-sport tournament, backed by a hand-maintained MySQL schema (`sciweek.sql`).

Two runtimes, one entry point each:
- **Backend** — `manage.py` (Python/Django). Think of it like a `mvn`/`gradle` CLI: one script, many subcommands.
- **Frontend** — `npm` inside `frontend/` (React/Vite SPA — the only UI, no server-rendered pages).

## Quick start (first time setup)

Run these in order, from the repo root.

```powershell
# 1. Python virtual env + backend dependencies
python -m venv env
.\env\Scripts\python.exe -m pip install -r requirements.txt

# 2. Configure the database connection
Copy-Item .env.example .env
notepad .env          # fill in DB_USER / DB_PASSWORD (see "Database" below)

# 3. Create Django's own session table (does NOT touch the tournament data — see "Database")
.\env\Scripts\python.exe manage.py migrate

# 4. Create your first login (role = ADMIN)
.\env\Scripts\python.exe manage.py create_admin --username admin --password <password>

# 5. Frontend dependencies
npm.cmd --prefix frontend install

# 6. Run both dev servers (two terminals — Django must stay running)
.\env\Scripts\python.exe manage.py runserver 0.0.0.0:8000
npm.cmd --prefix frontend run dev
```

Open `http://127.0.0.1:5173/` — that's the app. `/admin` is the staff login; everything else is the public site.

A fresh database only has the schools from `sciweek.sql` plus the admin login you just made. Tournaments, teams, brackets, and scores are all created afterwards through the web UI — nothing else to seed.

## Project structure

```
manage.py            Backend entry point — like `mvn`/`gradle`, one CLI for everything Django-side
sciweek.sql           The database schema + data dump — source of truth, no Django migrations
src/
  config/             Django settings, root urls, wsgi/asgi
  common/             Models (mirror sciweek.sql), session auth, management commands
  service/            Business logic: bracket generation, results, advancement
  api/                JSON endpoints + payload serializers for the React app
  ocr.py              Camera score OCR (finetuned — do not edit casually)
frontend/             React/Vite SPA (the only UI)
  src/pages/          Public site (no login): season list + tournament view
  src/admin/          Staff panel at /admin (login required)
paper/                Unrelated: Thai thesis chapter 3 write-up generator, not part of the running app
media/                Uploaded evidence images
```

## Database

The app defaults to MySQL/MariaDB at `192.168.1.37`. Copy `.env.example` to `.env` and fill in the credentials:

```powershell
Copy-Item .env.example .env
notepad .env
```

Create the database itself by importing `sciweek.sql` (phpMyAdmin, or `mysql < sciweek.sql`). **This schema is maintained by hand** — there are no Django migrations for it, and you must never run `manage.py makemigrations`. `manage.py migrate` only sets up Django's own session table; it does not touch `sciweek.sql`'s tables.

## Backend commands

All run as `.\env\Scripts\python.exe manage.py <command>` from the repo root.

| Command | What it does |
|---|---|
| `runserver 0.0.0.0:8000` | Start the dev server, visible on your LAN |
| `check` | Validate settings/models without starting a server |
| `build` | **One command that builds the frontend too** — runs `npm ci` + `npm run build` inside `frontend/`, output lands in `frontend/dist`. Add `--skip-install` to skip the `npm ci` step and just rebuild. This is the prep step for packaging into Docker. |
| `create_admin --username admin --password <pw>` | Create or update a staff login with the ADMIN role |
| `wipe_data --teams --yes` | Delete brackets + all teams (dry-run without `--yes`) — see below |

There is no automated test suite in this repo currently.

### `wipe_data` in detail

Dry-run by default (prints what it would delete); add `--yes` to actually delete.

```powershell
.\env\Scripts\python.exe manage.py wipe_data --brackets --yes        # rounds/matches/games only, teams stay
.\env\Scripts\python.exe manage.py wipe_data --teams --yes           # brackets + all teams
.\env\Scripts\python.exe manage.py wipe_data --tournaments --yes     # every tournament (divisions cascade)
.\env\Scripts\python.exe manage.py wipe_data --tournaments --schools --users --yes   # full reset
.\env\Scripts\python.exe manage.py wipe_data --users --keep-user admin --yes         # wipe logins, keep one
```

After wiping users, recreate a login with `create_admin` (above).

## Frontend

```powershell
npm.cmd --prefix frontend install
npm.cmd --prefix frontend run dev      # http://127.0.0.1:5173/  — proxies /api and /media to Django on :8000
npm.cmd --prefix frontend run build    # type-check (tsc --noEmit) + production build to frontend/dist
```

Django must already be running whenever the Vite dev server is used — the SPA has no mock/standalone mode. (`manage.py build` above does the install + build in one step, from the Django side, for when you don't want to touch `npm` directly.)

Routes: `/` public season list, `/tournament/<id>` public bracket/results, `/admin` staff panel (dashboard, tournaments, participants, matches, scan, bracket, users).

### Features

- Public site at `/` — season list, bracket, matches, participants; no login.
- Staff panel at `/admin` — login against the schema `users` table (ADMIN / MONITOR / FIELD_STAFF roles), season create/activate per year, team + player entry, per-round best-of, optional third-place match.
- Staff account management at `/admin/users` (ADMIN only) — create, edit, and deactivate/delete staff logins from the browser.
- Single-elimination bracket generation for 2, 4, 8, 16, or 32 teams, with a named `rounds` table (per-round name and best-of).
- Mobile score scanning at `/admin/scan`: photo of the player's phone, draggable ROI boxes (winner/loser score), OCR + evidence image, monitor verify workflow. Side-swap safe: scores bind to the team a human picks at verification, never to a screen side.
- Automatic match completion and winner advancement after verified game wins.

### Managing staff accounts (`/admin/users`)

Only logged-in ADMIN users see the "ผู้ใช้งาน" (Users) link in the sidebar and can reach `/admin/users` — MONITOR and FIELD_STAFF accounts don't get the nav item, and the API rejects their requests with 403 even if they navigate there directly.

From that page an admin can:

- **Add a user** — "เพิ่มผู้ใช้งานใหม่" opens a form for username, password (min. 6 characters), and role (ADMIN / MONITOR / FIELD_STAFF). New accounts start active.
- **Edit a user** — change role, active/inactive status, or reset the password (leave the password field blank to keep the current one).
- **Deactivate or delete a user** — deactivated accounts (`is_active = false`) can no longer log in but keep their history (uploaded/verified scores stay attributed to them); deleting removes the row outright.
- **Self-protection** — an admin can't delete their own account, deactivate it, or change their own role away from ADMIN, so there's no way to lock yourself out through the UI.

This is a thin layer over the same `create_admin` management command path (`SystemUser.set_password`/`check_password`, Django's password hasher) — use `create_admin` from the shell if you ever need to recover access without a working ADMIN session.

## OCR scanner (optional)

OCR dependencies are optional because they are heavier than the core app:

```powershell
.\env\Scripts\python.exe -m pip install -r requirements-ocr.txt
```

This pulls in easyocr's default (CPU-only) torch/torchvision. If the machine has an NVIDIA GPU, install the matching CUDA build afterwards instead — it is dramatically faster (EasyOCR's detector+recognizer run on the GPU):

```powershell
.\env\Scripts\python.exe -m pip install torch==2.11.0+cu128 torchvision==0.26.0+cu128 --index-url https://download.pytorch.org/whl/cu128
```

Match `cu128` and the pinned versions to whatever CUDA build is current for your driver (check with `pip index versions torch --index-url https://download.pytorch.org/whl/cuXXX`). `src/ocr.py` reads GPU vs CPU from a single `easyocr.Reader(..., gpu=True/False)` flag — flip it to `False` if you ever run this on a CPU-only machine again.

The scan page (`/admin/scan`) sends the photo plus the two operator-placed ROI boxes (winner score / loser score) and the field staff's winner pick to `POST /api/scan/`; evidence is saved under `media/evidence/ocr/`.

Live camera preview needs HTTPS (browser rule). Over plain-http LAN the "เลือกรูป" button uses the phone's native camera app instead, which works fine. For live preview, tunnel the Vite frontend:

```powershell
.\env\Scripts\python.exe manage.py runserver 127.0.0.1:8000
npm.cmd --prefix frontend run dev
ngrok http 5173
```

## Notes

- The schema has no bracket-slot table, so the generator accepts only power-of-two team counts. Round 1 gets concrete `match_games`; later rounds receive their games only after both feeder matches are completed and verified.
- Every match belongs to a row in `rounds` (`round_number`, `round_name`, `best_of`); best-of is configured per round, not per match.
- **Docker packaging is not set up yet.** `manage.py build` produces `frontend/dist`, but nothing serves those files in production yet (Django currently only serves `/api/` and `/media/`) — that wiring is the next step before a Dockerfile makes sense.
