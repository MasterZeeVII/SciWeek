from django.db import transaction

from common.models import Division, Tournament


def activate_tournament(tournament):
    Tournament.objects.exclude(id=tournament.id).update(is_active=False)
    tournament.is_active = True
    tournament.save(update_fields=["is_active"])


def ensure_default_divisions(tournament):
    for level in (Division.Level.JUNIOR, Division.Level.SENIOR):
        Division.objects.get_or_create(tournament=tournament, level=level)


def upsert_tournament(name, year):
    with transaction.atomic():
        tournament, _created = Tournament.objects.get_or_create(
            year=year,
            defaults={"name": name},
        )
        tournament.name = name
        tournament.save(update_fields=["name"])
        activate_tournament(tournament)
        ensure_default_divisions(tournament)
    return tournament
