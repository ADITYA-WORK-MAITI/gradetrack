package db

import "gradetrack/internal/models"

const announcementSelect = `SELECT a.id, a.class_id, a.teacher_id, u.name AS teacher_name, a.body, a.created_at
	FROM announcements a JOIN users u ON u.id = a.teacher_id`

func CreateAnnouncement(classID, teacherID int64, body string) (int64, error) {
	res, err := DB.Exec(`INSERT INTO announcements (class_id, teacher_id, body) VALUES (?, ?, ?)`, classID, teacherID, body)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetAnnouncement(id int64) (models.Announcement, error) {
	var a models.Announcement
	err := DB.Get(&a, announcementSelect+` WHERE a.id = ?`, id)
	return a, err
}

// ListAnnouncements returns a class's announcements newest first.
func ListAnnouncements(classID int64) ([]models.Announcement, error) {
	list := []models.Announcement{}
	err := DB.Select(&list, announcementSelect+` WHERE a.class_id = ? ORDER BY a.created_at DESC, a.id DESC`, classID)
	return list, err
}

func DeleteAnnouncement(id int64) error {
	_, err := DB.Exec(`DELETE FROM announcements WHERE id = ?`, id)
	return err
}
