"""Build the frontend from Django's own CLI, so `manage.py` is the one command
that knows how to produce a deployable build — the same role `mvn package` or
`gradle build` plays for a Java project, instead of "run npm here, run python
there." Meant to be the prep step a Dockerfile RUNs before packaging the image.

Usage (run from repo root):

    .\\env\\Scripts\\python.exe manage.py build
    .\\env\\Scripts\\python.exe manage.py build --skip-install
"""

import shutil
import subprocess

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Install frontend dependencies and run the Vite production build (frontend/dist)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-install",
            action="store_true",
            help="Skip npm ci/install and go straight to the build (assumes node_modules is already current).",
        )

    def handle(self, *args, **options):
        frontend_dir = settings.BASE_DIR / "frontend"
        if not frontend_dir.is_dir():
            raise CommandError(f"No frontend/ directory at {frontend_dir}")

        npm = shutil.which("npm")
        if not npm:
            raise CommandError("npm not found on PATH. Install Node.js first.")

        if not options["skip_install"]:
            lockfile = frontend_dir / "package-lock.json"
            install_cmd = [npm, "ci"] if lockfile.exists() else [npm, "install"]
            self._run(install_cmd, frontend_dir)

        self._run([npm, "run", "build"], frontend_dir)

        dist_dir = frontend_dir / "dist"
        self.stdout.write(self.style.SUCCESS(f"Frontend build complete: {dist_dir}"))

    def _run(self, cmd, cwd):
        self.stdout.write(f"$ {' '.join(cmd)}  (in {cwd})")
        try:
            subprocess.run(cmd, cwd=cwd, check=True)
        except subprocess.CalledProcessError as exc:
            raise CommandError(f"Command failed ({exc.returncode}): {' '.join(cmd)}") from exc
        except FileNotFoundError as exc:
            raise CommandError(f"Could not run {cmd[0]}: {exc}") from exc
