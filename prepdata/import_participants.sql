-- Historical SCIWEEK participant import (schools/tournaments/divisions/teams)
-- Generated from participants.txt (Toornament archive, years 2564-2567 BE / 2021-2024 CE)
-- No bracket/match results yet -- teams only.

SET FOREIGN_KEY_CHECKS = 0;

-- Schools (idempotent: skip any name that already exists)
INSERT INTO schools (name)
SELECT * FROM (SELECT 'เธฃ.เธฃ.เธเธธเธกเนเธชเธเธเธเธนเธ—เธดเธจ' AS name
    UNION ALL SELECT 'เธฃ.เธฃ.เธเนเธญเธเนเธเธเธดเธ—เธขเธฒเธเธก'
    UNION ALL SELECT 'เธฃ.เธฃ.เธ•เธฐเธเธฃเนเธญเธเธดเธ—เธขเธฒ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธ•เธฐเธเธฒเธเธซเธดเธ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธ•เธฒเธเธเนเธฒเธงเธดเธเธฒเธเธฃเธฐเธชเธดเธ—เธเธดเน'
    UNION ALL SELECT 'เธฃ.เธฃ.เธ—เธฑเธเธเธคเธเธเธฑเธ’เธเธฒ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธ—เนเธฒเธ•เธฐเนเธเธเธดเธ—เธขเธฒเธเธก'
    UNION ALL SELECT 'เธฃ.เธฃ.เธเธเธฃเธชเธงเธฃเธฃเธเน'
    UNION ALL SELECT 'เธฃ.เธฃ.เธเธงเธกเธดเธเธ—เธฃเธฒเธเธนเธ—เธดเธจ เธกเธฑเธเธเธดเธก'
    UNION ALL SELECT 'เธฃ.เธฃ.เธเธฃเธฃเธเธ•เธเธดเธชเธฑเธขเธเธดเธ—เธขเธฒเธเธก'
    UNION ALL SELECT 'เธฃ.เธฃ.เธเธถเธเธเธญเธฃเธฐเน€เธเนเธ”เธงเธดเธ—เธขเธฒ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธเนเธฒเธเธ—เนเธฒเธกเธฐเธเธฃเธนเธ”'
    UNION ALL SELECT 'เธฃ.เธฃ.เธเนเธฒเธเน€เธเธฒเธ”เธดเธ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธเนเธฒเธเน€เธเธเธฃเธกเธเธเธฅ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธเนเธฒเธเนเธเนเธเธเธฑเธเธงเธฅเธดเธ•เธงเธดเธ—เธขเธฒ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธเธขเธธเธซเธฐเธงเธดเธ—เธขเธฒ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธเธฃเธฐเธเธฒเธเธงเธดเธ—เธขเธฒ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธฅเธฒเธเธฒเธฅเนเธเธ•เธดเธฃเธงเธตเธเธเธฃเธชเธงเธฃเธฃเธเน'
    UNION ALL SELECT 'เธฃ.เธฃ.เธฅเธฒเธ”เธขเธฒเธงเธงเธดเธ—เธขเธฒเธเธก'
    UNION ALL SELECT 'เธฃ.เธฃ.เธฅเธฒเธเธชเธฑเธเธงเธดเธ—เธขเธฒ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธงเธฑเธเน€เธกเธทเธญเธเธเธเธเธฃเธฐเธชเธดเธ—เธเธดเนเธงเธดเธ—เธขเธฒเธเธก'
    UNION ALL SELECT 'เธฃ.เธฃ.เธงเธฑเธเนเธเธกเธงเธดเธ—เธขเธฒเธเธก'
    UNION ALL SELECT 'เธฃ.เธฃ.เธงเธฑเธ”เธ—เนเธฒเธ—เธญเธ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธงเธฑเธ”เธซเธเธญเธเธ•เธฒเธเธน'
    UNION ALL SELECT 'เธฃ.เธฃ.เธชเธ•เธฃเธตเธเธเธฃเธชเธงเธฃเธฃเธเน'
    UNION ALL SELECT 'เธฃ.เธฃ.เธชเธงเธเธเธธเธซเธฅเธฒเธเธงเธดเธ—เธขเธฒเธฅเธฑเธข (เธเธดเธฃเธเธฃเธฐเธงเธฑเธ•เธด)'
    UNION ALL SELECT 'เธฃ.เธฃ.เธชเธงเธเธเธธเธซเธฅเธฒเธเธงเธดเธ—เธขเธฒเธฅเธฑเธขเธฏ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธชเธฒเธเธฃเธเธดเธ—เธขเธฒเธเธก'
    UNION ALL SELECT 'เธฃ.เธฃ.เธซเนเธงเธขเธเธฃเธ”เธงเธดเธ—เธขเธฒ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธซเนเธงเธขเธเนเธณเธซเธญเธกเธงเธดเธ—เธขเธฒเธเธฒเธฃ'
    UNION ALL SELECT 'เธฃ.เธฃ.เธญเธธเธ”เธกเธเธฑเธเธเธฒเธเธฃเธฐเธเธฒเธเธธเน€เธเธฃเธฒเธฐเธซเน'
    UNION ALL SELECT 'เธฃ.เธฃ.เธญเธธเธ—เธฑเธขเธงเธดเธ—เธขเธฒเธเธก'
    UNION ALL SELECT 'เธฃ.เธฃ.เธญเธธเธฅเธดเธ•เนเธเธเธนเธฅเธขเนเธเธเธนเธเธ–เธฑเธกเธ เน'
    UNION ALL SELECT 'เธฃ.เธฃ.เน€เธเนเธฒเน€เธฅเธตเนเธขเธงเธงเธดเธ—เธขเธฒ'
    UNION ALL SELECT 'เธฃ.เธฃ.เน€เธ—เธจเธเธฒเธฅเธงเธฑเธ”เธเธญเธกเธเธตเธฃเธตเธเธฒเธเธเธฃเธ•'
    UNION ALL SELECT 'เธฃ.เธฃ.เน€เธเธดเธเธเธฒเธกเธฃเธฑเธเธเธฃเธฐเธเธฒเธเธธเน€เธเธฃเธฒเธฐเธซเน'
    UNION ALL SELECT 'เธฃ.เธฃ.เน€เธกเธ•เธ•เธฒเธงเธดเธ—เธขเธฒ'
    UNION ALL SELECT 'เธฃ.เธฃ.เนเธเธฃเธเธเธฃเธฐ'
    UNION ALL SELECT 'เธฃ.เธฃ.เนเธ—เธขเธฃเธฑเธเธงเธดเธ—เธขเธฒ107 (เธเนเธฒเธเธซเธเธญเธเนเธกเนเนเธ”เธ)'
    UNION ALL SELECT 'เธจเธเธฃ.เธเธฑเธเธเธฒเธ เธดเธงเธฑเธ’เธเน เธเธเธฃเธชเธงเธฃเธฃเธเน'
) AS new_schools
WHERE new_schools.name NOT IN (SELECT name FROM schools);

-- Year 2564 BE / 2021 CE
INSERT INTO tournaments (name, year, season, is_active) VALUES ('NSRU E-Sport SCIWEEK', 2021, 1, 0);
SET @tid := LAST_INSERT_ID();
INSERT INTO divisions (tournament_id, level, max_teams, default_best_of) VALUES (@tid, 'JUNIOR', 32, 3), (@tid, 'SENIOR', 32, 3);
SET @jid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'JUNIOR');
SET @sid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'SENIOR');

-- 2564 JUNIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธธเธกเนเธชเธเธเธเธนเธ—เธดเธจ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธ•เธฐเธเธฒเธเธซเธดเธ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธ—เนเธฒเธ•เธฐเนเธเธเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเนเธฒเธเน€เธเธเธฃเธกเธเธเธฅ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธงเธฑเธ”เธ—เนเธฒเธ—เธญเธ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธ•เธฃเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธงเธเธเธธเธซเธฅเธฒเธเธงเธดเธ—เธขเธฒเธฅเธฑเธขเธฏ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธฒเธเธฃเธเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธซเนเธงเธขเธเนเธณเธซเธญเธกเธงเธดเธ—เธขเธฒเธเธฒเธฃ';

-- 2564 SENIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธธเธกเนเธชเธเธเธเธนเธ—เธดเธจ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธ•เธฐเธเธฃเนเธญเธเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธ—เนเธฒเธ•เธฐเนเธเธเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเนเธฒเธเนเธเนเธเธเธฑเธเธงเธฅเธดเธ•เธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เน€เธกเธ•เธ•เธฒเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธ•เธฃเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธงเธเธเธธเธซเธฅเธฒเธเธงเธดเธ—เธขเธฒเธฅเธฑเธขเธฏ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธฒเธเธฃเธเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธซเนเธงเธขเธเนเธณเธซเธญเธกเธงเธดเธ—เธขเธฒเธเธฒเธฃ';

-- Year 2565 BE / 2022 CE
INSERT INTO tournaments (name, year, season, is_active) VALUES ('NSRU E-Sport SCIWEEK', 2022, 1, 0);
SET @tid := LAST_INSERT_ID();
INSERT INTO divisions (tournament_id, level, max_teams, default_best_of) VALUES (@tid, 'JUNIOR', 32, 3), (@tid, 'SENIOR', 32, 3);
SET @jid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'JUNIOR');
SET @sid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'SENIOR');

-- 2565 JUNIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เนเธเธฃเธเธเธฃเธฐ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธธเธกเนเธชเธเธเธเธนเธ—เธดเธจ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เน€เธ—เธจเธเธฒเธฅเธงเธฑเธ”เธเธญเธกเธเธตเธฃเธตเธเธฒเธเธเธฃเธ•';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเนเธฒเธเนเธเนเธเธเธฑเธเธงเธฅเธดเธ•เธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเนเธฒเธเน€เธเธฒเธ”เธดเธ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเนเธฒเธเธ—เนเธฒเธกเธฐเธเธฃเธนเธ”';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธฅเธฒเธเธชเธฑเธเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธงเธฑเธ”เธ—เนเธฒเธ—เธญเธ';

-- 2565 SENIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เนเธเธฃเธเธเธฃเธฐ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธธเธกเนเธชเธเธเธเธนเธ—เธดเธจ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธ•เธฐเธเธฃเนเธญเธเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เน€เธ—เธจเธเธฒเธฅเธงเธฑเธ”เธเธญเธกเธเธตเธฃเธตเธเธฒเธเธเธฃเธ•';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเนเธฒเธเนเธเนเธเธเธฑเธเธงเธฅเธดเธ•เธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธถเธเธเธญเธฃเธฐเน€เธเนเธ”เธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธฅเธฒเธเธชเธฑเธเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธซเนเธงเธขเธเนเธณเธซเธญเธกเธงเธดเธ—เธขเธฒเธเธฒเธฃ';

-- Year 2566 BE / 2023 CE
INSERT INTO tournaments (name, year, season, is_active) VALUES ('NSRU E-Sport SCIWEEK', 2023, 1, 0);
SET @tid := LAST_INSERT_ID();
INSERT INTO divisions (tournament_id, level, max_teams, default_best_of) VALUES (@tid, 'JUNIOR', 32, 3), (@tid, 'SENIOR', 32, 3);
SET @jid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'JUNIOR');
SET @sid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'SENIOR');

-- 2566 JUNIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เน€เธเนเธฒเน€เธฅเธตเนเธขเธงเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธธเธกเนเธชเธเธเธเธนเธ—เธดเธจ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เน€เธ—เธจเธเธฒเธฅเธงเธฑเธ”เธเธญเธกเธเธตเธฃเธตเธเธฒเธเธเธฃเธ•';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เนเธ—เธขเธฃเธฑเธเธงเธดเธ—เธขเธฒ107 (เธเนเธฒเธเธซเธเธญเธเนเธกเนเนเธ”เธ)';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธงเธกเธดเธเธ—เธฃเธฒเธเธนเธ—เธดเธจ เธกเธฑเธเธเธดเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเนเธฒเธเธ—เนเธฒเธกเธฐเธเธฃเธนเธ”';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธขเธธเธซเธฐเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธขเธธเธซเธฐเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธฃเธฐเธเธฒเธเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธฅเธฒเธเธฒเธฅเนเธเธ•เธดเธฃเธงเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธงเธฑเธ”เธ—เนเธฒเธ—เธญเธ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'เธฃ.เธฃ.เธงเธฑเธ”เธ—เนเธฒเธ—เธญเธ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธ•เธฃเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธงเธเธเธธเธซเธฅเธฒเธเธงเธดเธ—เธขเธฒเธฅเธฑเธข (เธเธดเธฃเธเธฃเธฐเธงเธฑเธ•เธด)';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธญเธธเธ”เธกเธเธฑเธเธเธฒเธเธฃเธฐเธเธฒเธเธธเน€เธเธฃเธฒเธฐเธซเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธญเธธเธฅเธดเธ•เนเธเธเธนเธฅเธขเนเธเธเธนเธเธ–เธฑเธกเธ เน';

-- 2566 SENIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เน€เธเนเธฒเน€เธฅเธตเนเธขเธงเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เนเธเธฃเธเธเธฃเธฐ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธธเธกเนเธชเธเธเธเธนเธ—เธดเธจ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธ•เธฐเธเธฃเนเธญเธเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธ•เธฒเธเธเนเธฒเธงเธดเธเธฒเธเธฃเธฐเธชเธดเธ—เธเธดเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 2 FROM schools WHERE name = 'เธฃ.เธฃ.เธ•เธฒเธเธเนเธฒเธงเธดเธเธฒเธเธฃเธฐเธชเธดเธ—เธเธดเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เน€เธ—เธจเธเธฒเธฅเธงเธฑเธ”เธเธญเธกเธเธตเธฃเธตเธเธฒเธเธเธฃเธ•';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธงเธกเธดเธเธ—เธฃเธฒเธเธนเธ—เธดเธจ เธกเธฑเธเธเธดเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธฃเธฃเธเธ•เธเธดเธชเธฑเธขเธเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธถเธเธเธญเธฃเธฐเน€เธเนเธ”เธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธขเธธเธซเธฐเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธฅเธฒเธเธชเธฑเธเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธงเธฑเธเน€เธกเธทเธญเธเธเธเธเธฃเธฐเธชเธดเธ—เธเธดเนเธงเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธ•เธฃเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธซเนเธงเธขเธเธฃเธ”เธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธญเธธเธ”เธกเธเธฑเธเธเธฒเธเธฃเธฐเธเธฒเธเธธเน€เธเธฃเธฒเธฐเธซเน';

-- Year 2567 BE / 2024 CE
INSERT INTO tournaments (name, year, season, is_active) VALUES ('NSRU E-Sport SCIWEEK', 2024, 1, 0);
SET @tid := LAST_INSERT_ID();
INSERT INTO divisions (tournament_id, level, max_teams, default_best_of) VALUES (@tid, 'JUNIOR', 32, 3), (@tid, 'SENIOR', 32, 3);
SET @jid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'JUNIOR');
SET @sid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'SENIOR');

-- 2567 JUNIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เน€เธเนเธฒเน€เธฅเธตเนเธขเธงเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เนเธเธฃเธเธเธฃเธฐ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเนเธญเธเนเธเธเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธธเธกเนเธชเธเธเธเธนเธ—เธดเธจ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธธเธกเนเธชเธเธเธเธนเธ—เธดเธจ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เน€เธ—เธจเธเธฒเธฅเธงเธฑเธ”เธเธญเธกเธเธตเธฃเธตเธเธฒเธเธเธฃเธ•';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธงเธกเธดเธเธ—เธฃเธฒเธเธนเธ—เธดเธจ เธกเธฑเธเธเธดเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธงเธกเธดเธเธ—เธฃเธฒเธเธนเธ—เธดเธจ เธกเธฑเธเธเธดเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธขเธธเธซเธฐเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธขเธธเธซเธฐเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธฅเธฒเธเธฒเธฅเนเธเธ•เธดเธฃเธงเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธงเธฑเธเนเธเธกเธงเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธงเธฑเธ”เธซเธเธญเธเธ•เธฒเธเธน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธ•เธฃเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธ•เธฃเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';

-- 2567 SENIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธธเธกเนเธชเธเธเธเธนเธ—เธดเธจ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธ—เธฑเธเธเธคเธเธเธฑเธ’เธเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธงเธกเธดเธเธ—เธฃเธฒเธเธนเธ—เธดเธจ เธกเธฑเธเธเธดเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เน€เธเธดเธเธเธฒเธกเธฃเธฑเธเธเธฃเธฐเธเธฒเธเธธเน€เธเธฃเธฒเธฐเธซเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธขเธธเธซเธฐเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 2 FROM schools WHERE name = 'เธฃ.เธฃ.เธเธขเธธเธซเธฐเธงเธดเธ—เธขเธฒ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธฅเธฒเธเธฒเธฅเนเธเธ•เธดเธฃเธงเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธฅเธฒเธ”เธขเธฒเธงเธงเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธ•เธฃเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 2 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธ•เธฃเธตเธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธชเธฒเธเธฃเธเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธฃ.เธฃ.เธญเธธเธ—เธฑเธขเธงเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 2 FROM schools WHERE name = 'เธฃ.เธฃ.เธญเธธเธ—เธฑเธขเธงเธดเธ—เธขเธฒเธเธก';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'เธจเธเธฃ.เธเธฑเธเธเธฒเธ เธดเธงเธฑเธ’เธเน เธเธเธฃเธชเธงเธฃเธฃเธเน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 2 FROM schools WHERE name = 'เธจเธเธฃ.เธเธฑเธเธเธฒเธ เธดเธงเธฑเธ’เธเน เธเธเธฃเธชเธงเธฃเธฃเธเน';

SET FOREIGN_KEY_CHECKS = 1;
