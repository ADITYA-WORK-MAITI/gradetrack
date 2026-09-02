package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/db"
)

type attendanceInput struct {
	Date    string               `json:"date" binding:"required,len=10"`
	Entries []db.AttendanceEntry `json:"entries" binding:"required,min=1,max=500,dive"`
}

// MarkAttendance: scoped by RequireClassOwner. Records the whole class for one
// past-or-today date; re-submitting the same date overwrites earlier statuses.
func MarkAttendance(c *gin.Context) {
	class := classFrom(c)
	var in attendanceInput
	if !bindJSON(c, &in, "date (YYYY-MM-DD) and a non-empty entries list are required") {
		return
	}
	day, err := time.Parse("2006-01-02", in.Date)
	if err != nil {
		fail(c, http.StatusBadRequest, "date must be YYYY-MM-DD")
		return
	}
	if day.After(time.Now()) {
		fail(c, http.StatusBadRequest, "attendance cannot be recorded for a future date")
		return
	}
	seen := map[int64]bool{}
	for _, e := range in.Entries {
		if e.Status != "present" && e.Status != "absent" {
			fail(c, http.StatusBadRequest, "status must be present or absent")
			return
		}
		if e.StudentID <= 0 || seen[e.StudentID] {
			fail(c, http.StatusBadRequest, "each entry needs a unique student_id")
			return
		}
		seen[e.StudentID] = true
		enrolled, err := db.IsEnrolled(class.ID, e.StudentID)
		if err != nil {
			internalError(c, err)
			return
		}
		if !enrolled {
			fail(c, http.StatusBadRequest, "student is not enrolled in this class")
			return
		}
	}
	if err := db.UpsertAttendance(class.ID, in.Date, in.Entries); err != nil {
		dbError(c, err, "")
		return
	}
	list, err := db.ListAttendance(class.ID, 0)
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, list)
}

// ListAttendance: scoped by RequireClassAccess. Teacher/admin see the whole
// class, a student sees only their own.
func ListAttendance(c *gin.Context) {
	uid, role := currentUser(c)
	var studentID int64
	if role == "student" {
		studentID = uid
	}
	list, err := db.ListAttendance(classFrom(c).ID, studentID)
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, list)
}
