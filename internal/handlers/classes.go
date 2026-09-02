package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/db"
)

const defaultAcademicYear = "2026-27"

type classInput struct {
	Name         string `json:"name" binding:"required,max=100"`
	Subject      string `json:"subject" binding:"required,max=100"`
	TeacherID    int64  `json:"teacher_id" binding:"required"`
	AcademicYear string `json:"academic_year" binding:"max=9"`
}

const classInputHelp = "name (≤100), subject (≤100) and teacher_id are required; academic_year ≤ 9 chars"

// validTeacher checks that teacher_id points at an active user with the teacher role.
func validTeacher(c *gin.Context, id int64) bool {
	u, err := db.GetUserByID(id)
	if err != nil || u.Role != "teacher" || !u.IsActive {
		fail(c, http.StatusBadRequest, "teacher_id must reference an active teacher")
		return false
	}
	return true
}

func CreateClass(c *gin.Context) {
	var in classInput
	if !bindJSON(c, &in, classInputHelp) {
		return
	}
	if in.AcademicYear == "" {
		in.AcademicYear = defaultAcademicYear
	}
	if !validTeacher(c, in.TeacherID) {
		return
	}
	id, err := db.CreateClass(in.Name, in.Subject, in.TeacherID, in.AcademicYear)
	if err != nil {
		dbError(c, err, "")
		return
	}
	class, err := db.GetClass(id)
	if err != nil {
		dbError(c, err, "class not found")
		return
	}
	c.JSON(http.StatusCreated, class)
}

func ListClasses(c *gin.Context) {
	uid, role := currentUser(c)
	classes, err := db.ListClassesFor(uid, role)
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, classes)
}

// GetClass: scoped by RequireClassAccess.
func GetClass(c *gin.Context) {
	c.JSON(http.StatusOK, classFrom(c))
}

// UpdateClass: scoped by RequireClassManager. Only admins may reassign the teacher.
func UpdateClass(c *gin.Context) {
	class := classFrom(c)
	var in classInput
	if !bindJSON(c, &in, classInputHelp) {
		return
	}
	if in.AcademicYear == "" {
		in.AcademicYear = class.AcademicYear
	}
	if _, role := currentUser(c); role != "admin" && in.TeacherID != class.TeacherID {
		fail(c, http.StatusForbidden, "only admins can reassign a class")
		return
	}
	if in.TeacherID != class.TeacherID && !validTeacher(c, in.TeacherID) {
		return
	}
	if err := db.UpdateClass(class.ID, in.Name, in.Subject, in.TeacherID, in.AcademicYear); err != nil {
		dbError(c, err, "")
		return
	}
	class, err := db.GetClass(class.ID)
	if err != nil {
		dbError(c, err, "class not found")
		return
	}
	c.JSON(http.StatusOK, class)
}

// DeleteClass: admin only (route-gated), class loaded by LoadClass.
func DeleteClass(c *gin.Context) {
	if err := db.DeleteClass(classFrom(c).ID); err != nil {
		dbError(c, err, "")
		return
	}
	c.Status(http.StatusNoContent)
}
