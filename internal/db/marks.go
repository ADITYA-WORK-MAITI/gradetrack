package db

import (
	"database/sql"
	"errors"

	"github.com/jmoiron/sqlx"

	"gradetrack/internal/models"
)

// Marks are always read joined with their assessment so callers get the
// title / category / term / max_score without a second query.
const markSelect = `SELECT m.id, m.assessment_id, m.student_id, m.score, m.created_at,
	a.class_id, a.title, a.category, a.term, a.max_score
	FROM marks m JOIN assessments a ON a.id = m.assessment_id`

// ScoreEntry is one student's score in a bulk submission (nil = missing).
type ScoreEntry struct {
	StudentID int64    `json:"student_id"`
	Score     *float64 `json:"score"`
}

// existingScore is one (mark id, score) pair used to diff before an upsert.
type existingScore struct {
	ID    int64    `db:"id"`
	Score *float64 `db:"score"`
}

func sameScore(a, b *float64) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

// audit appends one mark_audit row inside tx. new = nil for deletions or
// a score cleared to missing.
func audit(tx *sqlx.Tx, markID, changedBy int64, old, new *float64) error {
	_, err := tx.Exec(`INSERT INTO mark_audit (mark_id, changed_by, old_score, new_score) VALUES (?, ?, ?, ?)`,
		markID, changedBy, old, new)
	return err
}

// UpsertMark records (or overwrites) one student's score on an assessment and
// returns the mark's id. Overwrites of a different value are audited.
func UpsertMark(assessmentID, studentID int64, score *float64, changedBy int64) (int64, error) {
	tx, err := DB.Beginx()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var prev existingScore
	err = tx.Get(&prev, `SELECT id, score FROM marks WHERE assessment_id = ? AND student_id = ? FOR UPDATE`, assessmentID, studentID)
	existed := err == nil
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return 0, err
	}
	res, err := tx.Exec(`INSERT INTO marks (assessment_id, student_id, score) VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE score = VALUES(score), id = LAST_INSERT_ID(id)`,
		assessmentID, studentID, score)
	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	if existed && !sameScore(prev.Score, score) {
		if err := audit(tx, prev.ID, changedBy, prev.Score, score); err != nil {
			return 0, err
		}
	}
	return id, tx.Commit()
}

// BulkUpsertMarks writes every entry in one transaction: either all scores
// land or none do. Changed existing scores are audited.
func BulkUpsertMarks(assessmentID int64, entries []ScoreEntry, changedBy int64) error {
	tx, err := DB.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	rows := []struct {
		existingScore
		StudentID int64 `db:"student_id"`
	}{}
	if err := tx.Select(&rows, `SELECT id, student_id, score FROM marks WHERE assessment_id = ? FOR UPDATE`, assessmentID); err != nil {
		return err
	}
	prev := map[int64]existingScore{}
	for _, r := range rows {
		prev[r.StudentID] = r.existingScore
	}
	for _, e := range entries {
		if _, err := tx.Exec(`INSERT INTO marks (assessment_id, student_id, score) VALUES (?, ?, ?)
			ON DUPLICATE KEY UPDATE score = VALUES(score)`, assessmentID, e.StudentID, e.Score); err != nil {
			return err
		}
		if p, ok := prev[e.StudentID]; ok && !sameScore(p.Score, e.Score) {
			if err := audit(tx, p.ID, changedBy, p.Score, e.Score); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func GetMark(id int64) (models.Mark, error) {
	var m models.Mark
	err := DB.Get(&m, markSelect+` WHERE m.id = ?`, id)
	return m, err
}

// ListMarks returns a class's marks; studentID = 0 means all students,
// term = "" means every term.
func ListMarks(classID, studentID int64, term string) ([]models.Mark, error) {
	marks := []models.Mark{}
	err := DB.Select(&marks, markSelect+`
		WHERE a.class_id = ? AND (? = 0 OR m.student_id = ?) AND (? = '' OR a.term = ?)
		ORDER BY m.created_at, m.id`, classID, studentID, studentID, term, term)
	return marks, err
}

// UpdateMarkScore changes one score and audits the change.
func UpdateMarkScore(id int64, score *float64, changedBy int64) error {
	tx, err := DB.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var prev existingScore
	if err := tx.Get(&prev, `SELECT id, score FROM marks WHERE id = ? FOR UPDATE`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE marks SET score = ? WHERE id = ?`, score, id); err != nil {
		return err
	}
	if !sameScore(prev.Score, score) {
		if err := audit(tx, id, changedBy, prev.Score, score); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// DeleteMark removes one mark, logging old_score → NULL.
func DeleteMark(id int64, changedBy int64) error {
	tx, err := DB.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var prev existingScore
	if err := tx.Get(&prev, `SELECT id, score FROM marks WHERE id = ? FOR UPDATE`, id); err != nil {
		return err
	}
	if err := audit(tx, id, changedBy, prev.Score, nil); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM marks WHERE id = ?`, id); err != nil {
		return err
	}
	return tx.Commit()
}
