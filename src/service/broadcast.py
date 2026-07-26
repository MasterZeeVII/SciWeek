"""Admin-triggered public broadcast overlay ("/notify" console command).

Holds only the single most recent broadcast, process-global — same pattern
as ocr.py's _last_score: fine for one dev-server event box, resets on
restart, not shared across worker processes. There's no backing table (no
migrations in this repo) and nothing here needs to survive a restart.
"""

import itertools
import shlex
from datetime import datetime, timezone

from django.core.exceptions import ValidationError

_id_counter = itertools.count(1)
_last_broadcast = None

_ALLOWED_FIELDS = {
    "team1",
    "team2",
    "kills1",
    "kills2",
    "winner",
    "message",
    "round",
    "stage",
    "bestof",
    "gamenumber",
    "thirdplace",
}


def _int_or_none(raw):
    if raw is None or raw == "":
        return None
    try:
        return int(raw)
    except ValueError:
        raise ValidationError(f"Expected a number, got '{raw}'.")


def parse_notify_command(command):
    """Parse a `/notify key=value ...` console line into a broadcast payload.

    Quoted values may contain spaces (shlex handles the tokenizing), e.g.
    `/notify team1="Aurora Nine" team2=Blackwater winner=team1 kills1=2
    kills2=1 message="ผ่านเข้าสู่รอบชิงชนะเลิศ"`.
    """
    text = (command or "").strip()
    if text.startswith("/"):
        text = text[1:]

    try:
        tokens = shlex.split(text)
    except ValueError as exc:
        raise ValidationError(f"Could not parse command: {exc}")

    if not tokens:
        raise ValidationError("Empty command. Try /notify team1=... team2=... winner=... message=...")

    name = tokens[0].lower()
    if name != "notify":
        raise ValidationError(f"Unknown command '/{name}'. Try /notify.")

    fields = {}
    for token in tokens[1:]:
        if "=" not in token:
            raise ValidationError(f"Expected key=value, got '{token}'.")
        key, _, value = token.partition("=")
        key = key.strip().lower()
        if key not in _ALLOWED_FIELDS:
            raise ValidationError(f"Unknown field '{key}'.")
        fields[key] = value

    team1 = fields.get("team1", "").strip()
    team2 = fields.get("team2", "").strip()
    winner = fields.get("winner", "").strip()
    message = fields.get("message", "").strip()

    if not team1 or not team2:
        raise ValidationError("team1 and team2 are required.")
    if winner not in ("team1", "team2"):
        raise ValidationError("winner must be team1 or team2.")
    if not message:
        raise ValidationError("message is required.")

    return {
        "stageName": fields.get("stage", "").strip(),
        "roundName": fields.get("round", "").strip() or "ประกาศ",
        "isThirdPlace": fields.get("thirdplace", "").strip().lower() in ("1", "true", "yes"),
        "bestOf": _int_or_none(fields.get("bestof")) or 1,
        "gameNumber": _int_or_none(fields.get("gamenumber")) or 1,
        "team1": team1,
        "team2": team2,
        "kills1": _int_or_none(fields.get("kills1")),
        "kills2": _int_or_none(fields.get("kills2")),
        "winner": winner,
        "outcome": None,
        "advanceRoundName": None,
        "message": message,
    }


def push_broadcast(payload):
    global _last_broadcast
    record_id = next(_id_counter)
    _last_broadcast = {
        "id": record_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "payload": {**payload, "key": f"admin:{record_id}"},
    }
    return _last_broadcast


def clear_broadcast():
    global _last_broadcast
    _last_broadcast = None


def get_broadcast():
    return _last_broadcast
