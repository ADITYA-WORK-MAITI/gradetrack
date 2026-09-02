package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/db"
	"gradetrack/internal/models"
)

// Scoping middleware. Each one resolves the :id route param to a row, walks
// up to the owning class, checks the caller against it, and stores the loaded
// rows in the context for the handler. Every :id route in routes.go is
// wrapped by exactly one of these (or by RequireRole("admin") for user admin).

const (
	ctxClass        = "scope.class"
	ctxAssessment   = "scope.assessment"
	ctxMark         = "scope.mark"
	ctxEnrollment   = "scope.enrollment"
	ctxAnnouncement = "scope.announcement"
)

func classFrom(c *gin.Context) models.Class { return c.MustGet(ctxClass).(models.Class) }
func assessmentFrom(c *gin.Context) models.Assessment {
	return c.MustGet(ctxAssessment).(models.Assessment)
}
func markFrom(c *gin.Context) models.Mark { return c.MustGet(ctxMark).(models.Mark) }
func enrollmentFrom(c *gin.Context) models.Enrollment {
	return c.MustGet(ctxEnrollment).(models.Enrollment)
}
func announcementFrom(c *gin.Context) models.Announcement {
	return c.MustGet(ctxAnnouncement).(models.Announcement)
}

func isOwner(c *gin.Context, class models.Class) bool {
	uid, role := currentUser(c)
	return role == "teacher" && class.TeacherID == uid
}

func isManager(c *gin.Context, class models.Class) bool {
	_, role := currentUser(c)
	return role == "admin" || isOwner(c, class)
}

// loadClassByID fetches a class (400/404 on failure) and stores it in the context.
func loadClassByID(c *gin.Context, id int64) (models.Class, bool) {
	class, err := db.GetClass(id)
	if err != nil {
		dbError(c, err, "class not found")
		return models.Class{}, false
	}
	c.Set(ctxClass, class)
	return class, true
}

func loadClassParam(c *gin.Context) (models.Class, bool) {
	id, ok := paramID(c, "id")
	if !ok {
		return models.Class{}, false
	}
	return loadClassByID(c, id)
}

// LoadClass only resolves :id → class (for routes already gated by RequireRole).
func LoadClass() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := loadClassParam(c); ok {
			c.Next()
		}
	}
}

// RequireClassAccess: admin, the owning teacher, or an enrolled student.
func RequireClassAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		class, ok := loadClassParam(c)
		if !ok {
			return
		}
		uid, role := currentUser(c)
		allowed := isManager(c, class)
		if role == "student" {
			enrolled, err := db.IsEnrolled(class.ID, uid)
			if err != nil {
				internalError(c, err)
				return
			}
			allowed = enrolled
		}
		if !allowed {
			fail(c, http.StatusForbidden, "forbidden")
			return
		}
		c.Next()
	}
}

// RequireClassManager: admin or the owning teacher.
func RequireClassManager() gin.HandlerFunc {
	return func(c *gin.Context) {
		class, ok := loadClassParam(c)
		if !ok {
			return
		}
		if !isManager(c, class) {
			fail(c, http.StatusForbidden, "forbidden")
			return
		}
		c.Next()
	}
}

// RequireClassOwner: the owning teacher only (marks, attendance, announcements, assessments).
func RequireClassOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		class, ok := loadClassParam(c)
		if !ok {
			return
		}
		if !isOwner(c, class) {
			fail(c, http.StatusForbidden, "only the class teacher can do that")
			return
		}
		c.Next()
	}
}

// RequireAssessmentOwner: :id assessment → its class → owning teacher.
func RequireAssessmentOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := paramID(c, "id")
		if !ok {
			return
		}
		a, err := db.GetAssessment(id)
		if err != nil {
			dbError(c, err, "assessment not found")
			return
		}
		class, ok := loadClassByID(c, a.ClassID)
		if !ok {
			return
		}
		if !isOwner(c, class) {
			fail(c, http.StatusForbidden, "only the class teacher can change assessments")
			return
		}
		c.Set(ctxAssessment, a)
		c.Next()
	}
}

// RequireMarkOwner: :id mark → assessment → class → owning teacher.
func RequireMarkOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := paramID(c, "id")
		if !ok {
			return
		}
		m, err := db.GetMark(id)
		if err != nil {
			dbError(c, err, "mark not found")
			return
		}
		class, ok := loadClassByID(c, m.ClassID)
		if !ok {
			return
		}
		if !isOwner(c, class) {
			fail(c, http.StatusForbidden, "only the class teacher can change marks")
			return
		}
		c.Set(ctxMark, m)
		c.Next()
	}
}

// RequireEnrollmentManager: :id enrollment → class → admin or owning teacher.
func RequireEnrollmentManager() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := paramID(c, "id")
		if !ok {
			return
		}
		e, err := db.GetEnrollment(id)
		if err != nil {
			dbError(c, err, "enrollment not found")
			return
		}
		class, ok := loadClassByID(c, e.ClassID)
		if !ok {
			return
		}
		if !isManager(c, class) {
			fail(c, http.StatusForbidden, "forbidden")
			return
		}
		c.Set(ctxEnrollment, e)
		c.Next()
	}
}

// RequireAnnouncementOwner: :id announcement → class → owning teacher.
func RequireAnnouncementOwner() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := paramID(c, "id")
		if !ok {
			return
		}
		a, err := db.GetAnnouncement(id)
		if err != nil {
			dbError(c, err, "announcement not found")
			return
		}
		class, ok := loadClassByID(c, a.ClassID)
		if !ok {
			return
		}
		if !isOwner(c, class) {
			fail(c, http.StatusForbidden, "only the class teacher can delete announcements")
			return
		}
		c.Set(ctxAnnouncement, a)
		c.Next()
	}
}
