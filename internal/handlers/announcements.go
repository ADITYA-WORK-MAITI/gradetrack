package handlers

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/db"
)

const maxAnnouncementLen = 2000

// CreateAnnouncement: scoped by RequireClassOwner.
func CreateAnnouncement(c *gin.Context) {
	class := classFrom(c)
	var in struct {
		Body string `json:"body" binding:"required"`
	}
	if !bindJSON(c, &in, "body is required") {
		return
	}
	in.Body = strings.TrimSpace(in.Body)
	if in.Body == "" {
		fail(c, http.StatusBadRequest, "body is required")
		return
	}
	if utf8.RuneCountInString(in.Body) > maxAnnouncementLen {
		fail(c, http.StatusBadRequest, "announcement is too long (max 2000 characters)")
		return
	}
	uid, _ := currentUser(c)
	id, err := db.CreateAnnouncement(class.ID, uid, in.Body)
	if err != nil {
		dbError(c, err, "")
		return
	}
	a, err := db.GetAnnouncement(id)
	if err != nil {
		dbError(c, err, "announcement not found")
		return
	}
	c.JSON(http.StatusCreated, a)
}

// ListAnnouncements: scoped by RequireClassAccess.
func ListAnnouncements(c *gin.Context) {
	list, err := db.ListAnnouncements(classFrom(c).ID)
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, list)
}

// DeleteAnnouncement: scoped by RequireAnnouncementOwner.
func DeleteAnnouncement(c *gin.Context) {
	if err := db.DeleteAnnouncement(announcementFrom(c).ID); err != nil {
		dbError(c, err, "")
		return
	}
	c.Status(http.StatusNoContent)
}
