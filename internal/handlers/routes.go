package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/middleware"
)

// Routes wires every endpoint under /api. Every route with an :id param is
// wrapped by exactly one scoping middleware (scope.go) or by the admin gate.
func Routes(r *gin.Engine) {
	r.NoRoute(func(c *gin.Context) { fail(c, http.StatusNotFound, "not found") })

	loginLimiter := middleware.NewLoginLimiter(5, time.Minute)

	api := r.Group("/api")
	api.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	api.POST("/auth/register", Register)
	api.POST("/auth/login", loginLimiter.Middleware(), Login)

	auth := api.Group("", middleware.AuthRequired())
	admin := middleware.RequireRole("admin")

	auth.GET("/me", Me)
	auth.GET("/admin/overview", admin, AdminOverview)
	auth.PUT("/me/password", ChangePassword)
	auth.GET("/users", admin, ListUsers)
	auth.POST("/users", admin, CreateUser)
	auth.POST("/users/import", admin, ImportStudents)
	auth.GET("/users/:id", GetUser) // admin or self — checked in the handler
	auth.PUT("/users/:id/password", admin, ResetPassword)
	auth.PUT("/users/:id/active", admin, SetActive)

	auth.POST("/classes", admin, CreateClass)
	auth.GET("/classes", ListClasses)
	auth.GET("/classes/:id", RequireClassAccess(), GetClass)
	auth.PUT("/classes/:id", RequireClassManager(), UpdateClass)
	auth.DELETE("/classes/:id", admin, LoadClass(), DeleteClass)

	auth.POST("/classes/:id/enrollments", RequireClassManager(), CreateEnrollment)
	auth.GET("/classes/:id/enrollments", RequireClassManager(), ListEnrollments)
	auth.DELETE("/enrollments/:id", RequireEnrollmentManager(), DeleteEnrollment)

	auth.POST("/classes/:id/assessments", RequireClassOwner(), CreateAssessment)
	auth.GET("/classes/:id/assessments", RequireClassAccess(), ListAssessments)
	auth.PUT("/assessments/:id", RequireAssessmentOwner(), UpdateAssessment)
	auth.DELETE("/assessments/:id", RequireAssessmentOwner(), DeleteAssessment)

	auth.POST("/assessments/:id/marks", RequireAssessmentOwner(), RecordMark)
	auth.POST("/assessments/:id/scores", RequireAssessmentOwner(), BulkScores)
	auth.GET("/classes/:id/marks", RequireClassAccess(), ListMarks)
	auth.PUT("/marks/:id", RequireMarkOwner(), UpdateMark)
	auth.DELETE("/marks/:id", RequireMarkOwner(), DeleteMark)

	auth.POST("/classes/:id/attendance", RequireClassOwner(), MarkAttendance)
	auth.GET("/classes/:id/attendance", RequireClassAccess(), ListAttendance)

	auth.GET("/classes/:id/performance", RequireClassAccess(), ClassPerformance)

	auth.POST("/classes/:id/announcements", RequireClassOwner(), CreateAnnouncement)
	auth.GET("/classes/:id/announcements", RequireClassAccess(), ListAnnouncements)
	auth.DELETE("/announcements/:id", RequireAnnouncementOwner(), DeleteAnnouncement)
}
