# GradeTrack

A classroom-based student performance tracker: classes, enrollments, marks, attendance,
and a per-class performance report that aggregates marks + attendance per student.
Three roles — **admin**, **teacher**, **student** — enforced with JWT auth.

## Stack

- **Backend:** Go, Gin, sqlx with raw SQL (no ORM), MySQL
- **Auth:** bcrypt (cost 12) password hashes, HS256 JWT (8h, iss/aud pinned) carrying `user_id` and `role`
- **Frontend:** Vite + React, react-router, recharts, one `fetch` wrapper, plain CSS (Classroom-style cards, tabs, charts)

```
cmd/server/main.go        entrypoint: env, DB, router
internal/handlers/        Gin handlers, one file per resource (+ routes.go)
internal/middleware/      JWT issue/parse, AuthRequired, RequireRole
internal/models/          structs matching DB rows
internal/db/              sqlx connection + raw SQL, one file per table
web/                      React app
schema.sql                DROP + CREATE for all tables (re-run = reset)
seed.sql                  demo users, classes, assessments, marks, attendance
```

## Setup

Requires Go 1.25+, Node 18+, and a local MySQL server (8.0 or newer).

1. **Database** — create the schema and load demo data (re-running `schema.sql` resets everything):

   ```sh
   mysql -u root -p < schema.sql
   mysql -u root -p < seed.sql
   ```

2. **Environment** — copy `.env.example` to `.env` and fill in your DSN and a JWT secret:

   ```
   DB_DSN=root:yourpassword@tcp(127.0.0.1:3306)/gradetrack?parseTime=true
   JWT_SECRET=some-long-random-string
   PORT=8080
   FRONTEND_ORIGIN=http://localhost:5173   # the only origin CORS accepts
   APP_ENV=development                     # "production" tightens the CSP
   ```

3. **API server**

   ```sh
   go run ./cmd/server
   # → listening on :8080
   ```

4. **Frontend** (dev server proxies `/api` to `:8080`):

   ```sh
   cd web
   npm install
   npm run dev
   # → http://localhost:5173
   ```

## Demo accounts

Every seeded password is `password123`.

| Role    | Email                     | Notes                                   |
|---------|---------------------------|-----------------------------------------|
| admin   | admin@gradetrack.dev      |                                         |
| teacher | teacher1@gradetrack.dev   | Ananya Iyer — teaches Algebra II       |
| teacher | teacher2@gradetrack.dev   | Rohan Deshmukh — teaches Physics 101         |
| student | student1@gradetrack.dev   | Aarav Sharma — Algebra II                 |
| student | student2@gradetrack.dev   | Diya Patel — Algebra II                   |
| student | student3@gradetrack.dev   | Kabir Nair — Algebra II + Physics 101    |
| student | student4@gradetrack.dev   | Fiona Chen — Algebra II + Physics 101   |
| student | student5@gradetrack.dev   | Ishaan Reddy — Physics 101               |
| student | student6@gradetrack.dev   | Hana Kim — Physics 101                  |
| student | student7@gradetrack.dev   | Ian Brooks — Algebra II, **deactivated** (login → 403) |

## API

All routes are under `/api`, JSON in and out, snake_case fields matching the DB columns.
Errors are `{"error": "message"}` with 400/401/403/404/500. Protected routes need
`Authorization: Bearer <token>`.

| Method | Path                            | Who                                        |
|--------|---------------------------------|--------------------------------------------|
| POST   | /auth/register                  | anyone — creates a **student** (role field ignored) |
| POST   | /auth/login                     | anyone → `{token, user:{id,name,role,must_change_password}}` |
| GET    | /me                             | any logged-in user                         |
| GET    | /admin/overview                 | admin — `{students, teachers, classes, active_students, school_avg_pct, school_attendance_pct, at_risk_count, per_class:[{class_id,name,subject,teacher_name,enrolled,avg_pct,attendance_pct}]}` (two aggregate queries; active students only) |
| PUT    | /me/password                    | any logged-in user — `{old_password, new_password}` (min 8), clears must_change_password |
| GET    | /users                          | admin; optional `?q=` matches name / email / roll_no |
| POST   | /users                          | admin — `{name, email, role, roll_no?, phone?}` → `{user, temp_password}`, must_change_password set |
| POST   | /users/import                   | admin — JSON array `[{name,email,roll_no}]` → per-row `created / duplicate email / duplicate roll / invalid` + one shared `temp_password` |
| GET    | /users/:id                      | admin, or self                             |
| PUT    | /users/:id/password             | admin — issues a new `temp_password`, forces a change at next login |
| PUT    | /users/:id/active               | admin — `{is_active}` soft-deactivate / reactivate (cannot deactivate self) |
| POST   | /classes                        | admin                                      |
| GET    | /classes                        | all (admin: all, teacher: own, student: enrolled) |
| GET    | /classes/:id                    | admin, owning teacher, enrolled student    |
| PUT    | /classes/:id                    | admin or owning teacher (only admin may reassign teacher) |
| DELETE | /classes/:id                    | admin                                      |
| POST   | /classes/:id/enrollments        | admin or owning teacher                    |
| GET    | /classes/:id/enrollments        | admin or owning teacher                    |
| DELETE | /enrollments/:id                | admin or owning teacher                    |
| POST   | /classes/:id/assessments        | owning teacher — `{title, category (assignment\|quiz\|exam), term, max_score}` |
| GET    | /classes/:id/assessments        | anyone who can view the class; optional `?term=` |
| PUT    | /assessments/:id                | owning teacher                             |
| DELETE | /assessments/:id                | owning teacher (cascades to its marks)     |
| POST   | /assessments/:id/marks          | owning teacher — `{student_id, score\|null}`, upserts one student's score |
| POST   | /assessments/:id/scores         | owning teacher — `[{student_id, score\|null}, …]` bulk upsert in one transaction; any invalid entry rejects the whole request |
| GET    | /classes/:id/marks              | teacher/admin: all, student: own; joined with assessment fields; optional `?term=` |
| PUT    | /marks/:id                      | owning teacher — `{score\|null}`           |
| DELETE | /marks/:id                      | owning teacher                             |
| POST   | /classes/:id/attendance         | owning teacher — `{date, entries:[{student_id,status}]}`, upserts a whole class for one date; future dates rejected |
| GET    | /classes/:id/attendance         | teacher/admin: all, student: own           |
| GET    | /classes/:id/performance        | teacher/admin: every student, student: own row; optional `?term=` |
| POST   | /classes/:id/announcements      | owning teacher — `{body}` (≤ 2000 chars)   |
| GET    | /classes/:id/announcements      | admin, owning teacher, enrolled student — newest first, with `teacher_name` |
| DELETE | /announcements/:id              | owning teacher                             |

`/performance` aggregates per enrolled student: `average_pct` (mean of each scored mark's
`score / max_score`, NULL/missing scores excluded), `mark_count` (scored), `missing_count`,
`attendance_pct` with its counts, and `categories` — `[{category, mark_count, average_pct}]`
per assessment category. Percentages are `null` until the student has any data.

## Data model (v2)

- `assessments` — one graded item per class: `title`, `category` (assignment / quiz / exam),
  `term` (e.g. `Term 1`), `max_score`.
- `marks` — one row per (assessment, student); `score` is **nullable**: NULL means missing /
  not submitted, which is distinct from 0 and excluded from averages.
- `users` — `roll_no` (students only, unique), `phone`, `is_active`, `must_change_password`.
  Inactive accounts get `403 {"error":"account deactivated"}` on login; their marks and
  attendance are kept and shown with an "(inactive)" label. Accounts created or reset by an
  admin carry a temporary password and are forced through the change-password screen first.
- `classes.academic_year` — e.g. `2026-27`.
- `announcements` — class stream posts by the owning teacher (no comments, edits or attachments).

## Frontend features

- Class cards → class page with **Stream / Performance / Attendance / Marks / Roster** tabs.
- Teacher: bulk score entry for a whole roster (blank = missing), monthly attendance register,
  attendance for any past date, announcements, CSV export of performance / marks / register.
- Admin: user search, active toggle, password reset, staff account creation, CSV import of
  students (parsed in the browser, per-row results).
- Everyone: account menu → change password.
- Analytics: admin dashboard (stat cards, per-class average/attendance bars, teacher load); teacher
  score-distribution histogram per assessment, per-student sparklines, term comparison; student term
  deltas, per-category averages, across-class radar (≥ 3 classes) or bars, standing line.
  Students only ever see their own numbers — no ranks, no other students' names.

## Security

- **Login rate limit:** 5 attempts / minute per IP + email → `429 {"error":"too many attempts, try again shortly"}`.
- **Account lockout:** 10 consecutive failures lock the account for 15 minutes → `423 {"error":"account temporarily locked"}`
  (even with the right password). The counter and lock live in `users.failed_attempts` / `locked_until` and reset on success.
- **Passwords:** bcrypt cost 12; older hashes are transparently re-hashed on the next successful login.
- **JWT:** HS256 pinned in the parser (`WithValidMethods` + a key function that refuses any non-HMAC method), `iss=gradetrack`,
  `aud=gradetrack-web`, `exp` required, 8-hour lifetime; tokens without `user_id` / a known `role` are rejected.
- **Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a
  `Content-Security-Policy` (strict when `APP_ENV=production`, Vite-friendly otherwise), `Cache-Control: no-store`.
- **CORS:** only `FRONTEND_ORIGIN`; preflights from any other origin get 403. `X-Forwarded-For` is not trusted.
- **Body cap:** 1 MB per request → `413 {"error":"request too large"}`.
- **Validation:** length caps on every string field, scores bounded by `max_score`, no future attendance dates,
  emails lower-cased and trimmed everywhere, roll numbers `[A-Za-z0-9-]{1,30}`, unknown roles rejected.
- **Scoping:** every `:id` route is wrapped by one middleware in `internal/handlers/scope.go`
  (`RequireClassAccess/Manager/Owner`, `RequireAssessmentOwner`, `RequireMarkOwner`, `RequireEnrollmentManager`,
  `RequireAnnouncementOwner`) that walks the row up to its class and checks the caller.
- **Grade-change log:** `mark_audit(mark_id, changed_by, old_score, new_score, changed_at)` is written on every mark
  update and delete (including bulk overwrites and cascades from deleting an assessment). Write-only — no read endpoint.
- **Errors:** database and unexpected failures are logged in full server-side; clients only see `{"error":"internal error"}`.

## Notes

- Public registration creates students only. Teachers and admins are created by an admin
  (or seeded), receive a temporary password, and must change it at first sign-in.
- Deliberately out of scope: refresh tokens, tests, Docker, CI, Swagger, pagination.
  The goal is a small, readable codebase.
