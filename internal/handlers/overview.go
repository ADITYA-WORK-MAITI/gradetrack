package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/db"
)

// AdminOverview (admin): school-wide headline numbers plus one row per class.
func AdminOverview(c *gin.Context) {
	o, err := db.SchoolOverview()
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, o)
}
