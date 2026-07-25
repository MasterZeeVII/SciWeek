"""JSON endpoints for the React SPA.

All endpoints are session-authenticated (see common.auth); auth failures
return JSON errors, never redirects. CSRF middleware is not installed —
the SPA authenticates purely by session cookie.
"""

import json
from datetime import date

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db.models import Max
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from common.auth import require_role, require_user
from common.models import Division, MatchGame, School, SystemUser, Team, TeamMember, Tournament
from ocr import scan_score_image
from service.bracket import division_has_bracket, generate_bracket, reset_division_bracket
from service.results import reject_scan, save_scan_result, set_game_result
from service.tournament import activate_tournament, ensure_default_divisions, upsert_tournament

from .serializers import (
    admin_user_payload,
    dashboard_stats_payload,
    public_tournament_payload,
    public_tournaments_payload,
    state_payload,
    user_payload,
)


def _json_body(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        raise ValidationError("Invalid JSON body.")


def _error(message, status=400):
    if isinstance(message, ValidationError):
        message = "; ".join(message.messages)
    return JsonResponse({"error": str(message)}, status=status)


def api_handler(*methods):
    """Combine method restriction with the shared error-to-JSON mapping."""

    def decorator(view_func):
        @require_http_methods(list(methods))
        def wrapper(request, *args, **kwargs):
            try:
                return view_func(request, *args, **kwargs)
            except PermissionError as exc:
                return _error(exc, status=403)
            except ValidationError as exc:
                return _error(exc)

        return wrapper

    return decorator


LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_SECONDS = 300  # 5 minutes


def _login_attempts_key(username):
    return f"login_attempts:{(username or '').strip().lower()}"


@api_handler("POST")
def api_login(request):
    data = _json_body(request)
    username = data.get("username", "")
    password = data.get("password", "")

    # Simple per-username lockout against brute force / enumeration: no new
    # DB table (no migrations in this repo) — just Django's cache, which
    # defaults to per-process locmem here (see settings.py CACHES). That's
    # enough to blunt a scripted attack against a single admin process; it
    # resets if the process restarts and doesn't share state across workers.
    attempts_key = _login_attempts_key(username)
    attempts = cache.get(attempts_key, 0)
    if attempts >= LOGIN_MAX_ATTEMPTS:
        return _error("Too many failed login attempts. Try again later.", status=429)

    try:
        user = SystemUser.objects.get(username=username, is_active=True)
    except SystemUser.DoesNotExist:
        cache.set(attempts_key, attempts + 1, LOGIN_LOCKOUT_SECONDS)
        return _error("Invalid username or password.", status=401)

    if not user.check_password(password):
        cache.set(attempts_key, attempts + 1, LOGIN_LOCKOUT_SECONDS)
        return _error("Invalid username or password.", status=401)

    cache.delete(attempts_key)
    request.session.cycle_key()
    request.session["user_id"] = user.id
    return JsonResponse({"user": user_payload(user)})


@api_handler("POST")
def api_logout(request):
    request.session.flush()
    return JsonResponse({"ok": True})


@api_handler("GET")
def api_state(request):
    # Full admin payload (rawOcrJson, imagePath, uploaded/verified-by
    # usernames) — only the logged-in admin control panel calls this
    # (frontend/src/lib/tournament-context.tsx via lib/api.ts); the public
    # site uses the separate, sanitized /api/public/... endpoints instead.
    require_user(request)
    return JsonResponse(state_payload(request, request.GET.get("division_id")))


@api_handler("GET")
def api_public_tournaments(request):
    return JsonResponse(public_tournaments_payload())


@api_handler("GET")
def api_public_tournament_detail(request, tournament_id):
    tournament = get_object_or_404(Tournament, id=tournament_id)
    return JsonResponse(public_tournament_payload(tournament))


@api_handler("GET")
def api_public_dashboard_stats(request):
    return JsonResponse(dashboard_stats_payload())


@api_handler("POST")
def api_create_tournament(request):
    require_role(request, SystemUser.Role.ADMIN)
    data = _json_body(request)
    name = data.get("name", "").strip()
    if not name:
        raise ValidationError("Tournament name is required.")
    year = int(data.get("year") or date.today().year)
    upsert_tournament(name, year)
    return JsonResponse(state_payload(request))


@api_handler("POST")
def api_activate_tournament(request, tournament_id):
    require_role(request, SystemUser.Role.ADMIN)
    tournament = get_object_or_404(Tournament, id=tournament_id)
    activate_tournament(tournament)
    ensure_default_divisions(tournament)
    return JsonResponse(state_payload(request))


@api_handler("GET")
def api_schools(request):
    require_role(request, SystemUser.Role.ADMIN)
    schools = School.objects.order_by("name")
    return JsonResponse({"schools": [{"id": s.id, "name": s.name} for s in schools]})


@api_handler("POST")
def api_add_team(request, division_id):
    require_role(request, SystemUser.Role.ADMIN)
    division = get_object_or_404(Division, id=division_id)
    if division_has_bracket(division):
        raise ValidationError("Reset the bracket before changing teams.")
    data = _json_body(request)
    name = data.get("name", "").strip()
    if not name:
        raise ValidationError("Team name is required.")
    school, _created = School.objects.get_or_create(name=name)
    max_number = (
        Team.objects.filter(division=division, school=school).aggregate(Max("team_number"))[
            "team_number__max"
        ]
        or 0
    )
    team = Team.objects.create(
        division=division,
        school=school,
        team_number=max_number + 1,
    )
    _replace_members(team, data.get("members", []))
    return JsonResponse(state_payload(request, division.id))


@api_handler("POST", "DELETE")
def api_team_detail(request, team_id):
    require_role(request, SystemUser.Role.ADMIN)
    team = get_object_or_404(Team.objects.select_related("division"), id=team_id)
    division = team.division
    if division_has_bracket(division):
        raise ValidationError("Reset the bracket before changing teams.")

    if request.method == "DELETE":
        team.delete()
        return JsonResponse(state_payload(request, division.id))

    data = _json_body(request)
    name = data.get("name", "").strip()
    if not name:
        raise ValidationError("Team name is required.")
    school, _created = School.objects.get_or_create(name=name)
    team.school = school
    team.save(update_fields=["school"])
    _replace_members(team, data.get("members", []))
    return JsonResponse(state_payload(request, division.id))


def _replace_members(team, members):
    if len(members) > 5:
        raise ValidationError("A team can have at most 5 members.")
    team.members.all().delete()
    for member in members:
        name = (member.get("name") or "").strip()
        if not name:
            continue
        TeamMember.objects.create(
            team=team,
            full_name=name,
            in_game_name=(member.get("inGameName") or "").strip() or None,
        )


@api_handler("POST")
def api_generate_bracket(request, division_id):
    require_role(request, SystemUser.Role.ADMIN)
    division = get_object_or_404(Division, id=division_id)
    data = _json_body(request)
    generate_bracket(
        division,
        team_ids=data.get("teamOrder") or None,
        round_configs=data.get("roundConfigs") or None,
        randomize=bool(data.get("randomize")),
        third_place=bool(data.get("thirdPlace")),
    )
    return JsonResponse(state_payload(request, division.id))


@api_handler("POST")
def api_reset_bracket(request, division_id):
    require_role(request, SystemUser.Role.ADMIN)
    division = get_object_or_404(Division, id=division_id)
    reset_division_bracket(division)
    return JsonResponse(state_payload(request, division.id))


def _require_active_tournament(game):
    """IDOR guard: reject mutating a game whose season isn't the currently
    active tournament. Nothing else in the codebase already enforces an
    "acting on the active tournament" invariant (checked — grep for
    is_active turns up only activation/status-display code), so this is a
    new, deliberately simple rule: editing a past season is only possible
    by reactivating it first (POST /api/tournaments/<id>/activate/), which
    flips is_active back on. Applies to every role, including ADMIN —
    reactivation is exactly the intended door for editing historical data,
    so there's no role that should be able to skip it."""
    tournament = game.match.round.division.tournament
    if not tournament.is_active:
        raise ValidationError(
            "This match belongs to a season that isn't active. Reactivate that season first."
        )


@api_handler("POST")
def api_game_result(request, game_id):
    user = require_role(request, SystemUser.Role.ADMIN, SystemUser.Role.MONITOR)
    game = get_object_or_404(
        MatchGame.objects.select_related("match__round__division__tournament"), id=game_id
    )
    _require_active_tournament(game)
    data = _json_body(request)
    winner = data.get("winner")
    if winner == "team1":
        winner_team_id = game.team1_id
    elif winner == "team2":
        winner_team_id = game.team2_id
    elif winner in (None, ""):
        winner_team_id = None
    else:
        raise ValidationError("Winner must be team1, team2, or null.")

    set_game_result(
        game,
        user,
        winner_team_id,
        data.get("team1Score"),
        data.get("team2Score"),
        use_scan_scores=bool(data.get("useScanScores")),
    )
    return JsonResponse(state_payload(request, game.match.round.division_id))


@api_handler("POST")
def api_reject_game(request, game_id):
    user = require_role(request, SystemUser.Role.ADMIN, SystemUser.Role.MONITOR)
    game = get_object_or_404(
        MatchGame.objects.select_related("match__round__division__tournament"), id=game_id
    )
    _require_active_tournament(game)
    data = _json_body(request)
    reject_scan(game, user, data.get("reason", ""))
    return JsonResponse(state_payload(request, game.match.round.division_id))


@api_handler("POST")
def api_scan_score(request):
    user = require_role(
        request,
        SystemUser.Role.ADMIN,
        SystemUser.Role.MONITOR,
        SystemUser.Role.FIELD_STAFF,
    )
    data = _json_body(request)
    image_data = data.get("image")
    if not image_data:
        raise ValidationError("No image data.")

    result = scan_score_image(
        image_data,
        roi_score_left=data.get("roi_score_left"),
        roi_score_right=data.get("roi_score_right"),
        roi_full=data.get("roi_full"),
    )

    game_id = data.get("gameId") or data.get("game_id")
    state = None
    if game_id:
        game = get_object_or_404(
            MatchGame.objects.select_related("match__round__division__tournament"),
            id=game_id,
        )
        _require_active_tournament(game)
        save_scan_result(game, user, result, winner_team_id=data.get("winnerTeamId"))
        state = state_payload(request, game.match.round.division_id)

    return JsonResponse(
        {
            "success": True,
            "result": {"Score": {"Victory": result.victory, "Lose": result.lose}},
            "evidence_full": result.evidence_full,
            "state": state,
        }
    )


MIN_PASSWORD_LENGTH = 6


def _users_payload():
    return {"users": [admin_user_payload(u) for u in SystemUser.objects.order_by("username")]}


@api_handler("GET", "POST")
def api_users(request):
    require_role(request, SystemUser.Role.ADMIN)

    if request.method == "POST":
        data = _json_body(request)
        username = data.get("username", "").strip()
        password = data.get("password", "")
        role = data.get("role", "")

        if not username:
            raise ValidationError("Username is required.")
        if SystemUser.objects.filter(username=username).exists():
            raise ValidationError("Username is already taken.")
        if role not in SystemUser.Role.values:
            raise ValidationError("Invalid role.")
        if len(password) < MIN_PASSWORD_LENGTH:
            raise ValidationError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")

        user = SystemUser(username=username, role=role, is_active=True)
        user.set_password(password)
        user.save()

    return JsonResponse(_users_payload())


@api_handler("POST", "DELETE")
def api_user_detail(request, user_id):
    current = require_role(request, SystemUser.Role.ADMIN)
    target = get_object_or_404(SystemUser, id=user_id)

    if request.method == "DELETE":
        if target.id == current.id:
            raise ValidationError("You cannot delete your own account.")
        target.delete()
        return JsonResponse(_users_payload())

    data = _json_body(request)
    if "role" in data:
        role = data["role"]
        if role not in SystemUser.Role.values:
            raise ValidationError("Invalid role.")
        if target.id == current.id and role != SystemUser.Role.ADMIN:
            raise ValidationError("You cannot change your own role.")
        target.role = role
    if "isActive" in data:
        is_active = bool(data["isActive"])
        if target.id == current.id and not is_active:
            raise ValidationError("You cannot deactivate your own account.")
        target.is_active = is_active
    password = data.get("password")
    if password:
        if len(password) < MIN_PASSWORD_LENGTH:
            raise ValidationError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
        target.set_password(password)
    target.save()

    return JsonResponse(_users_payload())
