from django.db import transaction

from common.models import Division, Tournament


def activate_tournament(tournament):
    Tournament.objects.exclude(id=tournament.id).update(is_active=False)
    tournament.is_active = True
    tournament.save(update_fields=["is_active"])


def ensure_default_divisions(tournament):
    for level in (Division.Level.JUNIOR, Division.Level.SENIOR):
        Division.objects.get_or_create(tournament=tournament, level=level)


def upsert_tournament(name, year, season=1):
    with transaction.atomic():
        tournament, _created = Tournament.objects.get_or_create(
            year=year,
            season=season,
            defaults={"name": name},
        )
        tournament.name = name
        tournament.save(update_fields=["name"])
        activate_tournament(tournament)
        ensure_default_divisions(tournament)
    return tournament


def next_season_for_year(year):
    """Smallest unused season number for a year: (max season) + 1, or 1."""
    last = (
        Tournament.objects.filter(year=year)
        .order_by("-season")
        .values_list("season", flat=True)
        .first()
    )
    return (last or 0) + 1
