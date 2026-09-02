package db

import "gradetrack/internal/models"

// AttendanceEntry is one student's status for a given date.
type AttendanceEntry struct {
	StudentID int64  `json:"student_id"`
	Status    string `json:"status"`
}

// UpsertAttendance records a whole class for one date in a single
// transaction, overwriting any existing status for that student/date.
func UpsertAttendance(classID int64, date string, entries []AttendanceEntry) error {
	tx, err := DB.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, e := range entries {
		_, err := tx.Exec(`INSERT INTO attendance (class_id, student_id, date, status) VALUES (?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE status = VALUES(status)`, classID, e.StudentID, date, e.Status)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ListAttendance returns a class's attendance; studentID = 0 means all students.
func ListAttendance(classID, studentID int64) ([]models.Attendance, error) {
	list := []models.Attendance{}
	err := DB.Select(&list, `SELECT id, class_id, student_id, DATE_FORMAT(date, '%Y-%m-%d') AS date, status
		FROM attendance
		WHERE class_id = ? AND (? = 0 OR student_id = ?)
		ORDER BY date, student_id`, classID, studentID, studentID)
	return list, err
}
