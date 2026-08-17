"""Turn a raw Toornament match-results paste into a rounds/matches/match_games
SQL import for one historical SCIWEEK season.

Input format (prepdata/raw/matches_<year>.txt): the plain-text "Results" tab
copy-paste, one match as a fixed 9-line block:

    <division label: ม.ต้น | ม.ปลาย>
    /
    Main Bracket
    /
    <round name>
    <team1 label, e.g. ม.ต้น_รร.ชุมแสงชนูทิศ>
    <team1 score: digits, or W/L>
    <team2 score: digits, or W/L>
    <team2 label>

Toornament renders the third-place decider stacked under the final's round
column (no round header of its own), so the final round can legitimately
have two blocks for a division. This script tells them apart by checking
each block's teams against the semifinal round's winners/losers -- it does
not guess from position.

Output: SQL that resolves every foreign key by name via subqueries/session
variables (never hardcoded ids), same pattern as import_participants.sql.
Historical games are inserted with ocr_status='VERIFIED' (required for
service.results.get_match_winner to count them, and for the public payload
to surface them at all) and NULL kill_team1/kill_team2 (Toornament gives a
series score, not per-game kill counts).

Usage:
    python prepdata/build_match_import.py --year 2021 \
        --input prepdata/raw/matches_2564.txt \
        --output prepdata/import_matches_2564.sql
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

DIVISION_PREFIX = {"ม.ต้น": "JUNIOR", "ม.ปลาย": "SENIOR"}

# Chronological order used to assign round_number per division. Only the
# names actually present for a division are used -- this is a superset
# covering every bracket size we've seen across the four seasons.
CANONICAL_ROUNDS = [
    "รอบแรก",
    "รอบที่ 2",
    "รอบที่ 3",
    "รอบที่ 4",
    "รอบที่ 5",
    "รอบก่อนรองชนะเลิศ",
    "รอบรองชนะเลิศ",
    "รอบชิงชนะเลิศ",
]

DEFAULT_BEST_OF = 3

TEAM_NUMBER_RE = re.compile(r"\s*(?:\(([0-9]+)\)|ทีมที่\s*([0-9]+))\s*$")


def normalize_school_name(raw: str) -> str:
    name = raw.strip()
    if name.startswith("รร."):
        name = "ร.ร." + name[len("รร.") :]
    return name


@dataclass
class RawMatch:
    division: str
    round_name: str
    team1_school: str
    team1_number: int
    score1: str
    team2_school: str
    team2_number: int
    score2: str


def parse_team_label(raw: str, overrides: dict) -> tuple[str, str, int]:
    prefix, sep, rest = raw.partition("_")
    if not sep:
        raise ValueError(f"team label missing division prefix: {raw!r}")
    division = DIVISION_PREFIX.get(prefix.strip())
    if division is None:
        raise ValueError(f"unknown division prefix in team label: {raw!r}")
    rest = rest.strip()
    team_number = 1
    m = TEAM_NUMBER_RE.search(rest)
    if m:
        team_number = int(m.group(1) or m.group(2))
        rest = rest[: m.start()].strip()
    school = normalize_school_name(rest)
    team_number = overrides.get((division, school), team_number)
    return division, school, team_number


def parse_matches(text: str, overrides: dict) -> list[RawMatch]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if len(lines) % 9 != 0:
        raise ValueError(
            f"expected a multiple of 9 non-blank lines, got {len(lines)} -- "
            "check the raw paste for missing/extra lines"
        )
    matches = []
    for i in range(0, len(lines), 9):
        chunk = lines[i : i + 9]
        div_label, slash1, bracket_label, slash2, round_name, t1_raw, s1, s2, t2_raw = chunk
        if slash1 != "/" or slash2 != "/" or bracket_label != "Main Bracket":
            raise ValueError(f"unexpected block structure near line {i}: {chunk}")
        expected_division = DIVISION_PREFIX.get(div_label.strip())
        if expected_division is None:
            raise ValueError(f"unknown division label {div_label!r} near line {i}")
        div1, school1, num1 = parse_team_label(t1_raw, overrides)
        div2, school2, num2 = parse_team_label(t2_raw, overrides)
        if div1 != expected_division or div2 != expected_division:
            raise ValueError(f"division mismatch in block near line {i}: {chunk}")
        matches.append(
            RawMatch(expected_division, round_name.strip(), school1, num1, s1, school2, num2, s2)
        )
    return matches


def winner_is_team1(score1: str, score2: str) -> bool:
    u1, u2 = score1.upper(), score2.upper()
    if u1 == "W" and u2 == "L":
        return True
    if u1 == "L" and u2 == "W":
        return False
    try:
        n1, n2 = int(score1), int(score2)
    except ValueError as exc:
        raise ValueError(f"unrecognized score pair: {score1!r} {score2!r}") from exc
    if n1 == n2:
        raise ValueError(f"tie score not supported: {score1!r} {score2!r}")
    return n1 > n2


def games_for_score(score1: str, score2: str, best_of: int) -> list[str]:
    """Return a list of 'team1'/'team2' -- one entry per synthetic game.

    Numeric scores (a real series score) produce exactly that many games.
    W/L (no series score available) produces the minimum games needed to
    clinch best_of, all credited to the winner.
    """
    u1, u2 = score1.upper(), score2.upper()
    if {u1, u2} == {"W", "L"}:
        majority = best_of // 2 + 1
        winner = "team1" if u1 == "W" else "team2"
        return [winner] * majority
    n1, n2 = int(score1), int(score2)
    return ["team1"] * n1 + ["team2"] * n2


@dataclass
class BuiltMatch:
    division: str
    round_number: int
    round_name: str
    match_number: int
    team1_division: str
    team1_school: str
    team1_number: int
    team2_division: str
    team2_school: str
    team2_number: int
    game_winners: list[str]  # 'team1'/'team2' per game_number (1-indexed)
    var: str = ""


def classify_final_round(entries: list[RawMatch], semifinal_entries: list[RawMatch]) -> list[RawMatch]:
    """Reorder a final round's entries so match_number 1 is the real final
    (both teams won their semifinal) and match_number 2 (if present) is the
    third-place decider (both teams lost their semifinal).

    Raises if a block can't be classified -- we never guess.
    """
    if len(entries) == 1:
        return entries
    if len(entries) > 2:
        raise ValueError(
            f"final round has {len(entries)} blocks, expected at most 2 "
            "(real final + third place) -- needs manual review"
        )

    won, lost = set(), set()
    for m in semifinal_entries:
        w1 = winner_is_team1(m.score1, m.score2)
        winner = (m.team1_school, m.team1_number)
        loser = (m.team2_school, m.team2_number)
        if not w1:
            winner, loser = loser, winner
        won.add(winner)
        lost.add(loser)

    final_block, third_block = None, None
    for entry in entries:
        pair = {(entry.team1_school, entry.team1_number), (entry.team2_school, entry.team2_number)}
        if pair <= won:
            final_block = entry
        elif pair <= lost:
            third_block = entry
    if final_block is None or third_block is None:
        raise ValueError(
            "could not classify the two final-round blocks against semifinal "
            f"results (won={won}, lost={lost}, entries={entries})"
        )
    return [final_block, third_block]


def build_matches(raw_matches: list[RawMatch], best_of: int) -> list[BuiltMatch]:
    by_division: dict[str, list[RawMatch]] = {}
    for m in raw_matches:
        by_division.setdefault(m.division, []).append(m)

    built: list[BuiltMatch] = []
    for division, entries in by_division.items():
        rounds_present = []
        for name in CANONICAL_ROUNDS:
            if any(e.round_name == name for e in entries) and name not in rounds_present:
                rounds_present.append(name)
        # keep any round name we didn't anticipate, appended in first-seen order
        for e in entries:
            if e.round_name not in rounds_present:
                rounds_present.append(e.round_name)

        by_round_name: dict[str, list[RawMatch]] = {}
        for e in entries:
            by_round_name.setdefault(e.round_name, []).append(e)

        last_name = rounds_present[-1]
        if len(by_round_name[last_name]) > 1:
            semis_name = rounds_present[-2] if len(rounds_present) >= 2 else None
            semis = by_round_name.get(semis_name, []) if semis_name else []
            by_round_name[last_name] = classify_final_round(by_round_name[last_name], semis)

        for round_number, round_name in enumerate(rounds_present, start=1):
            for match_number, m in enumerate(by_round_name[round_name], start=1):
                built.append(
                    BuiltMatch(
                        division=division,
                        round_number=round_number,
                        round_name=round_name,
                        match_number=match_number,
                        team1_division=m.division,
                        team1_school=m.team1_school,
                        team1_number=m.team1_number,
                        team2_division=m.division,
                        team2_school=m.team2_school,
                        team2_number=m.team2_number,
                        game_winners=games_for_score(m.score1, m.score2, best_of),
                    )
                )
    return built


def sql_str(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def team_subquery(division_var: str, school: str, team_number: int, alias: str) -> str:
    return (
        f"(SELECT {alias}.id FROM teams {alias} "
        f"JOIN schools sc_{alias} ON sc_{alias}.id = {alias}.school_id "
        f"WHERE {alias}.division_id = {division_var} "
        f"AND sc_{alias}.name = {sql_str(school)} AND {alias}.team_number = {team_number})"
    )


def generate_sql(year: int, built: list[BuiltMatch], best_of: int) -> str:
    lines = [
        f"-- Historical match/bracket import for year {year}",
        "-- Generated by prepdata/build_match_import.py -- review before running.",
        "-- Games carry no kill counts (Toornament only gave series scores/W-L) and",
        "-- ocr_status='VERIFIED' so they count toward match wins and appear on the",
        "-- public site (see service.results.get_match_winner / serializers.py).",
        "",
        "SET FOREIGN_KEY_CHECKS = 0;",
        "",
        f"SET @tid := (SELECT id FROM tournaments WHERE year = {year} AND season = 1);",
        "SET @jid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'JUNIOR');",
        "SET @sid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'SENIOR');",
        "",
    ]

    div_var = {"JUNIOR": "@jid", "SENIOR": "@sid"}

    by_division: dict[str, list[BuiltMatch]] = {}
    for m in built:
        by_division.setdefault(m.division, []).append(m)

    for division, matches in by_division.items():
        dvar = div_var[division]
        lines.append(f"-- ==================== {division} ====================")

        round_numbers = sorted({m.round_number for m in matches})
        round_names = {m.round_number: m.round_name for m in matches}
        round_var = {}
        for rn in round_numbers:
            var = f"@r_{division.lower()}_{rn}"
            round_var[rn] = var
            lines.append(
                f"INSERT INTO rounds (division_id, round_number, round_name, best_of) "
                f"VALUES ({dvar}, {rn}, {sql_str(round_names[rn])}, {best_of});"
            )
            lines.append(f"SET {var} := LAST_INSERT_ID();")
        lines.append("")

        match_var = {}
        for m in matches:
            m.var = f"@m_{division.lower()}_{m.round_number}_{m.match_number}"
            rvar = round_var[m.round_number]
            label = (
                f"-- {m.round_name} #{m.match_number}: "
                f"{m.team1_school}#{m.team1_number} vs {m.team2_school}#{m.team2_number} "
                f"-> {sum(1 for w in m.game_winners if w == 'team1')}-"
                f"{sum(1 for w in m.game_winners if w == 'team2')}"
            )
            lines.append(label)
            lines.append(
                f"INSERT INTO matches (round_id, match_number, status) "
                f"VALUES ({rvar}, {m.match_number}, 'COMPLETED');"
            )
            lines.append(f"SET {m.var} := LAST_INSERT_ID();")

            t1_sub = team_subquery(dvar, m.team1_school, m.team1_number, "t1")
            t2_sub = team_subquery(dvar, m.team2_school, m.team2_number, "t2")
            for game_number, winner in enumerate(m.game_winners, start=1):
                winner_sub = t1_sub if winner == "team1" else t2_sub
                lines.append(
                    "INSERT INTO match_games "
                    "(match_id, team1_id, team2_id, game_number, winner_team_id, ocr_status) "
                    f"VALUES ({m.var}, {t1_sub}, {t2_sub}, {game_number}, {winner_sub}, 'VERIFIED');"
                )
            match_var[(m.round_number, m.match_number)] = m.var
            lines.append("")

        # next_match_id linkage: winner of match_number N in round R feeds
        # into round R+1's match containing that same team. Third-place
        # matches (match_number 2 of the last round) are left unlinked --
        # they have no next_match by convention (bracket.is_third_place_match).
        for m in matches:
            next_round = m.round_number + 1
            if next_round not in round_var:
                continue
            if m.match_number == 2 and m.round_number == max(round_numbers):
                continue  # third place: no next_match
            winner = "team1" if sum(1 for w in m.game_winners if w == "team1") > sum(
                1 for w in m.game_winners if w == "team2"
            ) else "team2"
            winner_school = m.team1_school if winner == "team1" else m.team2_school
            winner_number = m.team1_number if winner == "team1" else m.team2_number
            target = next(
                (
                    other
                    for other in matches
                    if other.round_number == next_round
                    and (
                        (other.team1_school, other.team1_number) == (winner_school, winner_number)
                        or (other.team2_school, other.team2_number)
                        == (winner_school, winner_number)
                    )
                ),
                None,
            )
            if target is None:
                continue
            lines.append(f"UPDATE matches SET next_match_id = {target.var} WHERE id = {m.var};")
        lines.append("")

    lines.append("SET FOREIGN_KEY_CHECKS = 1;")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--year", type=int, required=True, help="Gregorian year, e.g. 2021")
    parser.add_argument("--input", type=Path, required=True, help="Raw pasted match-results text file")
    parser.add_argument("--output", type=Path, required=True, help="SQL file to write")
    parser.add_argument("--best-of", type=int, default=DEFAULT_BEST_OF)
    parser.add_argument(
        "--team-number-overrides",
        type=Path,
        default=None,
        help='JSON file: [["JUNIOR", "ร.ร.X", 2], ...] for schools with >1 team in a division that year',
    )
    args = parser.parse_args()

    overrides = {}
    if args.team_number_overrides:
        raw_overrides = json.loads(args.team_number_overrides.read_text(encoding="utf-8"))
        overrides = {(div, school): num for div, school, num in raw_overrides}

    text = args.input.read_text(encoding="utf-8")
    raw_matches = parse_matches(text, overrides)
    built = build_matches(raw_matches, args.best_of)
    sql = generate_sql(args.year, built, args.best_of)
    args.output.write_text(sql, encoding="utf-8")
    print(f"Parsed {len(raw_matches)} matches -> {len(built)} matches written to {args.output}")


if __name__ == "__main__":
    main()
