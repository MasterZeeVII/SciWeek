-- phpMyAdmin SQL Dump
-- Structure-only export (no data) regenerated via read-only schema
-- introspection against the live database for docs/schema-drift purposes.
--
-- Host: 192.168.1.37
-- Database: sciweek
-- Server version: 8.0.46-0ubuntu0.24.04.3 (MySQL)
--
-- This file is the schema source of truth referenced by CLAUDE.md and by
-- the module docstring in src/common/models.py. There are no Django
-- migrations for the domain tables (schools, users, tournaments,
-- divisions, rounds, teams, team_members, matches, match_games) — update
-- the live database first, then mirror the change into common/models.py,
-- then regenerate this file. django_migrations/django_session are included
-- for completeness (they come from Django's own `sessions` app migration,
-- see `manage.py migrate`) but are not hand-maintained.
--
-- NOTE: structure only — no INSERT/data statements. The `users` table
-- holds real password hashes; never dump its data into this file.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------

--
-- Table structure for table `schools`
--

CREATE TABLE `schools` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_school_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tournaments`
--

CREATE TABLE `tournaments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `year` smallint unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_year` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('ADMIN','MONITOR','FIELD_STAFF') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `django_migrations`
--

CREATE TABLE `django_migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `django_session`
--

CREATE TABLE `django_session` (
  `session_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `divisions`
--

CREATE TABLE `divisions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tournament_id` int unsigned NOT NULL,
  `level` enum('JUNIOR','SENIOR') NOT NULL,
  `max_teams` tinyint unsigned NOT NULL DEFAULT '32',
  `default_best_of` tinyint unsigned NOT NULL DEFAULT '3',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_division` (`tournament_id`,`level`),
  CONSTRAINT `fk_div_tournament` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rounds`
--

CREATE TABLE `rounds` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `division_id` int unsigned NOT NULL,
  `round_number` tinyint unsigned NOT NULL,
  `round_name` varchar(50) NOT NULL DEFAULT '',
  `best_of` tinyint unsigned NOT NULL DEFAULT '3',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_round` (`division_id`,`round_number`),
  CONSTRAINT `fk_round_division` FOREIGN KEY (`division_id`) REFERENCES `divisions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teams`
--

CREATE TABLE `teams` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `division_id` int unsigned NOT NULL,
  `school_id` int unsigned NOT NULL,
  `team_number` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_team` (`division_id`,`school_id`,`team_number`),
  KEY `fk_team_school` (`school_id`),
  CONSTRAINT `fk_team_division` FOREIGN KEY (`division_id`) REFERENCES `divisions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `team_members`
--

CREATE TABLE `team_members` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `team_id` int unsigned NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `in_game_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_member_team` (`team_id`),
  CONSTRAINT `fk_member_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `matches`
--

CREATE TABLE `matches` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `round_id` int unsigned NOT NULL,
  `match_number` tinyint unsigned NOT NULL,
  `next_match_id` int unsigned DEFAULT NULL,
  `status` enum('PENDING','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'PENDING',
  `scheduled_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_match` (`round_id`,`match_number`),
  KEY `fk_match_next` (`next_match_id`),
  CONSTRAINT `fk_match_next` FOREIGN KEY (`next_match_id`) REFERENCES `matches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_match_round` FOREIGN KEY (`round_id`) REFERENCES `rounds` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `match_games`
--

CREATE TABLE `match_games` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `match_id` int unsigned NOT NULL,
  `team1_id` int unsigned NOT NULL,
  `team2_id` int unsigned NOT NULL,
  `game_number` tinyint unsigned NOT NULL,
  `winner_team_id` int unsigned DEFAULT NULL,
  `kill_team1` smallint unsigned DEFAULT NULL,
  `kill_team2` smallint unsigned DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `uploaded_by_id` int unsigned DEFAULT NULL,
  `uploaded_at` datetime DEFAULT NULL,
  `ocr_kill_team1` smallint unsigned DEFAULT NULL,
  `ocr_kill_team2` smallint unsigned DEFAULT NULL,
  `raw_ocr_json` json DEFAULT NULL,
  `ocr_status` enum('PENDING','UPLOADED','OCR_DONE','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `verified_by_id` int unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `reject_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_match_game` (`match_id`,`game_number`),
  KEY `fk_mg_team1` (`team1_id`),
  KEY `fk_mg_team2` (`team2_id`),
  KEY `fk_mg_winner` (`winner_team_id`),
  KEY `fk_mg_uploader` (`uploaded_by_id`),
  KEY `fk_mg_verifier` (`verified_by_id`),
  CONSTRAINT `fk_mg_match` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mg_team1` FOREIGN KEY (`team1_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_mg_team2` FOREIGN KEY (`team2_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_mg_uploader` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mg_verifier` FOREIGN KEY (`verified_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mg_winner` FOREIGN KEY (`winner_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
