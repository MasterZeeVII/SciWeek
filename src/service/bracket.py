"""Single-elimination bracket generation on top of the rounds table.

Every match belongs to a Round row (which carries round_number, round_name,
and best_of for that whole round). Round 1 matches get concrete MatchGame
rows immediately; later rounds receive games only when both feeder matches
have a decided winner (see service.results.try_create_next_match_games).
"""

from math import log2
import random

from django.core.exceptions import ValidationError
from django.db import transaction

from common.models import Match, MatchGame, Round


POWER_OF_TWO_SIZES = {2, 4, 8, 16, 32}


def division_matches(division):
    return Match.objects.filter(round__division=division)


def division_has_bracket(division):
    return division.rounds.exists()


def _validate_best_of(value):
    try:
        best_of = int(value)
    except (TypeError, ValueError):
        raise ValidationError("Best of must be a number.")
    if best_of < 1 or best_of > 7 or best_of % 2 == 0:
        raise ValidationError("Best of must be an odd number from 1 to 7.")
    return best_of


def _ordered_teams(division, team_ids=None, randomize=False):
    if team_ids is None:
        teams = list(
            division.teams.select_related("school").order_by("school__name", "team_number")
        )
    else:
        team_ids = [int(team_id) for team_id in team_ids]
        if len(team_ids) != len(set(team_ids)):
            raise ValidationError("Team queue contains duplicate teams.")
        teams_by_id = {
            team.id: team
            for team in division.teams.select_related("school").filter(id__in=team_ids)
        }
        if len(teams_by_id) != len(team_ids) or len(teams_by_id) != division.teams.count():
            raise ValidationError("Team queue must include every team in this division.")
        teams = [teams_by_id[team_id] for team_id in team_ids]

    if randomize:
        random.shuffle(teams)
    return teams


def default_round_name(round_number, total_rounds):
    if round_number == total_rounds:
        return "Final"
    if round_number == total_rounds - 1:
        return "Semifinal"
    return f"Round {round_number}"


def is_third_place_match(match):
    """The third-place decider is match 2 of the last round: it has no
    next_match and no feeder pointers (semifinal losers meet there)."""
    if match.match_number != 2:
        return False
    last_round_number = (
        match.round.division.rounds.order_by("-round_number")
        .values_list("round_number", flat=True)
        .first()
    )
    if match.round.round_number != last_round_number:
        return False
    return not match.previous_matches.exists()


def generate_bracket(
    division, team_ids=None, round_configs=None, randomize=False, third_place=False
):
    """Create rounds, matches, and round-1 games from an ordered team queue.

    round_configs is a list of {"round": n, "bestOf": n, "name": str} dicts
    (the shape the frontend sends); missing rounds fall back to the division
    default best_of and a default name.

    third_place=True adds a third-place decider as match 2 of the final
    round; its games are created from the semifinal losers once both
    semifinals are decided (see service.results).
    """
    teams = _ordered_teams(division, team_ids=team_ids, randomize=randomize)
    team_count = len(teams)
    if team_count not in POWER_OF_TWO_SIZES:
        raise ValidationError("Team count must be 2, 4, 8, 16, or 32.")
    if team_count > division.max_teams:
        raise ValidationError(f"This division allows at most {division.max_teams} teams.")
    if division_has_bracket(division):
        raise ValidationError("This division already has a bracket. Reset it first.")

    total_rounds = int(log2(team_count))
    if third_place and total_rounds < 2:
        raise ValidationError("A third-place match needs at least 4 teams.")
    configs_by_number = {}
    for config in round_configs or []:
        try:
            configs_by_number[int(config["round"])] = config
        except (KeyError, TypeError, ValueError):
            raise ValidationError("Each round config needs a round number.")

    with transaction.atomic():
        rounds_by_number = {}
        for round_number in range(1, total_rounds + 1):
            config = configs_by_number.get(round_number, {})
            best_of = _validate_best_of(config.get("bestOf", division.default_best_of))
            name = (config.get("name") or "").strip()[:50]
            rounds_by_number[round_number] = Round.objects.create(
                division=division,
                round_number=round_number,
                round_name=name or default_round_name(round_number, total_rounds),
                best_of=best_of,
            )

        matches_by_round = {}
        for round_number in range(1, total_rounds + 1):
            count = team_count // (2**round_number)
            matches_by_round[round_number] = [
                Match.objects.create(
                    round=rounds_by_number[round_number],
                    match_number=match_number,
                )
                for match_number in range(1, count + 1)
            ]

        for round_number in range(1, total_rounds):
            for match in matches_by_round[round_number]:
                next_index = (match.match_number + 1) // 2
                match.next_match = matches_by_round[round_number + 1][next_index - 1]
                match.save(update_fields=["next_match"])

        if third_place:
            matches_by_round[total_rounds].append(
                Match.objects.create(
                    round=rounds_by_number[total_rounds],
                    match_number=2,
                )
            )

        for index, match in enumerate(matches_by_round[1]):
            create_games_for_match(match, teams[index * 2], teams[index * 2 + 1])

    return matches_by_round


def reset_division_bracket(division):
    with transaction.atomic():
        division.rounds.all().delete()


def create_games_for_match(match, team1, team2):
    division_id = match.round.division_id
    if team1.division_id != division_id or team2.division_id != division_id:
        raise ValidationError("Both teams must belong to the match division.")
    if match.games.exists():
        return
    MatchGame.objects.bulk_create(
        [
            MatchGame(match=match, team1=team1, team2=team2, game_number=game_number)
            for game_number in range(1, match.round.best_of + 1)
        ]
    )
