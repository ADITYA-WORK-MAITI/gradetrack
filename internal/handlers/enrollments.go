package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/db"
)

// CreateEnrollment: scoped by RequireClassManager. Only active students can be enrolled.
func CreateEnrollment(c *gin.Context) {
	class := classFrom(c)
	var in struct {
		StudentID int64 `json:"student_id" binding:"required"`
	}
	if !bindJSON(c, &in, "student_id is required") {
		return
	}
	u, err := db.GetUserByID(in.StudentID)
	if err != nil || u.Role != "student" {
		fail(c, http.StatusBadRequest, "student_id must reference a student")
		return
	}
	if !u.IsActive {
		fail(c, http.StatusBadRequest, "student account is deactivated")
		return
	}
	id, err := db.CreateEnrollment(class.ID, in.StudentID)
	if err != nil {
		dbError(c, err, "")
		return
	}
	e, err := db.GetEnrollment(id)
	if err != nil {
		dbError(c, err, "enrollment not found")
		return
	}
	c.JSON(http.StatusCreated, e)
}

// ListEnrollments: scoped by RequireClassManager.
func ListEnrollments(c *gin.Context) {
	list, err := db.ListEnrollments(classFrom(c).ID)
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, list)
}

// DeleteEnrollment: scoped by RequireEnrollmentManager.
func DeleteEnrollment(c *gin.Context) {
	if err := db.DeleteEnrollment(enrollmentFrom(c).ID); err != nil {
		dbError(c, err, "")
		return
	}
	c.Status(http.StatusNoContent)
}
