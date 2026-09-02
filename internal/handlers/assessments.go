package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/db"
)

type assessmentInput struct {
	Title    string  `json:"title" binding:"required,max=200"`
	Category string  `json:"category" binding:"required,oneof=assignment quiz exam"`
	Term     string  `json:"term" binding:"required,max=50"`
	MaxScore float64 `json:"max_score" binding:"required,gt=0,lte=9999"`
}

const assessmentInputHelp = "title (≤200), category (assignment|quiz|exam), term (≤50) and max_score (between 0 and 9999) are required"

// CreateAssessment: scoped by RequireClassOwner.
func CreateAssessment(c *gin.Context) {
	class := classFrom(c)
	var in assessmentInput
	if !bindJSON(c, &in, assessmentInputHelp) {
		return
	}
	id, err := db.CreateAssessment(class.ID, in.Title, in.Category, in.Term, in.MaxScore)
	if err != nil {
		dbError(c, err, "")
		return
	}
	a, err := db.GetAssessment(id)
	if err != nil {
		dbError(c, err, "assessment not found")
		return
	}
	c.JSON(http.StatusCreated, a)
}

// ListAssessments: scoped by RequireClassAccess. Optional ?term= filter.
func ListAssessments(c *gin.Context) {
	list, err := db.ListAssessments(classFrom(c).ID, termQuery(c))
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, list)
}

// termQuery returns the ?term= filter, capped to the column length.
func termQuery(c *gin.Context) string {
	t := c.Query("term")
	if len(t) > 50 {
		return t[:50]
	}
	return t
}

// UpdateAssessment: scoped by RequireAssessmentOwner.
func UpdateAssessment(c *gin.Context) {
	a := assessmentFrom(c)
	var in assessmentInput
	if !bindJSON(c, &in, assessmentInputHelp) {
		return
	}
	if in.MaxScore < a.MaxScore {
		n, err := db.CountScoresAbove(a.ID, in.MaxScore)
		if err != nil {
			dbError(c, err, "")
			return
		}
		if n > 0 {
			fail(c, http.StatusBadRequest, "existing scores exceed the new max_score")
			return
		}
	}
	if err := db.UpdateAssessment(a.ID, in.Title, in.Category, in.Term, in.MaxScore); err != nil {
		dbError(c, err, "")
		return
	}
	a, err := db.GetAssessment(a.ID)
	if err != nil {
		dbError(c, err, "assessment not found")
		return
	}
	c.JSON(http.StatusOK, a)
}

// DeleteAssessment removes the assessment and every mark recorded against it
// (each deleted mark is written to the audit log).
func DeleteAssessment(c *gin.Context) {
	uid, _ := currentUser(c)
	if err := db.DeleteAssessment(assessmentFrom(c).ID, uid); err != nil {
		dbError(c, err, "")
		return
	}
	c.Status(http.StatusNoContent)
}
