"""Game results, match status, and winner advancement.

refresh_match_status() is the single place that recomputes a Match.status
and triggers next-round game creation — call it after any game mutation
instead of setting match.status directly.
"""

from collections import Counter

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from common.models import Match, MatchGame, Team

from .bracket import create_games_for_match, is_third_place_match


def get_match_winner(match):
    needed = (match.round.best_of // 2) + 1
    verified_games = match.games.filter(
        ocr_status=MatchGame.OcrStatus.VERIFIED,
        winner_team__isnull=False,
    )
    counts = Counter(game.winner_team_id for game in verified_games)
    for team_id, wins in counts.items():
        if wins >= needed:
            return Team.objects.select_related("school").get(id=team_id)
    return None


def get_match_loser(match):
    winner = get_match_winner(match)
    if not winner:
        return None
    team1, team2 = get_match_participants(match)
    if not team1 or not team2:
        return None
    return team2 if winner.id == team1.id else team1


def _semifinal_matches(final_round_match):
    return list(
        Match.objects.filter(
            round__division=final_round_match.round.division,
            round__round_number=final_round_match.round.round_number - 1,
        )
        .select_related("round")
        .order_by("match_number")
    )


def get_match_participants(match):
    first_game = (
        match.games.select_related("team1__school", "team2__school")
        .order_by("game_number")
        .first()
    )
    if first_game:
        return first_game.team1, first_game.team2

    feeders = list(match.previous_matches.select_related("round").order_by("match_number"))
    if len(feeders) == 2:
        return get_match_winner(feeders[0]), get_match_winner(feeders[1])

    if is_third_place_match(match):
        semis = _semifinal_matches(match)
        if len(semis) == 2:
            return get_match_loser(semis[0]), get_match_loser(semis[1])
    return None, None


def _normalize_score(value):
    if value in (None, ""):
        return None
    try:
        score = int(value)
    except (TypeError, ValueError):
        raise ValidationError("Score must be a number.")
    if score < 0 or score > 65535:
        raise ValidationError("Score must be between 0 and 65535.")
    return score


def set_game_result(
    game, user, winner_team_id, team1_score=None, team2_score=None, use_scan_scores=False
):
    """Record (or clear) one game's winner and scores as a verified result.

    use_scan_scores=True assigns the stored OCR scores by the chosen
    winner: the winning team gets the scan's victory score, the loser the
    lose score. This is the side-safe path — the caller never has to know
    which side of the screen a team was on.

    If changing this game flips an already-decided match winner, every
    downstream match that depended on the old winner is wiped.
    """
    with transaction.atomic():
        game = (
            MatchGame.objects.select_related("match__round", "team1", "team2")
            .select_for_update()
            .get(id=game.id)
        )
        if use_scan_scores and winner_team_id is not None:
            victory, lose, _hint = get_scan_scores(game)
            if victory is None and lose is None:
                raise ValidationError("This game has no scan result to take scores from.")
            if winner_team_id == game.team1_id:
                team1_score, team2_score = victory, lose
            else:
                team1_score, team2_score = lose, victory
        team1_score = _normalize_score(team1_score)
        team2_score = _normalize_score(team2_score)
        match = game.match
        old_winner = get_match_winner(match)
        old_winner_id = old_winner.id if old_winner else None

        if winner_team_id is None:
            game.winner_team = None
            game.ocr_kill_team1 = team1_score
            game.ocr_kill_team2 = team2_score
            game.kill_team1 = None
            game.kill_team2 = None
            if team1_score is not None or team2_score is not None:
                game.ocr_status = MatchGame.OcrStatus.OCR_DONE
            else:
                game.ocr_status = MatchGame.OcrStatus.PENDING
            game.verified_by = None
            game.verified_at = None
            game.reject_reason = None
        else:
            if winner_team_id not in (game.team1_id, game.team2_id):
                raise ValidationError("Winner must be one of the two teams.")
            game.winner_team_id = winner_team_id
            game.ocr_kill_team1 = team1_score
            game.ocr_kill_team2 = team2_score
            game.kill_team1 = team1_score
            game.kill_team2 = team2_score
            game.ocr_status = MatchGame.OcrStatus.VERIFIED
            game.verified_by = user
            game.verified_at = timezone.now()
            game.reject_reason = None

        game.save(
            update_fields=[
                "winner_team",
                "ocr_kill_team1",
                "ocr_kill_team2",
                "kill_team1",
                "kill_team2",
                "ocr_status",
                "verified_by",
                "verified_at",
                "reject_reason",
            ]
        )

        new_winner = get_match_winner(match)
        new_winner_id = new_winner.id if new_winner else None
        if old_winner_id and old_winner_id != new_winner_id:
            clear_downstream_matches(match)

        refresh_match_status(match)


def get_scan_scores(game):
    """Return (victory_score, lose_score, winner_hint_team_id) from the
    stored scan, or (None, None, None) when the game has no usable scan.

    Handles both the current raw_ocr_json shape ({"victory", "lose",
    "winnerTeamId", "ocr"}) and the legacy one (ocr module raw dict with
    {"Score": {"Victory", "Lose"}})."""
    raw = game.raw_ocr_json
    if not isinstance(raw, dict):
        return None, None, None
    victory = raw.get("victory")
    lose = raw.get("lose")
    if victory is None and lose is None:
        score = raw.get("Score") or {}
        victory = score.get("Victory")
        lose = score.get("Lose")
    return victory, lose, raw.get("winnerTeamId")


def save_scan_result(game, user, scan, winner_team_id=None):
    """Attach an OCR scan result (from ocr.scan_score_image) to a game.

    The OCR reads two side-agnostic numbers: the winning side's kill score
    and the losing side's. Which TEAM they belong to cannot be inferred
    from the screen — RoV swaps blue/red between games — so the mapping is
    always a human decision: the field staff who watched the game sends
    winner_team_id as a hint here, and the monitor makes the final call in
    set_game_result(use_scan_scores=True)."""
    if winner_team_id is not None:
        try:
            winner_team_id = int(winner_team_id)
        except (TypeError, ValueError):
            raise ValidationError("Winner hint must be a team id.")
        if winner_team_id not in (game.team1_id, game.team2_id):
            raise ValidationError("Winner hint must be one of the two teams in this game.")

    if winner_team_id == game.team2_id:
        game.ocr_kill_team1 = scan.lose
        game.ocr_kill_team2 = scan.victory
    else:
        # team1 hinted as winner, or no hint (provisional display order)
        game.ocr_kill_team1 = scan.victory
        game.ocr_kill_team2 = scan.lose
    game.raw_ocr_json = {
        "victory": scan.victory,
        "lose": scan.lose,
        "winnerTeamId": winner_team_id,
        "ocr": scan.raw,
    }
    game.image_path = scan.evidence_full
    game.uploaded_by = user
    game.uploaded_at = timezone.now()
    if scan.victory is not None or scan.lose is not None:
        game.ocr_status = MatchGame.OcrStatus.OCR_DONE
    else:
        game.ocr_status = MatchGame.OcrStatus.UPLOADED
    game.reject_reason = None
    game.save(
        update_fields=[
            "ocr_kill_team1",
            "ocr_kill_team2",
            "raw_ocr_json",
            "image_path",
            "uploaded_by",
            "uploaded_at",
            "ocr_status",
            "reject_reason",
        ]
    )
    refresh_match_status(game.match)


def _reset_match(match):
    match.games.all().delete()
    if match.status != Match.Status.PENDING:
        match.status = Match.Status.PENDING
        match.save(update_fields=["status"])


def clear_downstream_matches(match):
    next_match = match.next_match
    if not next_match:
        return
    clear_downstream_matches(next_match)
    _reset_match(next_match)
    third = _third_place_sibling(next_match)
    if third:
        _reset_match(third)


def _third_place_sibling(final_match):
    if final_match.match_number != 1:
        return None
    sibling = final_match.round.matches.filter(match_number=2).first()
    if sibling and not sibling.previous_matches.exists():
        return sibling
    return None


def refresh_match_status(match):
    match = Match.objects.select_related("round").prefetch_related("games").get(id=match.id)
    winner = get_match_winner(match)
    if winner:
        if match.status != Match.Status.COMPLETED:
            match.status = Match.Status.COMPLETED
            match.save(update_fields=["status"])
        try_create_next_match_games(match)
        return

    if match.games.exclude(ocr_status=MatchGame.OcrStatus.PENDING).exists():
        new_status = Match.Status.IN_PROGRESS
    else:
        new_status = Match.Status.PENDING
    if match.status != new_status:
        match.status = new_status
        match.save(update_fields=["status"])


def try_create_next_match_games(completed_match):
    next_match = completed_match.next_match
    if not next_match:
        return

    feeders = list(
        next_match.previous_matches.select_related("round").order_by("match_number")
    )
    if len(feeders) != 2:
        return

    if not next_match.games.exists():
        winners = [get_match_winner(feeder) for feeder in feeders]
        if all(winners):
            create_games_for_match(next_match, winners[0], winners[1])

    third = _third_place_sibling(next_match)
    if third and not third.games.exists():
        losers = [get_match_loser(feeder) for feeder in feeders]
        if all(losers):
            create_games_for_match(third, losers[0], losers[1])
