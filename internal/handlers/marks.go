package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/db"
)

// scoreInput is one student's score on an assessment. A JSON null score
// records the mark as missing / not submitted.
type scoreInput struct {
	StudentID int64    `json:"student_id"`
	Score     *float64 `json:"score"`
}

// validScore checks nil-or-within-range against the assessment's maximum.
func validScore(c *gin.Context, score *float64, maxScore float64) bool {
	if score != nil && (*score < 0 || *score > maxScore) {
		fail(c, http.StatusBadRequest, "score must be between 0 and max_score, or null for missing")
		return false
	}
	return true
}

// RecordMark: scoped by RequireAssessmentOwner. Records (or overwrites) one
// student's score. POST /assessments/:id/marks {student_id, score|null}
func RecordMark(c *gin.Context) {
	a := assessmentFrom(c)
	var in scoreInput
	if !bindJSON(c, &in, "student_id and score (number or null) are required") {
		return
	}
	if in.StudentID <= 0 {
		fail(c, http.StatusBadRequest, "student_id and score (number or null) are required")
		return
	}
	if !validScore(c, in.Score, a.MaxScore) {
		return
	}
	enrolled, err := db.IsEnrolled(a.ClassID, in.StudentID)
	if err != nil {
		internalError(c, err)
		return
	}
	if !enrolled {
		fail(c, http.StatusBadRequest, "student is not enrolled in this class")
		return
	}
	uid, _ := currentUser(c)
	id, err := db.UpsertMark(a.ID, in.StudentID, in.Score, uid)
	if err != nil {
		dbError(c, err, "")
		return
	}
	m, err := db.GetMark(id)
	if err != nil {
		dbError(c, err, "mark not found")
		return
	}
	c.JSON(http.StatusCreated, m)
}

// BulkScores: scoped by RequireAssessmentOwner. Whole-roster scores in one
// transaction; any invalid entry rejects the request and nothing is written.
// POST /assessments/:id/scores [{student_id, score|null}, ...]
func BulkScores(c *gin.Context) {
	a := assessmentFrom(c)
	var entries []db.ScoreEntry
	if !bindJSON(c, &entries, "a non-empty JSON array of {student_id, score|null} is required") {
		return
	}
	if len(entries) == 0 || len(entries) > 500 {
		fail(c, http.StatusBadRequest, "between 1 and 500 entries are required")
		return
	}
	seen := map[int64]bool{}
	for _, e := range entries {
		if e.StudentID <= 0 || seen[e.StudentID] {
			fail(c, http.StatusBadRequest, "each entry needs a unique student_id")
			return
		}
		seen[e.StudentID] = true
		if !validScore(c, e.Score, a.MaxScore) {
			return
		}
		enrolled, err := db.IsEnrolled(a.ClassID, e.StudentID)
		if err != nil {
			internalError(c, err)
			return
		}
		if !enrolled {
			fail(c, http.StatusBadRequest, "student is not enrolled in this class")
			return
		}
	}
	uid, _ := currentUser(c)
	if err := db.BulkUpsertMarks(a.ID, entries, uid); err != nil {
		dbError(c, err, "")
		return
	}
	marks, err := db.ListMarks(a.ClassID, 0, "")
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, marks)
}

// ListMarks: scoped by RequireClassAccess. Teacher/admin see the whole class,
// a student sees only their own. Optional ?term= filter.
func ListMarks(c *gin.Context) {
	uid, role := currentUser(c)
	var studentID int64 // 0 = all
	if role == "student" {
		studentID = uid
	}
	marks, err := db.ListMarks(classFrom(c).ID, studentID, termQuery(c))
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, marks)
}

// UpdateMark: scoped by RequireMarkOwner. Changes the score only; title / max
// live on the assessment. Every change is written to mark_audit.
func UpdateMark(c *gin.Context) {
	m := markFrom(c)
	var in struct {
		Score *float64 `json:"score"`
	}
	if !bindJSON(c, &in, "score (number or null) is required") {
		return
	}
	if !validScore(c, in.Score, m.MaxScore) {
		return
	}
	uid, _ := currentUser(c)
	if err := db.UpdateMarkScore(m.ID, in.Score, uid); err != nil {
		dbError(c, err, "")
		return
	}
	m, err := db.GetMark(m.ID)
	if err != nil {
		dbError(c, err, "mark not found")
		return
	}
	c.JSON(http.StatusOK, m)
}

// DeleteMark: scoped by RequireMarkOwner. Logged to mark_audit with new_score NULL.
func DeleteMark(c *gin.Context) {
	uid, _ := currentUser(c)
	if err := db.DeleteMark(markFrom(c).ID, uid); err != nil {
		dbError(c, err, "")
		return
	}
	c.Status(http.StatusNoContent)
}
