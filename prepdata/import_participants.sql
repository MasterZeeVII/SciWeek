-- Historical SCIWEEK participant import (schools/tournaments/divisions/teams)
-- Generated from participants.txt (Toornament archive, years 2564-2567 BE / 2021-2024 CE)
-- No bracket/match results yet -- teams only.

SET FOREIGN_KEY_CHECKS = 0;

-- Schools (idempotent: skip any name that already exists)
INSERT INTO schools (name)
SELECT * FROM (SELECT 'ร.ร.ชุมแสงชนูทิศ' AS name
    UNION ALL SELECT 'ร.ร.ช่องแคพิทยาคม'
    UNION ALL SELECT 'ร.ร.ตะคร้อพิทยา'
    UNION ALL SELECT 'ร.ร.ตะพานหิน'
    UNION ALL SELECT 'ร.ร.ตากฟ้าวิชาประสิทธิ์'
    UNION ALL SELECT 'ร.ร.ทับกฤชพัฒนา'
    UNION ALL SELECT 'ร.ร.ท่าตะโกพิทยาคม'
    UNION ALL SELECT 'ร.ร.นครสวรรค์'
    UNION ALL SELECT 'ร.ร.นวมินทราชูทิศ มัชฌิม'
    UNION ALL SELECT 'ร.ร.บรรพตพิสัยพิทยาคม'
    UNION ALL SELECT 'ร.ร.บึงบอระเพ็ดวิทยา'
    UNION ALL SELECT 'ร.ร.บ้านท่ามะกรูด'
    UNION ALL SELECT 'ร.ร.บ้านเขาดิน'
    UNION ALL SELECT 'ร.ร.บ้านเพชรมงคล'
    UNION ALL SELECT 'ร.ร.บ้านแก่งชัชวลิตวิทยา'
    UNION ALL SELECT 'ร.ร.พยุหะวิทยา'
    UNION ALL SELECT 'ร.ร.พระบางวิทยา'
    UNION ALL SELECT 'ร.ร.ลาซาลโชติรวีนครสวรรค์'
    UNION ALL SELECT 'ร.ร.ลาดยาววิทยาคม'
    UNION ALL SELECT 'ร.ร.ลานสักวิทยา'
    UNION ALL SELECT 'ร.ร.วังเมืองชนประสิทธิ์วิทยาคม'
    UNION ALL SELECT 'ร.ร.วังแขมวิทยาคม'
    UNION ALL SELECT 'ร.ร.วัดท่าทอง'
    UNION ALL SELECT 'ร.ร.วัดหนองตางู'
    UNION ALL SELECT 'ร.ร.สตรีนครสวรรค์'
    UNION ALL SELECT 'ร.ร.สวนกุหลาบวิทยาลัย (จิรประวัติ)'
    UNION ALL SELECT 'ร.ร.สวนกุหลาบวิทยาลัยฯ'
    UNION ALL SELECT 'ร.ร.สาครพิทยาคม'
    UNION ALL SELECT 'ร.ร.ห้วยกรดวิทยา'
    UNION ALL SELECT 'ร.ร.ห้วยน้ำหอมวิทยาคาร'
    UNION ALL SELECT 'ร.ร.อุดมธัญญาประชานุเคราะห์'
    UNION ALL SELECT 'ร.ร.อุทัยวิทยาคม'
    UNION ALL SELECT 'ร.ร.อุลิตไพบูลย์ชนูปถัมภ์'
    UNION ALL SELECT 'ร.ร.เก้าเลี้ยววิทยา'
    UNION ALL SELECT 'ร.ร.เทศบาลวัดจอมคีรีนาคพรต'
    UNION ALL SELECT 'ร.ร.เนินขามรัฐประชานุเคราะห์'
    UNION ALL SELECT 'ร.ร.เมตตาวิทยา'
    UNION ALL SELECT 'ร.ร.โกรกพระ'
    UNION ALL SELECT 'ร.ร.ไทยรัฐวิทยา107 (บ้านหนองไม้แดง)'
    UNION ALL SELECT 'ศกร.ปัญญาภิวัฒน์ นครสวรรค์'
) AS new_schools
WHERE new_schools.name NOT IN (SELECT name FROM schools);

-- Year 2564 BE / 2021 CE
INSERT INTO tournaments (name, year, is_active) VALUES ('NSRU E-Sport SCIWEEK', 2021, 0);
SET @tid := LAST_INSERT_ID();
INSERT INTO divisions (tournament_id, level, max_teams, default_best_of) VALUES (@tid, 'JUNIOR', 32, 3), (@tid, 'SENIOR', 32, 3);
SET @jid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'JUNIOR');
SET @sid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'SENIOR');

-- 2564 JUNIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ชุมแสงชนูทิศ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ตะพานหิน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ท่าตะโกพิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.บ้านเพชรมงคล';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.วัดท่าทอง';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.สตรีนครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.สวนกุหลาบวิทยาลัยฯ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.สาครพิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ห้วยน้ำหอมวิทยาคาร';

-- 2564 SENIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ชุมแสงชนูทิศ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ตะคร้อพิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ท่าตะโกพิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.บ้านแก่งชัชวลิตวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.เมตตาวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.สตรีนครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.สวนกุหลาบวิทยาลัยฯ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.สาครพิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ห้วยน้ำหอมวิทยาคาร';

-- Year 2565 BE / 2022 CE
INSERT INTO tournaments (name, year, is_active) VALUES ('NSRU E-Sport SCIWEEK', 2022, 0);
SET @tid := LAST_INSERT_ID();
INSERT INTO divisions (tournament_id, level, max_teams, default_best_of) VALUES (@tid, 'JUNIOR', 32, 3), (@tid, 'SENIOR', 32, 3);
SET @jid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'JUNIOR');
SET @sid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'SENIOR');

-- 2565 JUNIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.โกรกพระ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ชุมแสงชนูทิศ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.เทศบาลวัดจอมคีรีนาคพรต';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.บ้านแก่งชัชวลิตวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.บ้านเขาดิน';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.บ้านท่ามะกรูด';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ลานสักวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.วัดท่าทอง';

-- 2565 SENIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.โกรกพระ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ชุมแสงชนูทิศ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ตะคร้อพิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.เทศบาลวัดจอมคีรีนาคพรต';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.บ้านแก่งชัชวลิตวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.บึงบอระเพ็ดวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ลานสักวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ห้วยน้ำหอมวิทยาคาร';

-- Year 2566 BE / 2023 CE
INSERT INTO tournaments (name, year, is_active) VALUES ('NSRU E-Sport SCIWEEK', 2023, 0);
SET @tid := LAST_INSERT_ID();
INSERT INTO divisions (tournament_id, level, max_teams, default_best_of) VALUES (@tid, 'JUNIOR', 32, 3), (@tid, 'SENIOR', 32, 3);
SET @jid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'JUNIOR');
SET @sid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'SENIOR');

-- 2566 JUNIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.เก้าเลี้ยววิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ชุมแสงชนูทิศ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.เทศบาลวัดจอมคีรีนาคพรต';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ไทยรัฐวิทยา107 (บ้านหนองไม้แดง)';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.นวมินทราชูทิศ มัชฌิม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.บ้านท่ามะกรูด';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.พยุหะวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'ร.ร.พยุหะวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.พระบางวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ลาซาลโชติรวีนครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.วัดท่าทอง';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'ร.ร.วัดท่าทอง';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.สตรีนครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.สวนกุหลาบวิทยาลัย (จิรประวัติ)';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.อุดมธัญญาประชานุเคราะห์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.อุลิตไพบูลย์ชนูปถัมภ์';

-- 2566 SENIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.เก้าเลี้ยววิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.โกรกพระ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ชุมแสงชนูทิศ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ตะคร้อพิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ตากฟ้าวิชาประสิทธิ์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 2 FROM schools WHERE name = 'ร.ร.ตากฟ้าวิชาประสิทธิ์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.เทศบาลวัดจอมคีรีนาคพรต';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.นวมินทราชูทิศ มัชฌิม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.บรรพตพิสัยพิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.บึงบอระเพ็ดวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.พยุหะวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ลานสักวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.วังเมืองชนประสิทธิ์วิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.สตรีนครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ห้วยกรดวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.อุดมธัญญาประชานุเคราะห์';

-- Year 2567 BE / 2024 CE
INSERT INTO tournaments (name, year, is_active) VALUES ('NSRU E-Sport SCIWEEK', 2024, 0);
SET @tid := LAST_INSERT_ID();
INSERT INTO divisions (tournament_id, level, max_teams, default_best_of) VALUES (@tid, 'JUNIOR', 32, 3), (@tid, 'SENIOR', 32, 3);
SET @jid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'JUNIOR');
SET @sid := (SELECT id FROM divisions WHERE tournament_id = @tid AND level = 'SENIOR');

-- 2567 JUNIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.เก้าเลี้ยววิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.โกรกพระ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ช่องแคพิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ชุมแสงชนูทิศ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'ร.ร.ชุมแสงชนูทิศ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.เทศบาลวัดจอมคีรีนาคพรต';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.นครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.นวมินทราชูทิศ มัชฌิม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'ร.ร.นวมินทราชูทิศ มัชฌิม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.พยุหะวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'ร.ร.พยุหะวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.ลาซาลโชติรวีนครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.วังแขมวิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.วัดหนองตางู';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 1 FROM schools WHERE name = 'ร.ร.สตรีนครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @jid, id, 2 FROM schools WHERE name = 'ร.ร.สตรีนครสวรรค์';

-- 2567 SENIOR teams
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ชุมแสงชนูทิศ';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ทับกฤชพัฒนา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.นครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.นวมินทราชูทิศ มัชฌิม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.เนินขามรัฐประชานุเคราะห์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.พยุหะวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 2 FROM schools WHERE name = 'ร.ร.พยุหะวิทยา';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ลาซาลโชติรวีนครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.ลาดยาววิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.สตรีนครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 2 FROM schools WHERE name = 'ร.ร.สตรีนครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.สาครพิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ร.ร.อุทัยวิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 2 FROM schools WHERE name = 'ร.ร.อุทัยวิทยาคม';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 1 FROM schools WHERE name = 'ศกร.ปัญญาภิวัฒน์ นครสวรรค์';
INSERT INTO teams (division_id, school_id, team_number) SELECT @sid, id, 2 FROM schools WHERE name = 'ศกร.ปัญญาภิวัฒน์ นครสวรรค์';

SET FOREIGN_KEY_CHECKS = 1;
