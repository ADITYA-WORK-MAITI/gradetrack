package db

import "gradetrack/internal/models"

// ClassPerformance aggregates marks and attendance per enrolled student.
// studentID = 0 returns every enrolled student; otherwise only that student.
// term = "" includes every assessment; otherwise only that term's.
// Marks and attendance are pre-aggregated in subqueries so joining both
// onto the roster doesn't multiply rows. NULL (missing) scores are excluded
// from averages (AVG skips NULL) and counted separately as missing_count.
func ClassPerformance(classID, studentID int64, term string) ([]models.Performance, error) {
	rows := []models.Performance{}
	err := DB.Select(&rows, `
		SELECT u.id AS student_id, u.name, u.is_active,
		       COALESCE(m.mark_count, 0)       AS mark_count,
		       COALESCE(m.missing_count, 0)    AS missing_count,
		       m.average_pct,
		       COALESCE(a.attendance_count, 0) AS attendance_count,
		       COALESCE(a.present_count, 0)    AS present_count,
		       a.attendance_pct
		FROM enrollments e
		JOIN users u ON u.id = e.student_id
		LEFT JOIN (
		    SELECT mk.student_id,
		           COUNT(mk.score)        AS mark_count,
		           SUM(mk.score IS NULL)  AS missing_count,
		           ROUND(AVG(mk.score / asm.max_score * 100), 2) AS average_pct
		    FROM marks mk JOIN assessments asm ON asm.id = mk.assessment_id
		    WHERE asm.class_id = ? AND (? = '' OR asm.term = ?)
		    GROUP BY mk.student_id
		) m ON m.student_id = u.id
		LEFT JOIN (
		    SELECT student_id, COUNT(*) AS attendance_count,
		           SUM(status = 'present') AS present_count,
		           ROUND(SUM(status = 'present') / COUNT(*) * 100, 2) AS attendance_pct
		    FROM attendance WHERE class_id = ? GROUP BY student_id
		) a ON a.student_id = u.id
		WHERE e.class_id = ? AND (? = 0 OR u.id = ?)
		ORDER BY u.name`, classID, term, term, classID, classID, studentID, studentID)
	if err != nil {
		return nil, err
	}

	// Per-category averages, attached to the matching rows.
	cats := []models.CategoryAverage{}
	err = DB.Select(&cats, `
		SELECT mk.student_id, asm.category,
		       COUNT(mk.score) AS mark_count,
		       ROUND(AVG(mk.score / asm.max_score * 100), 2) AS average_pct
		FROM marks mk JOIN assessments asm ON asm.id = mk.assessment_id
		WHERE asm.class_id = ? AND (? = '' OR asm.term = ?) AND (? = 0 OR mk.student_id = ?)
		GROUP BY mk.student_id, asm.category
		ORDER BY mk.student_id, asm.category`, classID, term, term, studentID, studentID)
	if err != nil {
		return nil, err
	}
	byStudent := map[int64][]models.CategoryAverage{}
	for _, c := range cats {
		byStudent[c.StudentID] = append(byStudent[c.StudentID], c)
	}
	for i := range rows {
		rows[i].Categories = byStudent[rows[i].StudentID]
		if rows[i].Categories == nil {
			rows[i].Categories = []models.CategoryAverage{}
		}
	}
	return rows, nil
}
