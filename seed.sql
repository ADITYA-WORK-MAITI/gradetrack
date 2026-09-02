-- Demo data. Run after schema.sql:
--   mysql -u <user> -p < seed.sql
-- Every user's password is: password123
USE gradetrack;

-- bcrypt hash of "password123" (cost 12)
SET @pw = '$2a$12$yDEegr8FQoCja3NAQM7O4OFm7sBG5W6Htodq.UO8Uua98NbuwqgQu';

INSERT INTO users (id, name, email, password_hash, role, roll_no, phone, is_active) VALUES
  (1, 'Priya Menon',   'admin@gradetrack.dev',    @pw, 'admin',   NULL,    NULL,       TRUE),
  (2, 'Ananya Iyer', 'teacher1@gradetrack.dev', @pw, 'teacher', NULL,    '555-0101', TRUE),
  (3, 'Rohan Deshmukh',    'teacher2@gradetrack.dev', @pw, 'teacher', NULL,    '555-0102', TRUE),
  (4, 'Aarav Sharma',   'student1@gradetrack.dev', @pw, 'student', 'R1001', NULL,       TRUE),
  (5, 'Diya Patel',     'student2@gradetrack.dev', @pw, 'student', 'R1002', NULL,       TRUE),
  (6, 'Kabir Nair',    'student3@gradetrack.dev', @pw, 'student', 'R1003', NULL,       TRUE),
  (7, 'Fiona Chen',   'student4@gradetrack.dev', @pw, 'student', 'R1004', NULL,       TRUE),
  (8, 'Ishaan Reddy',  'student5@gradetrack.dev', @pw, 'student', 'R1005', NULL,       TRUE),
  (9, 'Hana Kim',     'student6@gradetrack.dev', @pw, 'student', 'R1006', NULL,       TRUE),
  -- Ian left the school mid-term: deactivated, but his Algebra II history is kept.
  (10, 'Ian Brooks',  'student7@gradetrack.dev', @pw, 'student', 'R1007', NULL,       FALSE);

INSERT INTO classes (id, name, subject, teacher_id, academic_year) VALUES
  (1, 'Algebra II',  'Mathematics', 2, '2026-27'),
  (2, 'Physics 101', 'Physics',     3, '2026-27');

INSERT INTO enrollments (class_id, student_id) VALUES
  (1, 4), (1, 5), (1, 6), (1, 7), (1, 10),
  (2, 6), (2, 7), (2, 8), (2, 9);

-- Five assessments per class: three in Term 1, two in Term 2, mixed categories.
INSERT INTO assessments (id, class_id, title, category, term, max_score, created_at) VALUES
  -- Algebra II
  (1, 1, 'Assignment 1', 'assignment', 'Term 1',  20, '2026-06-05 09:00:00'),
  (2, 1, 'Quiz 1',       'quiz',       'Term 1',  10, '2026-06-19 09:00:00'),
  (3, 1, 'Midterm Exam', 'exam',       'Term 1', 100, '2026-07-10 09:00:00'),
  (4, 1, 'Assignment 2', 'assignment', 'Term 2',  20, '2026-08-07 09:00:00'),
  (5, 1, 'Quiz 2',       'quiz',       'Term 2',  10, '2026-08-21 09:00:00'),
  -- Physics 101
  (6, 2, 'Lab 1',        'assignment', 'Term 1',  50, '2026-06-08 09:00:00'),
  (7, 2, 'Quiz 1',       'quiz',       'Term 1',  10, '2026-06-22 09:00:00'),
  (8, 2, 'Midterm Exam', 'exam',       'Term 1', 100, '2026-07-13 09:00:00'),
  (9, 2, 'Lab 2',        'assignment', 'Term 2',  50, '2026-08-10 09:00:00'),
  (10, 2, 'Quiz 2',      'quiz',       'Term 2',  10, '2026-08-24 09:00:00');

-- Per-student scores. NULL = missing / not submitted. created_at follows the assessment date
-- so the marks-over-time charts have a real timeline.
INSERT INTO marks (assessment_id, student_id, score, created_at) VALUES
  -- Algebra II: Aarav (4), Diya (5), Kabir (6), Fiona (7)
  (1, 4, 18,   '2026-06-05 10:00:00'), (1, 5, 15,   '2026-06-05 10:00:00'), (1, 6, 20,   '2026-06-05 10:00:00'), (1, 7, 8,    '2026-06-05 10:00:00'),
  (2, 4, 8,    '2026-06-19 10:00:00'), (2, 5, NULL, '2026-06-19 10:00:00'), (2, 6, 9,    '2026-06-19 10:00:00'), (2, 7, 3,    '2026-06-19 10:00:00'),
  (3, 4, 72,   '2026-07-10 10:00:00'), (3, 5, 85,   '2026-07-10 10:00:00'), (3, 6, 90,   '2026-07-10 10:00:00'), (3, 7, 38,   '2026-07-10 10:00:00'),
  (4, 4, 16,   '2026-08-07 10:00:00'), (4, 5, 17,   '2026-08-07 10:00:00'), (4, 6, 19,   '2026-08-07 10:00:00'), (4, 7, NULL, '2026-08-07 10:00:00'),
  (5, 4, 7,    '2026-08-21 10:00:00'), (5, 5, 9,    '2026-08-21 10:00:00'), (5, 6, 10,   '2026-08-21 10:00:00'), (5, 7, 4,    '2026-08-21 10:00:00'),
  -- Ian (10, inactive): Term 1 only
  (1, 10, 14,  '2026-06-05 10:00:00'), (2, 10, 6,   '2026-06-19 10:00:00'), (3, 10, 61,  '2026-07-10 10:00:00'),
  -- Physics 101: Kabir (6), Fiona (7), Ishaan (8), Hana (9)
  (6, 6, 45,   '2026-06-08 10:00:00'), (6, 7, 30,   '2026-06-08 10:00:00'), (6, 8, 48,   '2026-06-08 10:00:00'), (6, 9, 38,   '2026-06-08 10:00:00'),
  (7, 6, 8,    '2026-06-22 10:00:00'), (7, 7, 6,    '2026-06-22 10:00:00'), (7, 8, 10,   '2026-06-22 10:00:00'), (7, 9, NULL, '2026-06-22 10:00:00'),
  (8, 6, 78,   '2026-07-13 10:00:00'), (8, 7, 62,   '2026-07-13 10:00:00'), (8, 8, 91,   '2026-07-13 10:00:00'), (8, 9, 55,   '2026-07-13 10:00:00'),
  (9, 6, 41,   '2026-08-10 10:00:00'), (9, 7, NULL, '2026-08-10 10:00:00'), (9, 8, 47,   '2026-08-10 10:00:00'), (9, 9, 33,   '2026-08-10 10:00:00'),
  (10, 6, 9,   '2026-08-24 10:00:00'), (10, 7, 5,   '2026-08-24 10:00:00'), (10, 8, 9,   '2026-08-24 10:00:00'), (10, 9, 6,   '2026-08-24 10:00:00');

-- Attendance. Fiona (7) is absence-heavy in Algebra II; Hana (9) misses half of Physics.
INSERT INTO attendance (class_id, student_id, date, status) VALUES
  -- Algebra II: two weeks, Mon-Fri, 2026-08-17 .. 2026-08-28
  (1, 4, '2026-08-17', 'present'), (1, 4, '2026-08-18', 'present'), (1, 4, '2026-08-19', 'present'), (1, 4, '2026-08-20', 'absent'),  (1, 4, '2026-08-21', 'present'),
  (1, 4, '2026-08-24', 'present'), (1, 4, '2026-08-25', 'present'), (1, 4, '2026-08-26', 'absent'),  (1, 4, '2026-08-27', 'present'), (1, 4, '2026-08-28', 'present'),
  (1, 5, '2026-08-17', 'present'), (1, 5, '2026-08-18', 'present'), (1, 5, '2026-08-19', 'present'), (1, 5, '2026-08-20', 'present'), (1, 5, '2026-08-21', 'present'),
  (1, 5, '2026-08-24', 'present'), (1, 5, '2026-08-25', 'present'), (1, 5, '2026-08-26', 'present'), (1, 5, '2026-08-27', 'present'), (1, 5, '2026-08-28', 'present'),
  (1, 6, '2026-08-17', 'present'), (1, 6, '2026-08-18', 'absent'),  (1, 6, '2026-08-19', 'present'), (1, 6, '2026-08-20', 'present'), (1, 6, '2026-08-21', 'present'),
  (1, 6, '2026-08-24', 'present'), (1, 6, '2026-08-25', 'absent'),  (1, 6, '2026-08-26', 'present'), (1, 6, '2026-08-27', 'present'), (1, 6, '2026-08-28', 'present'),
  (1, 7, '2026-08-17', 'absent'),  (1, 7, '2026-08-18', 'absent'),  (1, 7, '2026-08-19', 'present'), (1, 7, '2026-08-20', 'absent'),  (1, 7, '2026-08-21', 'absent'),
  (1, 7, '2026-08-24', 'present'), (1, 7, '2026-08-25', 'absent'),  (1, 7, '2026-08-26', 'present'), (1, 7, '2026-08-27', 'absent'),  (1, 7, '2026-08-28', 'absent'),
  (1, 10, '2026-08-17', 'present'), (1, 10, '2026-08-18', 'present'), (1, 10, '2026-08-19', 'absent'),  (1, 10, '2026-08-20', 'present'), (1, 10, '2026-08-21', 'present'),
  -- Physics 101: Tue-Thu over two weeks, 2026-08-18 .. 2026-08-27
  (2, 6, '2026-08-18', 'present'), (2, 6, '2026-08-19', 'present'), (2, 6, '2026-08-20', 'present'), (2, 6, '2026-08-25', 'present'), (2, 6, '2026-08-26', 'present'), (2, 6, '2026-08-27', 'present'),
  (2, 7, '2026-08-18', 'present'), (2, 7, '2026-08-19', 'absent'),  (2, 7, '2026-08-20', 'present'), (2, 7, '2026-08-25', 'present'), (2, 7, '2026-08-26', 'absent'),  (2, 7, '2026-08-27', 'present'),
  (2, 8, '2026-08-18', 'present'), (2, 8, '2026-08-19', 'present'), (2, 8, '2026-08-20', 'present'), (2, 8, '2026-08-25', 'present'), (2, 8, '2026-08-26', 'present'), (2, 8, '2026-08-27', 'absent'),
  (2, 9, '2026-08-18', 'absent'),  (2, 9, '2026-08-19', 'present'), (2, 9, '2026-08-20', 'absent'),  (2, 9, '2026-08-25', 'present'), (2, 9, '2026-08-26', 'absent'),  (2, 9, '2026-08-27', 'present');

INSERT INTO announcements (class_id, teacher_id, body, created_at) VALUES
  (1, 2, 'Welcome back! Quiz 2 results are posted — see me during office hours if you want to go over your paper.', '2026-08-24 08:30:00'),
  (1, 2, 'Reminder: Assignment 3 (systems of equations) is due next Friday. Show your working for full credit.', '2026-08-28 15:10:00'),
  (2, 3, 'Lab 2 write-ups are graded. Average was a little low on the error analysis section — we will revisit it Tuesday.', '2026-08-25 12:00:00'),
  (2, 3, 'Bring a calculator to every session from now on; the next quiz is closed-book.', '2026-08-27 09:45:00');

-- One-time normalization: emails are stored lower-cased and trimmed (the API does the same).
UPDATE users SET email = LOWER(TRIM(email));
