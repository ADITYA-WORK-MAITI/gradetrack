package db

import (
	"fmt"

	"gradetrack/internal/models"
)

func CreateClass(name, subject string, teacherID int64, academicYear string) (int64, error) {
	res, err := DB.Exec(`INSERT INTO classes (name, subject, teacher_id, academic_year) VALUES (?, ?, ?, ?)`,
		name, subject, teacherID, academicYear)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetClass(id int64) (models.Class, error) {
	var c models.Class
	err := DB.Get(&c, `SELECT * FROM classes WHERE id = ?`, id)
	return c, err
}

// ListClassesFor returns the classes visible to a user: all for admins,
// their own for teachers, enrolled ones for students.
func ListClassesFor(userID int64, role string) ([]models.Class, error) {
	classes := []models.Class{}
	var err error
	switch role {
	case "admin":
		err = DB.Select(&classes, `SELECT * FROM classes ORDER BY id`)
	case "teacher":
		err = DB.Select(&classes, `SELECT * FROM classes WHERE teacher_id = ? ORDER BY id`, userID)
	case "student":
		err = DB.Select(&classes, `SELECT c.* FROM classes c
			JOIN enrollments e ON e.class_id = c.id
			WHERE e.student_id = ? ORDER BY c.id`, userID)
	default:
		err = fmt.Errorf("unknown role %q", role)
	}
	return classes, err
}

func UpdateClass(id int64, name, subject string, teacherID int64, academicYear string) error {
	_, err := DB.Exec(`UPDATE classes SET name = ?, subject = ?, teacher_id = ?, academic_year = ? WHERE id = ?`,
		name, subject, teacherID, academicYear, id)
	return err
}

func DeleteClass(id int64) error {
	_, err := DB.Exec(`DELETE FROM classes WHERE id = ?`, id)
	return err
}
