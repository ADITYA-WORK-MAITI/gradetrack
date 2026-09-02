// Package handlers holds the Gin handlers, one file per resource.
// Handlers call internal/db directly. Ownership / scoping checks live in
// scope.go as middleware so every :id route is protected the same way.
package handlers

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-sql-driver/mysql"
)

func fail(c *gin.Context, status int, msg string) {
	c.AbortWithStatusJSON(status, gin.H{"error": msg})
}

// dbError maps a database error to 404 / 400 / 500. Anything unexpected is
// logged in full server-side; the client only ever sees "internal error".
func dbError(c *gin.Context, err error, notFound string) {
	var me *mysql.MySQLError
	switch {
	case errors.Is(err, sql.ErrNoRows):
		if notFound == "" {
			notFound = "not found"
		}
		fail(c, http.StatusNotFound, notFound)
	case errors.As(err, &me) && me.Number == 1062:
		fail(c, http.StatusBadRequest, "already exists")
	case errors.As(err, &me) && (me.Number == 1452 || me.Number == 3819):
		fail(c, http.StatusBadRequest, "invalid reference or value")
	default:
		internalError(c, err)
	}
}

// internalError logs the real cause and returns an opaque 500.
func internalError(c *gin.Context, err error) {
	log.Printf("[error] %s %s: %v", c.Request.Method, c.Request.URL.Path, err)
	fail(c, http.StatusInternalServerError, "internal error")
}

// bindJSON decodes the body into dst. Oversized bodies (see middleware.BodyLimit)
// become 413; any other decode / validation failure returns `help` as a 400.
func bindJSON(c *gin.Context, dst any, help string) bool {
	err := c.ShouldBindJSON(dst)
	if err == nil {
		return true
	}
	var mbe *http.MaxBytesError
	if errors.As(err, &mbe) {
		fail(c, http.StatusRequestEntityTooLarge, "request too large")
		return false
	}
	fail(c, http.StatusBadRequest, help)
	return false
}

func paramID(c *gin.Context, name string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil || id <= 0 {
		fail(c, http.StatusBadRequest, "invalid id")
		return 0, false
	}
	return id, true
}

func currentUser(c *gin.Context) (int64, string) {
	return c.GetInt64("user_id"), c.GetString("role")
}

// normalizeEmail lowercases and trims so storage and comparison agree.
func normalizeEmail(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

var rollNoRe = regexp.MustCompile(`^[A-Za-z0-9-]{1,30}$`)

// validRollNo: optional; when present it must be short and alphanumeric.
func validRollNo(s string) bool { return s == "" || rollNoRe.MatchString(s) }

const maxPasswordLen = 72 // bcrypt's input limit
