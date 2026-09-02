package db

import "gradetrack/internal/models"

const enrollmentSelect = `SELECT e.id, e.class_id, e.student_id, u.name AS student_name, u.email AS student_email, u.is_active AS student_active
	FROM enrollments e JOIN users u ON u.id = e.student_id`

func CreateEnrollment(classID, studentID int64) (int64, error) {
	res, err := DB.Exec(`INSERT INTO enrollments (class_id, student_id) VALUES (?, ?)`, classID, studentID)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetEnrollment(id int64) (models.Enrollment, error) {
	var e models.Enrollment
	err := DB.Get(&e, enrollmentSelect+` WHERE e.id = ?`, id)
	return e, err
}

func ListEnrollments(classID int64) ([]models.Enrollment, error) {
	list := []models.Enrollment{}
	err := DB.Select(&list, enrollmentSelect+` WHERE e.class_id = ? ORDER BY u.name`, classID)
	return list, err
}

func IsEnrolled(classID, studentID int64) (bool, error) {
	var n int
	err := DB.Get(&n, `SELECT COUNT(*) FROM enrollments WHERE class_id = ? AND student_id = ?`, classID, studentID)
	return n > 0, err
}

func DeleteEnrollment(id int64) error {
	_, err := DB.Exec(`DELETE FROM enrollments WHERE id = ?`, id)
	return err
}
