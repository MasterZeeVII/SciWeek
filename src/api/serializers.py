"""Builders for the JSON payloads the React SPA consumes.

Every mutation endpoint returns the same state_payload() shape so the
client can treat any response as a full state refresh.

Conventions the frontend relies on:
- game winners are keyed "team1"/"team2" relative to the game's own FKs,
  never a raw team id.
- game scores prefer the verified kill_team* value and fall back to the
  raw ocr_kill_team* value.
"""

from collections import Counter

from django.shortcuts import get_object_or_404

from common.auth import get_current_user
from common.models import Division, Match, MatchGame, School, Tournament
from service.bracket import default_round_name, division_has_bracket, is_third_place_match
from service.results import get_match_loser, get_match_participants, get_match_winner


def user_payload(user):
    if not user:
        return None
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
    }


def admin_user_payload(user):
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "isActive": user.is_active,
        "createdAt": user.created_at,
    }


def team_name(team):
    suffix = f" #{team.team_number}" if team.team_number > 1 else ""
    return f"{team.school.name}{suffix}"


def _seed_map(division):
    first_round_games = (
        MatchGame.objects.filter(
            match__round__division=division,
            match__round__round_number=1,
        )
        .select_related("team1__school", "team2__school")
        .order_by("match__match_number", "game_number")
    )
    ordered_team_ids = []
    for game in first_round_games:
        if game.team1_id not in ordered_team_ids:
            ordered_team_ids.append(game.team1_id)
        if game.team2_id not in ordered_team_ids:
            ordered_team_ids.append(game.team2_id)

    if not ordered_team_ids:
        ordered_team_ids = list(
            division.teams.select_related("school")
            .order_by("school__name", "team_number")
            .values_list("id", flat=True)
        )

    return {team_id: index + 1 for index, team_id in enumerate(ordered_team_ids)}


def _serialize_team(team, seed=None):
    return {
        "id": str(team.id),
        "name": team_name(team),
        "schoolId": team.school_id,
        "teamNumber": team.team_number,
        "seed": seed or 0,
        "members": [
            {
                "id": str(member.id),
                "name": member.full_name,
                "inGameName": member.in_game_name,
            }
            for member in team.members.all()
        ],
    }


def _serialize_game(game):
    winner = None
    if game.winner_team_id == game.team1_id:
        winner = "team1"
    elif game.winner_team_id == game.team2_id:
        winner = "team2"

    team1_score = game.kill_team1 if game.kill_team1 is not None else game.ocr_kill_team1
    team2_score = game.kill_team2 if game.kill_team2 is not None else game.ocr_kill_team2
    return {
        "id": game.id,
        "number": game.game_number,
        "winner": winner,
        "team1Score": team1_score,
        "team2Score": team2_score,
        "ocrStatus": game.ocr_status,
        "imagePath": game.image_path,
        "uploadedBy": user_payload(game.uploaded_by),
        "uploadedAt": game.uploaded_at,
        "verifiedBy": user_payload(game.verified_by),
        "verifiedAt": game.verified_at,
        "rejectReason": game.reject_reason,
        "rawOcrJson": game.raw_ocr_json,
    }


def _serialize_match(match, seed_by_team):
    team1, team2 = get_match_participants(match)
    winner = get_match_winner(match)
    return {
        "id": str(match.id),
        "round": match.round.round_number,
        "position": match.match_number - 1,
        "status": match.status,
        "bestOf": match.round.best_of,
        "winnerTeamId": str(winner.id) if winner else None,
        "team1": _serialize_team(team1, seed_by_team.get(team1.id)) if team1 else None,
        "team2": _serialize_team(team2, seed_by_team.get(team2.id)) if team2 else None,
        "games": [_serialize_game(game) for game in match.games.all()],
    }


def _round_configs(division):
    rounds = list(division.rounds.order_by("round_number"))
    if rounds:
        return [
            {
                "round": entry.round_number,
                "bestOf": entry.best_of,
                "name": entry.round_name or default_round_name(
                    entry.round_number, len(rounds)
                ),
            }
            for entry in rounds
        ]

    # No bracket yet: suggest defaults so the setup screen has something
    # to edit (final bo7, semifinal bo5, everything else the division default).
    team_count = division.teams.count()
    if team_count not in {2, 4, 8, 16, 32}:
        return []

    total_rounds = team_count.bit_length() - 1
    configs = []
    for round_number in range(1, total_rounds + 1):
        best_of = division.default_best_of
        if round_number == total_rounds:
            best_of = 7
        elif round_number == total_rounds - 1:
            best_of = 5
        configs.append(
            {
                "round": round_number,
                "bestOf": best_of,
                "name": default_round_name(round_number, total_rounds),
            }
        )
    return configs


def _division_payload(division):
    seed_by_team = _seed_map(division)
    teams = (
        division.teams.select_related("school")
        .prefetch_related("members")
        .order_by("school__name", "team_number")
    )
    ordered_teams = sorted(teams, key=lambda team: seed_by_team.get(team.id, 9999))
    matches = (
        Match.objects.filter(round__division=division)
        .select_related("round")
        .prefetch_related(
            "games__team1__school",
            "games__team1__members",
            "games__team2__school",
            "games__team2__members",
            "games__uploaded_by",
            "games__verified_by",
        )
        .order_by("round__round_number", "match_number")
    )
    return {
        "id": division.id,
        "level": division.level,
        "levelLabel": division.get_level_display(),
        "maxTeams": division.max_teams,
        "defaultBestOf": division.default_best_of,
        "teams": [_serialize_team(team, seed_by_team.get(team.id)) for team in ordered_teams],
        "matches": [_serialize_match(match, seed_by_team) for match in matches],
        "roundConfigs": _round_configs(division),
        "hasBracket": division_has_bracket(division),
    }


def _last_round(division):
    # division.rounds.all() (not .order_by().first()) so this uses the
    # prefetch cache when the caller already loaded
    # divisions__rounds__matches__... (dashboard_stats_payload's hall-of-fame
    # loop does) instead of issuing a fresh query per division every time.
    rounds = list(division.rounds.all())
    if not rounds:
        return None
    return max(rounds, key=lambda round_: round_.round_number)


def _final_match(division):
    last_round = _last_round(division)
    if not last_round:
        return None
    for match in last_round.matches.all():
        if match.match_number == 1:
            return match
    return None


def _third_place_match(division):
    last_round = _last_round(division)
    if not last_round:
        return None
    match = None
    for candidate in last_round.matches.all():
        if candidate.match_number == 2:
            match = candidate
            break
    if match and not match.previous_matches.exists():
        return match
    return None


def _public_match(match):
    team1, team2 = get_match_participants(match)
    winner = get_match_winner(match)
    wins1 = wins2 = 0
    has_games = False
    games = []
    for game in match.games.all():
        has_games = True
        if game.ocr_status != MatchGame.OcrStatus.VERIFIED or not game.winner_team_id:
            continue
        if game.winner_team_id == game.team1_id:
            wins1 += 1
        elif game.winner_team_id == game.team2_id:
            wins2 += 1
        else:
            continue
        # Verified per-game kill scores for spectators; "team1"/"team2"
        # keys are relative to the game's own FKs, same as the admin API.
        games.append(
            {
                "number": game.game_number,
                "winner": "team1" if game.winner_team_id == game.team1_id else "team2",
                "kills1": game.kill_team1,
                "kills2": game.kill_team2,
            }
        )
    return {
        "id": str(match.id),
        "matchNumber": match.match_number,
        "status": match.status,
        "bestOf": match.round.best_of,
        "team1": team_name(team1) if team1 else None,
        "team2": team_name(team2) if team2 else None,
        "score1": wins1 if has_games else None,
        "score2": wins2 if has_games else None,
        "winner": team_name(winner) if winner else None,
        "isThirdPlace": is_third_place_match(match),
        "games": games,
    }


def _public_stage(division, stage_id):
    rounds = list(division.rounds.order_by("round_number"))
    matches = (
        Match.objects.filter(round__division=division)
        .select_related("round")
        .prefetch_related("games__team1__school", "games__team2__school")
        .order_by("round__round_number", "match_number")
    )
    matches_by_round = {}
    for match in matches:
        matches_by_round.setdefault(match.round.round_number, []).append(match)

    final = _final_match(division)
    champion = get_match_winner(final) if final else None
    if champion:
        status = "completed"
    elif rounds:
        status = "ongoing"
    else:
        status = "upcoming"

    return {
        "id": stage_id,
        "divisionId": division.id,
        "level": division.level,
        "name": division.get_level_display(),
        "type": "Single Elimination",
        "slots": division.teams.count(),
        "status": status,
        "rounds": [
            {
                "name": entry.round_name or default_round_name(entry.round_number, len(rounds)),
                "matches": [
                    _public_match(match)
                    for match in matches_by_round.get(entry.round_number, [])
                ],
            }
            for entry in rounds
        ],
    }


def _public_standing(division):
    final = _final_match(division)
    champion = get_match_winner(final) if final else None
    # Thread champion through as the precomputed winner so get_match_loser
    # doesn't call get_match_winner(final) a second time.
    runner_up = get_match_loser(final, champion) if final else None
    third_match = _third_place_match(division)
    third = get_match_winner(third_match) if third_match else None
    return {
        "level": division.level,
        "first": team_name(champion) if champion else None,
        "second": team_name(runner_up) if runner_up else None,
        "third": team_name(third) if third else None,
    }


def public_tournaments_payload():
    """Season list for the public site — no auth, read-only."""
    items = []
    for tournament in Tournament.objects.order_by("-year"):
        divisions = list(tournament.divisions.order_by("level"))
        team_count = 0
        champions = []
        for division in divisions:
            team_count += division.teams.count()
            final = _final_match(division)
            champion = get_match_winner(final) if final else None
            if champion:
                champions.append({"level": division.level, "team": team_name(champion)})
        items.append(
            {
                "id": str(tournament.id),
                "name": f"{tournament.name} {tournament.year}",
                "year": tournament.year,
                "status": "Live" if tournament.is_active else "Past",
                "teamCount": team_count,
                "champions": champions,
            }
        )
    return {"tournaments": items}


def dashboard_stats_payload():
    """Cross-season aggregate stats for the admin dashboard.

    Computed server-side in a handful of queries instead of the frontend
    fetching every season's full bracket detail (stages/rounds/matches)
    just to count things — that N+1 fan-out is what made the dashboard
    slow to load compared to every other admin page."""
    total_matches = Match.objects.count()
    school_count = School.objects.filter(teams__isnull=False).distinct().count()

    matches = Match.objects.select_related("round").prefetch_related(
        "games__team1__school", "games__team2__school"
    )
    win_counts = Counter()
    for match in matches:
        winner = get_match_winner(match)
        if winner:
            win_counts[winner.school.name] += 1

    top_schools = [{"name": name, "wins": wins} for name, wins in win_counts.most_common(8)]

    # Championship history: which school won which division final in which
    # year, across every season on record — this is what lets the "hall of
    # fame" panel call out a school that has taken a title every year.
    all_years = set()
    years_by_school = {}
    for tournament in Tournament.objects.prefetch_related("divisions__rounds__matches__games__team1__school",
                                                            "divisions__rounds__matches__games__team2__school"):
        all_years.add(tournament.year)
        for division in tournament.divisions.all():
            final = _final_match(division)
            champion = get_match_winner(final) if final else None
            if not champion:
                continue
            years_by_school.setdefault(champion.school.name, set()).add(tournament.year)

    total_seasons = len(all_years)
    hall_of_fame = [
        {
            "school": name,
            "titles": len(years),
            "years": sorted(years),
            "everySeason": total_seasons > 0 and len(years) == total_seasons,
        }
        for name, years in years_by_school.items()
    ]
    hall_of_fame.sort(key=lambda entry: (-entry["titles"], entry["school"]))

    return {
        "totalMatches": total_matches,
        "schoolCount": school_count,
        "topSchools": top_schools,
        "totalSeasons": total_seasons,
        "hallOfFame": hall_of_fame,
    }


def public_tournament_payload(tournament):
    """Full public detail: divisions as bracket stages plus participants."""
    divisions = list(tournament.divisions.order_by("level"))
    participants = []
    for division in divisions:
        teams = division.teams.select_related("school").order_by("school__name", "team_number")
        for team in teams:
            participants.append(
                {
                    "id": str(team.id),
                    "name": team_name(team),
                    "school": team.school.name,
                    "level": division.level,
                }
            )
    stages = [
        _public_stage(division, index)
        for index, division in enumerate(divisions, start=1)
    ]
    return {
        "id": str(tournament.id),
        "name": f"{tournament.name} {tournament.year}",
        "year": tournament.year,
        "status": "Live" if tournament.is_active else "Past",
        "teamCount": len(participants),
        "playersPerTeam": 5,
        "stages": stages,
        "participants": participants,
        "standings": [_public_standing(division) for division in divisions],
    }


def state_payload(request, division_id=None):
    user = get_current_user(request)
    tournament = Tournament.objects.filter(is_active=True).first()
    payload = {
        "user": user_payload(user),
        "tournament": None,
        "divisions": [],
        "division": None,
    }
    if not tournament:
        return payload

    # No get_or_create here — this is a GET and must stay a pure read.
    # Default divisions are created at the point a tournament becomes
    # active (service.tournament.upsert_tournament / the activate endpoint
    # both already call ensure_default_divisions()), not lazily on every
    # poll of every connected device.
    divisions = list(tournament.divisions.order_by("level"))
    selected_division = None
    if division_id:
        selected_division = get_object_or_404(Division, id=division_id, tournament=tournament)
    elif divisions:
        selected_division = divisions[0]

    payload["tournament"] = {
        "id": str(tournament.id),
        "name": f"{tournament.name} {tournament.year}",
        "year": tournament.year,
        "status": (
            "in-progress"
            if selected_division and division_has_bracket(selected_division)
            else "setup"
        ),
    }
    payload["divisions"] = [
        {
            "id": division.id,
            "level": division.level,
            "levelLabel": division.get_level_display(),
            "teamCount": division.teams.count(),
            "hasBracket": division_has_bracket(division),
        }
        for division in divisions
    ]
    if selected_division:
        payload["division"] = _division_payload(selected_division)
    return payload
