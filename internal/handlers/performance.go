package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/db"
)

// ClassPerformance: scoped by RequireClassAccess. Per-student average score %
// and attendance %. Teacher/admin get every enrolled student; a student gets
// only their own row. Optional ?term= filter.
func ClassPerformance(c *gin.Context) {
	uid, role := currentUser(c)
	var studentID int64
	if role == "student" {
		studentID = uid
	}
	rows, err := db.ClassPerformance(classFrom(c).ID, studentID, termQuery(c))
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, rows)
}
