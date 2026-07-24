from django.core.management.base import BaseCommand, CommandError

from common.models import SystemUser


class Command(BaseCommand):
    help = "Create or update an admin user in the schema users table."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]
        user, created = SystemUser.objects.get_or_create(
            username=username,
            defaults={"role": SystemUser.Role.ADMIN, "is_active": True},
        )
        if not created and user.role != SystemUser.Role.ADMIN:
            raise CommandError(f"{username} already exists and is not an ADMIN.")
        user.role = SystemUser.Role.ADMIN
        user.is_active = True
        user.set_password(password)
        user.save()
        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} admin user: {username}"))
