// Package models holds structs that map 1:1 to database rows (plus the
// read-only performance rows returned by the aggregate queries).
package models

import "time"

type User struct {
	ID             int64      `db:"id" json:"id"`
	Name           string     `db:"name" json:"name"`
	Email          string     `db:"email" json:"email"`
	PasswordHash   string     `db:"password_hash" json:"-"`
	Role           string     `db:"role" json:"role"`
	RollNo         *string    `db:"roll_no" json:"roll_no"`
	Phone          *string    `db:"phone" json:"phone"`
	IsActive       bool       `db:"is_active" json:"is_active"`
	MustChange     bool       `db:"must_change_password" json:"must_change_password"`
	FailedAttempts int        `db:"failed_attempts" json:"-"`
	LockedUntil    *time.Time `db:"locked_until" json:"-"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
}

type Class struct {
	ID           int64  `db:"id" json:"id"`
	Name         string `db:"name" json:"name"`
	Subject      string `db:"subject" json:"subject"`
	TeacherID    int64  `db:"teacher_id" json:"teacher_id"`
	AcademicYear string `db:"academic_year" json:"academic_year"`
}

// Enrollment carries the student's name/email so rosters need no extra query.
type Enrollment struct {
	ID            int64  `db:"id" json:"id"`
	ClassID       int64  `db:"class_id" json:"class_id"`
	StudentID     int64  `db:"student_id" json:"student_id"`
	StudentName   string `db:"student_name" json:"student_name"`
	StudentEmail  string `db:"student_email" json:"student_email"`
	StudentActive bool   `db:"student_active" json:"student_active"`
}

// Assessment is one graded item for a whole class.
type Assessment struct {
	ID        int64     `db:"id" json:"id"`
	ClassID   int64     `db:"class_id" json:"class_id"`
	Title     string    `db:"title" json:"title"`
	Category  string    `db:"category" json:"category"` // assignment | quiz | exam
	Term      string    `db:"term" json:"term"`
	MaxScore  float64   `db:"max_score" json:"max_score"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// Mark is one student's score on one assessment, always returned joined with
// the assessment's descriptive fields. Score is nil when missing / not submitted.
type Mark struct {
	ID           int64     `db:"id" json:"id"`
	AssessmentID int64     `db:"assessment_id" json:"assessment_id"`
	StudentID    int64     `db:"student_id" json:"student_id"`
	Score        *float64  `db:"score" json:"score"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	ClassID      int64     `db:"class_id" json:"class_id"`
	Title        string    `db:"title" json:"title"`
	Category     string    `db:"category" json:"category"`
	Term         string    `db:"term" json:"term"`
	MaxScore     float64   `db:"max_score" json:"max_score"`
}

type Attendance struct {
	ID        int64  `db:"id" json:"id"`
	ClassID   int64  `db:"class_id" json:"class_id"`
	StudentID int64  `db:"student_id" json:"student_id"`
	Date      string `db:"date" json:"date"` // YYYY-MM-DD
	Status    string `db:"status" json:"status"`
}

// CategoryAverage is one student's average within one assessment category.
type CategoryAverage struct {
	StudentID  int64    `db:"student_id" json:"-"`
	Category   string   `db:"category" json:"category"`
	MarkCount  int      `db:"mark_count" json:"mark_count"`
	AveragePct *float64 `db:"average_pct" json:"average_pct"`
}

// Performance is one row of the per-class performance report.
// Percentages are nil when the student has no scored marks / no attendance yet.
// MarkCount counts scored marks only; MissingCount counts NULL (missing) scores.
type Performance struct {
	StudentID       int64             `db:"student_id" json:"student_id"`
	Name            string            `db:"name" json:"name"`
	IsActive        bool              `db:"is_active" json:"is_active"`
	MarkCount       int               `db:"mark_count" json:"mark_count"`
	MissingCount    int               `db:"missing_count" json:"missing_count"`
	AveragePct      *float64          `db:"average_pct" json:"average_pct"`
	AttendanceCount int               `db:"attendance_count" json:"attendance_count"`
	PresentCount    int               `db:"present_count" json:"present_count"`
	AttendancePct   *float64          `db:"attendance_pct" json:"attendance_pct"`
	Categories      []CategoryAverage `db:"-" json:"categories"`
}

// Announcement is a class-wide notice, returned with the author's name.
type Announcement struct {
	ID          int64     `db:"id" json:"id"`
	ClassID     int64     `db:"class_id" json:"class_id"`
	TeacherID   int64     `db:"teacher_id" json:"teacher_id"`
	TeacherName string    `db:"teacher_name" json:"teacher_name"`
	Body        string    `db:"body" json:"body"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// ClassOverview is one row of the admin overview.
type ClassOverview struct {
	ClassID       int64    `db:"class_id" json:"class_id"`
	Name          string   `db:"name" json:"name"`
	Subject       string   `db:"subject" json:"subject"`
	TeacherName   string   `db:"teacher_name" json:"teacher_name"`
	Enrolled      int      `db:"enrolled" json:"enrolled"`
	AvgPct        *float64 `db:"avg_pct" json:"avg_pct"`
	AttendancePct *float64 `db:"attendance_pct" json:"attendance_pct"`
}

// Overview is the admin dashboard payload. Percentages are nil with no data.
type Overview struct {
	Students            int             `db:"students" json:"students"`
	Teachers            int             `db:"teachers" json:"teachers"`
	Classes             int             `db:"classes" json:"classes"`
	ActiveStudents      int             `db:"active_students" json:"active_students"`
	SchoolAvgPct        *float64        `db:"school_avg_pct" json:"school_avg_pct"`
	SchoolAttendancePct *float64        `db:"school_attendance_pct" json:"school_attendance_pct"`
	AtRiskCount         int             `db:"at_risk_count" json:"at_risk_count"`
	PerClass            []ClassOverview `db:"-" json:"per_class"`
}
