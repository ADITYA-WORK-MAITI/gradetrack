package db

import "gradetrack/internal/models"

// SchoolOverview builds the admin dashboard numbers in two aggregate
// statements. Only active students count; a student's average is the mean
// of their scored marks (score / max_score) per class, exactly as the
// per-class performance report computes it.
//
//	school_avg_pct        = mean of every active (student, class) average
//	school_attendance_pct = total present / total sessions for active students
//	at_risk_count         = distinct active students with avg < 40 or attendance < 75 in any class
func SchoolOverview() (models.Overview, error) {
	var o models.Overview
	err := DB.Get(&o, `
		SELECT
		    (SELECT COUNT(*) FROM users WHERE role = 'student')                  AS students,
		    (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active)    AS teachers,
		    (SELECT COUNT(*) FROM classes)                                       AS classes,
		    (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active)    AS active_students,
		    ROUND(AVG(p.avg_pct), 2)                                             AS school_avg_pct,
		    ROUND(SUM(p.present) / NULLIF(SUM(p.sessions), 0) * 100, 2)          AS school_attendance_pct,
		    COUNT(DISTINCT CASE WHEN p.avg_pct < 40 OR p.attendance_pct < 75 THEN p.student_id END) AS at_risk_count
		FROM (
		    SELECT e.class_id, e.student_id,
		           (SELECT AVG(m.score / a.max_score * 100)
		              FROM marks m JOIN assessments a ON a.id = m.assessment_id
		             WHERE a.class_id = e.class_id AND m.student_id = e.student_id AND m.score IS NOT NULL) AS avg_pct,
		           (SELECT SUM(status = 'present') FROM attendance t
		             WHERE t.class_id = e.class_id AND t.student_id = e.student_id) AS present,
		           (SELECT COUNT(*) FROM attendance t
		             WHERE t.class_id = e.class_id AND t.student_id = e.student_id) AS sessions,
		           (SELECT SUM(status = 'present') / COUNT(*) * 100 FROM attendance t
		             WHERE t.class_id = e.class_id AND t.student_id = e.student_id) AS attendance_pct
		    FROM enrollments e
		    JOIN users u ON u.id = e.student_id AND u.is_active
		) p`)
	if err != nil {
		return o, err
	}

	o.PerClass = []models.ClassOverview{}
	err = DB.Select(&o.PerClass, `
		SELECT c.id AS class_id, c.name, c.subject, t.name AS teacher_name,
		       COALESCE(en.enrolled, 0) AS enrolled,
		       sa.avg_pct, att.attendance_pct
		FROM classes c
		JOIN users t ON t.id = c.teacher_id
		LEFT JOIN (
		    SELECT e.class_id, COUNT(*) AS enrolled
		    FROM enrollments e JOIN users u ON u.id = e.student_id AND u.is_active
		    GROUP BY e.class_id
		) en ON en.class_id = c.id
		LEFT JOIN (
		    SELECT class_id, ROUND(AVG(avg_pct), 2) AS avg_pct FROM (
		        SELECT a.class_id, m.student_id, AVG(m.score / a.max_score * 100) AS avg_pct
		        FROM marks m
		        JOIN assessments a ON a.id = m.assessment_id
		        JOIN enrollments e ON e.class_id = a.class_id AND e.student_id = m.student_id
		        JOIN users u ON u.id = m.student_id AND u.is_active
		        WHERE m.score IS NOT NULL
		        GROUP BY a.class_id, m.student_id
		    ) s GROUP BY class_id
		) sa ON sa.class_id = c.id
		LEFT JOIN (
		    SELECT t.class_id, ROUND(SUM(t.status = 'present') / COUNT(*) * 100, 2) AS attendance_pct
		    FROM attendance t
		    JOIN enrollments e ON e.class_id = t.class_id AND e.student_id = t.student_id
		    JOIN users u ON u.id = t.student_id AND u.is_active
		    GROUP BY t.class_id
		) att ON att.class_id = c.id
		ORDER BY sa.avg_pct DESC, c.name`)
	return o, err
}
