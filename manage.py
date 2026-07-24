#!/usr/bin/env python
"""Django command-line utility for the SCIWEEK project.

All backend code lives under src/, so put it on the import path before
Django loads config.settings.
"""
import os
import sys
from pathlib import Path


def main():
    sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
