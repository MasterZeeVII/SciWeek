"""ORM models mirroring the hand-written MariaDB schema in sciweek.sql.

The database owns the schema: there are no Django migrations. If a column
changes, update sciweek.sql on the server first, then mirror it here.
"""

from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class School(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "schools"
        ordering = ["name"]

    def __str__(self):
        return self.name


class SystemUser(models.Model):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MONITOR = "MONITOR", "Monitor"
        FIELD_STAFF = "FIELD_STAFF", "Field staff"

    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users"
        ordering = ["username"]

    def __str__(self):
        return f"{self.username} ({self.role})"

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)


class Tournament(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    year = models.PositiveSmallIntegerField(unique=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tournaments"
        ordering = ["-year"]

    def __str__(self):
        return f"{self.name} {self.year}"


class Division(models.Model):
    class Level(models.TextChoices):
        JUNIOR = "JUNIOR", "Junior"
        SENIOR = "SENIOR", "Senior"

    id = models.AutoField(primary_key=True)
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="divisions",
    )
    level = models.CharField(max_length=10, choices=Level.choices)
    max_teams = models.PositiveSmallIntegerField(default=32)
    default_best_of = models.PositiveSmallIntegerField(default=3)

    class Meta:
        db_table = "divisions"
        ordering = ["tournament_id", "level"]
        constraints = [
            models.UniqueConstraint(
                fields=["tournament", "level"],
                name="uq_division",
            )
        ]

    def __str__(self):
        return f"{self.tournament} - {self.get_level_display()}"


class Round(models.Model):
    id = models.AutoField(primary_key=True)
    division = models.ForeignKey(
        Division,
        on_delete=models.CASCADE,
        related_name="rounds",
    )
    round_number = models.PositiveSmallIntegerField()
    round_name = models.CharField(max_length=50, blank=True, default="")
    best_of = models.PositiveSmallIntegerField(default=3)

    class Meta:
        db_table = "rounds"
        ordering = ["division_id", "round_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["division", "round_number"],
                name="uq_round",
            )
        ]

    def __str__(self):
        return f"{self.division} - {self.round_name or f'Round {self.round_number}'}"


class Team(models.Model):
    id = models.AutoField(primary_key=True)
    division = models.ForeignKey(
        Division,
        on_delete=models.CASCADE,
        related_name="teams",
    )
    school = models.ForeignKey(
        School,
        on_delete=models.RESTRICT,
        related_name="teams",
    )
    team_number = models.PositiveSmallIntegerField(default=1)

    class Meta:
        db_table = "teams"
        ordering = ["school__name", "team_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["division", "school", "team_number"],
                name="uq_team",
            )
        ]

    def __str__(self):
        suffix = f" #{self.team_number}" if self.team_number > 1 else ""
        return f"{self.school.name}{suffix}"


class TeamMember(models.Model):
    id = models.AutoField(primary_key=True)
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="members",
    )
    full_name = models.CharField(max_length=100)
    in_game_name = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "team_members"
        ordering = ["id"]

    def __str__(self):
        if self.in_game_name:
            return f"{self.full_name} ({self.in_game_name})"
        return self.full_name


class Match(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"

    id = models.AutoField(primary_key=True)
    round = models.ForeignKey(
        Round,
        on_delete=models.CASCADE,
        related_name="matches",
    )
    match_number = models.PositiveSmallIntegerField()
    # Kept as SET_NULL (not CASCADE) deliberately: `SHOW CREATE TABLE matches`
    # against the live DB confirms `fk_match_next` is genuinely
    # `ON DELETE SET NULL` at the DB level (see sciweek.sql). Since this repo
    # treats the database as the schema's source of truth and has no
    # migrations, the Django-side on_delete must match what the DB actually
    # enforces — declaring CASCADE here would make the model lie about what
    # happens on a delete that bypasses the ORM. In practice this ambiguity
    # (next_match is null either because this is the final match, or
    # because a referenced match row was deleted) is dormant: the only
    # delete path in this codebase is reset_division_bracket(), which
    # deletes whole Rounds (cascading to every Match in the division at
    # once), so a match's next_match is never nulled out from under a
    # surviving sibling match.
    next_match = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="previous_matches",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    scheduled_time = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "matches"
        ordering = ["round_id", "match_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["round", "match_number"],
                name="uq_match",
            )
        ]

    def __str__(self):
        return f"{self.round} M{self.match_number}"

    @property
    def division(self):
        return self.round.division

    @property
    def best_of(self):
        return self.round.best_of


class MatchGame(models.Model):
    class OcrStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        UPLOADED = "UPLOADED", "Uploaded"
        OCR_DONE = "OCR_DONE", "OCR done"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"

    id = models.AutoField(primary_key=True)
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="games",
    )
    team1 = models.ForeignKey(
        Team,
        on_delete=models.RESTRICT,
        related_name="team1_games",
    )
    team2 = models.ForeignKey(
        Team,
        on_delete=models.RESTRICT,
        related_name="team2_games",
    )
    game_number = models.PositiveSmallIntegerField()
    winner_team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="won_games",
    )
    kill_team1 = models.PositiveSmallIntegerField(blank=True, null=True)
    kill_team2 = models.PositiveSmallIntegerField(blank=True, null=True)
    image_path = models.CharField(max_length=255, blank=True, null=True)
    uploaded_by = models.ForeignKey(
        SystemUser,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="uploaded_games",
    )
    uploaded_at = models.DateTimeField(blank=True, null=True)
    ocr_kill_team1 = models.PositiveSmallIntegerField(blank=True, null=True)
    ocr_kill_team2 = models.PositiveSmallIntegerField(blank=True, null=True)
    raw_ocr_json = models.JSONField(blank=True, null=True)
    ocr_status = models.CharField(
        max_length=20,
        choices=OcrStatus.choices,
        default=OcrStatus.PENDING,
    )
    verified_by = models.ForeignKey(
        SystemUser,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="verified_games",
    )
    verified_at = models.DateTimeField(blank=True, null=True)
    reject_reason = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "match_games"
        ordering = ["match_id", "game_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["match", "game_number"],
                name="uq_match_game",
            )
        ]

    def __str__(self):
        return f"{self.match} G{self.game_number}"

    @property
    def is_verified(self):
        return self.ocr_status == self.OcrStatus.VERIFIED
