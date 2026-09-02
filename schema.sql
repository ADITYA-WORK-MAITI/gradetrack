-- GradeTrack schema (v2). Re-running this file drops and recreates every table (full reset).
--   mysql -u <user> -p < schema.sql

CREATE DATABASE IF NOT EXISTS gradetrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gradetrack;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS mark_audit;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS marks;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin', 'teacher', 'student') NOT NULL,
    roll_no       VARCHAR(30) NULL,            -- students only (enforced by the API)
    phone         VARCHAR(30) NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,  -- consecutive bad logins
    locked_until  DATETIME NULL,                      -- set after 10 failures
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_roll_no (roll_no)
) ENGINE=InnoDB;

CREATE TABLE classes (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL,
    subject       VARCHAR(100) NOT NULL,
    teacher_id    INT UNSIGNED NOT NULL,
    academic_year VARCHAR(9) NOT NULL DEFAULT '2026-27',
    PRIMARY KEY (id),
    CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE enrollments (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    class_id   INT UNSIGNED NOT NULL,
    student_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_enrollment (class_id, student_id),
    CONSTRAINT fk_enrollments_class   FOREIGN KEY (class_id)   REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES users (id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- An assessment is one graded item for a whole class (an assignment, quiz or exam).
CREATE TABLE assessments (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    class_id   INT UNSIGNED NOT NULL,
    title      VARCHAR(200) NOT NULL,
    category   ENUM('assignment', 'quiz', 'exam') NOT NULL,
    term       VARCHAR(50) NOT NULL,
    max_score  DECIMAL(6,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_assessments_class (class_id, term),
    CONSTRAINT fk_assessments_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT chk_assessments_max CHECK (max_score > 0)
) ENGINE=InnoDB;

-- One student's score on one assessment. NULL score = missing / not submitted (distinct from 0).
CREATE TABLE marks (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    assessment_id INT UNSIGNED NOT NULL,
    student_id    INT UNSIGNED NOT NULL,
    score         DECIMAL(6,2) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_mark (assessment_id, student_id),
    KEY idx_marks_student (student_id),
    CONSTRAINT fk_marks_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE,
    CONSTRAINT fk_marks_student    FOREIGN KEY (student_id)    REFERENCES users (id)       ON DELETE CASCADE,
    CONSTRAINT chk_marks_score CHECK (score IS NULL OR score >= 0)
) ENGINE=InnoDB;

CREATE TABLE attendance (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    class_id   INT UNSIGNED NOT NULL,
    student_id INT UNSIGNED NOT NULL,
    date       DATE NOT NULL,
    status     ENUM('present', 'absent') NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attendance (class_id, student_id, date),
    CONSTRAINT fk_attendance_class   FOREIGN KEY (class_id)   REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES users (id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- Short class-wide notices posted by the owning teacher (no comments / edits / attachments).
CREATE TABLE announcements (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    class_id   INT UNSIGNED NOT NULL,
    teacher_id INT UNSIGNED NOT NULL,
    body       VARCHAR(2000) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_announcements_class (class_id, created_at),
    CONSTRAINT fk_announcements_class   FOREIGN KEY (class_id)   REFERENCES classes (id) ON DELETE CASCADE,
    CONSTRAINT fk_announcements_teacher FOREIGN KEY (teacher_id) REFERENCES users (id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- Grade-change log. Written on every mark update / delete (deletes log new_score NULL).
-- mark_id is deliberately not a foreign key so the history survives the mark's deletion.
CREATE TABLE mark_audit (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    mark_id    INT UNSIGNED NOT NULL,
    changed_by INT UNSIGNED NOT NULL,
    old_score  DECIMAL(6,2) NULL,
    new_score  DECIMAL(6,2) NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_mark_audit_mark (mark_id),
    CONSTRAINT fk_mark_audit_user FOREIGN KEY (changed_by) REFERENCES users (id)
) ENGINE=InnoDB;
