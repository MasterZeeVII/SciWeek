"""Wipe tournament data without touching the schema.

Examples (run from repo root):

    # Delete brackets only (rounds/matches/games) — teams stay
    .\\env\\Scripts\\python.exe manage.py wipe_data --brackets --yes

    # Brackets + teams (fresh season, same tournament row)
    .\\env\\Scripts\\python.exe manage.py wipe_data --teams --yes

    # Everything: tournaments, divisions, brackets, teams
    .\\env\\Scripts\\python.exe manage.py wipe_data --tournaments --yes

    # Full reset including schools and login users
    .\\env\\Scripts\\python.exe manage.py wipe_data --tournaments --schools --users --yes

After --users, recreate a login with:
    .\\env\\Scripts\\python.exe manage.py create_admin --username admin --password <new-password>
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from common.models import Round, School, SystemUser, Team, Tournament


class Command(BaseCommand):
    help = "Wipe tournament data (brackets/teams/tournaments/schools/users). Requires --yes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--brackets",
            action="store_true",
            help="Delete all rounds (matches and games cascade). Teams stay.",
        )
        parser.add_argument(
            "--teams",
            action="store_true",
            help="Delete brackets AND all teams (members cascade).",
        )
        parser.add_argument(
            "--tournaments",
            action="store_true",
            help="Delete ALL tournaments (divisions, brackets, teams cascade).",
        )
        parser.add_argument(
            "--schools",
            action="store_true",
            help="Also delete schools (requires teams to be wiped in the same run).",
        )
        parser.add_argument(
            "--users",
            action="store_true",
            help="Delete login users. Recreate one with create_admin afterwards.",
        )
        parser.add_argument(
            "--keep-user",
            action="append",
            default=[],
            metavar="USERNAME",
            help="Username to keep when using --users (repeatable).",
        )
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Actually delete. Without it the command only prints what it would do.",
        )

    def handle(self, *args, **options):
        wipe_brackets = options["brackets"] or options["teams"] or options["tournaments"]
        wipe_teams = options["teams"] or options["tournaments"]
        wipe_tournaments = options["tournaments"]
        wipe_schools = options["schools"]
        wipe_users = options["users"]

        if not any([wipe_brackets, wipe_schools, wipe_users]):
            raise CommandError(
                "Nothing selected. Use --brackets, --teams, --tournaments, --schools and/or --users."
            )
        if wipe_schools and not wipe_teams:
            raise CommandError("--schools needs --teams or --tournaments (teams reference schools).")

        plan = []
        if wipe_tournaments:
            plan.append(f"tournaments: {Tournament.objects.count()} (divisions/brackets/teams cascade)")
        else:
            if wipe_brackets:
                plan.append(f"rounds: {Round.objects.count()} (matches/games cascade)")
            if wipe_teams:
                plan.append(f"teams: {Team.objects.count()} (members cascade)")
        if wipe_schools:
            plan.append(f"schools: {School.objects.count()}")
        if wipe_users:
            kept = set(options["keep_user"])
            doomed = SystemUser.objects.exclude(username__in=kept)
            plan.append(f"users: {doomed.count()}" + (f" (keeping {', '.join(sorted(kept))})" if kept else ""))

        self.stdout.write("Will delete:")
        for line in plan:
            self.stdout.write(f"  - {line}")

        if not options["yes"]:
            self.stdout.write(self.style.WARNING("Dry run only. Add --yes to actually delete."))
            return

        with transaction.atomic():
            if wipe_tournaments:
                Tournament.objects.all().delete()
            else:
                if wipe_brackets:
                    Round.objects.all().delete()
                if wipe_teams:
                    Team.objects.all().delete()
            if wipe_schools:
                School.objects.all().delete()
            if wipe_users:
                SystemUser.objects.exclude(username__in=set(options["keep_user"])).delete()

        self.stdout.write(self.style.SUCCESS("Done."))
        if wipe_users:
            self.stdout.write(
                "Recreate a login with: manage.py create_admin --username admin --password <new-password>"
            )
