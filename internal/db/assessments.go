package db

import "gradetrack/internal/models"

func CreateAssessment(classID int64, title, category, term string, maxScore float64) (int64, error) {
	res, err := DB.Exec(`INSERT INTO assessments (class_id, title, category, term, max_score) VALUES (?, ?, ?, ?, ?)`,
		classID, title, category, term, maxScore)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetAssessment(id int64) (models.Assessment, error) {
	var a models.Assessment
	err := DB.Get(&a, `SELECT * FROM assessments WHERE id = ?`, id)
	return a, err
}

// ListAssessments returns a class's assessments; term = "" means every term.
func ListAssessments(classID int64, term string) ([]models.Assessment, error) {
	list := []models.Assessment{}
	err := DB.Select(&list, `SELECT * FROM assessments
		WHERE class_id = ? AND (? = '' OR term = ?)
		ORDER BY created_at, id`, classID, term, term)
	return list, err
}

func UpdateAssessment(id int64, title, category, term string, maxScore float64) error {
	_, err := DB.Exec(`UPDATE assessments SET title = ?, category = ?, term = ?, max_score = ? WHERE id = ?`,
		title, category, term, maxScore, id)
	return err
}

// CountScoresAbove counts recorded scores on an assessment that exceed a limit —
// used to refuse lowering max_score below an existing score.
func CountScoresAbove(assessmentID int64, limit float64) (int, error) {
	var n int
	err := DB.Get(&n, `SELECT COUNT(*) FROM marks WHERE assessment_id = ? AND score > ?`, assessmentID, limit)
	return n, err
}

// DeleteAssessment removes the assessment and (via FK cascade) every mark on
// it. Each mark that disappears is written to mark_audit first.
func DeleteAssessment(id int64, changedBy int64) error {
	tx, err := DB.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	marks := []existingScore{}
	if err := tx.Select(&marks, `SELECT id, score FROM marks WHERE assessment_id = ? FOR UPDATE`, id); err != nil {
		return err
	}
	for _, m := range marks {
		if err := audit(tx, m.ID, changedBy, m.Score, nil); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(`DELETE FROM assessments WHERE id = ?`, id); err != nil {
		return err
	}
	return tx.Commit()
}
