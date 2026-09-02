package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"gradetrack/internal/db"
	"gradetrack/internal/middleware"
)

// ListUsers (admin): optional ?q= matches name / email / roll_no.
func ListUsers(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if len(q) > 100 {
		fail(c, http.StatusBadRequest, "q is too long")
		return
	}
	users, err := db.ListUsers(q)
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, users)
}

// GetUser: admin can fetch anyone; other roles only themselves.
func GetUser(c *gin.Context) {
	id, ok := paramID(c, "id")
	if !ok {
		return
	}
	uid, role := currentUser(c)
	if role != "admin" && uid != id {
		fail(c, http.StatusForbidden, "forbidden")
		return
	}
	user, err := db.GetUserByID(id)
	if err != nil {
		dbError(c, err, "user not found")
		return
	}
	c.JSON(http.StatusOK, user)
}

type createUserInput struct {
	Name   string `json:"name" binding:"required,max=100"`
	Email  string `json:"email" binding:"required,email,max=255"`
	Role   string `json:"role" binding:"required"`
	RollNo string `json:"roll_no" binding:"max=30"`
	Phone  string `json:"phone" binding:"max=30"`
}

// CreateUser (admin): creates any role with a generated temporary password
// that must be changed at first login. The temp password is returned once.
func CreateUser(c *gin.Context) {
	var in createUserInput
	if !bindJSON(c, &in, "name (≤100), valid email and role are required") {
		return
	}
	if !middleware.ValidRole(in.Role) {
		fail(c, http.StatusBadRequest, "role must be admin, teacher or student")
		return
	}
	if in.RollNo != "" && in.Role != "student" {
		fail(c, http.StatusBadRequest, "roll_no is only for students")
		return
	}
	if !validRollNo(in.RollNo) {
		fail(c, http.StatusBadRequest, "roll_no must be 1–30 letters, digits or dashes")
		return
	}
	temp, err := genPassword()
	if err != nil {
		internalError(c, err)
		return
	}
	hash, ok := hashPassword(c, temp)
	if !ok {
		return
	}
	id, err := db.CreateUser(in.Name, normalizeEmail(in.Email), hash, in.Role, optional(in.RollNo), optional(in.Phone), true)
	if err != nil {
		dbError(c, err, "")
		return
	}
	user, err := db.GetUserByID(id)
	if err != nil {
		dbError(c, err, "user not found")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"user": user, "temp_password": temp})
}

// ResetPassword (admin): sets a fresh temporary password on any account and
// forces a change at next login.
func ResetPassword(c *gin.Context) {
	id, ok := paramID(c, "id")
	if !ok {
		return
	}
	if _, err := db.GetUserByID(id); err != nil {
		dbError(c, err, "user not found")
		return
	}
	temp, err := genPassword()
	if err != nil {
		internalError(c, err)
		return
	}
	hash, ok := hashPassword(c, temp)
	if !ok {
		return
	}
	if err := db.SetPassword(id, hash, true); err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id, "temp_password": temp})
}

// SetActive (admin): soft-deactivate / reactivate. Admins cannot deactivate themselves.
func SetActive(c *gin.Context) {
	id, ok := paramID(c, "id")
	if !ok {
		return
	}
	var in struct {
		IsActive *bool `json:"is_active"`
	}
	if !bindJSON(c, &in, "is_active (true|false) is required") || in.IsActive == nil {
		if !c.IsAborted() {
			fail(c, http.StatusBadRequest, "is_active (true|false) is required")
		}
		return
	}
	uid, _ := currentUser(c)
	if id == uid && !*in.IsActive {
		fail(c, http.StatusBadRequest, "you cannot deactivate your own account")
		return
	}
	if _, err := db.GetUserByID(id); err != nil {
		dbError(c, err, "user not found")
		return
	}
	if err := db.SetUserActive(id, *in.IsActive); err != nil {
		dbError(c, err, "")
		return
	}
	user, err := db.GetUserByID(id)
	if err != nil {
		dbError(c, err, "user not found")
		return
	}
	c.JSON(http.StatusOK, user)
}

type importRow struct {
	Name   string `json:"name"`
	Email  string `json:"email"`
	RollNo string `json:"roll_no"`
}

type importResult struct {
	Row    int    `json:"row"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	RollNo string `json:"roll_no"`
	Status string `json:"status"` // created | duplicate email | duplicate roll | invalid
	ID     int64  `json:"id,omitempty"`
}

const maxImportRows = 500

// ImportStudents (admin): bulk-create student accounts from a JSON array of
// {name, email, roll_no}. Every row gets a status; valid rows are created with
// one shared temporary password and must_change_password set.
func ImportStudents(c *gin.Context) {
	var rows []importRow
	if !bindJSON(c, &rows, "a non-empty JSON array of {name, email, roll_no} is required") {
		return
	}
	if len(rows) == 0 || len(rows) > maxImportRows {
		fail(c, http.StatusBadRequest, "import needs between 1 and 500 rows")
		return
	}
	temp, err := genPassword()
	if err != nil {
		internalError(c, err)
		return
	}
	hash, ok := hashPassword(c, temp)
	if !ok {
		return
	}
	seenEmail, seenRoll := map[string]bool{}, map[string]bool{}
	results := make([]importResult, 0, len(rows))
	created := 0
	for i, r := range rows {
		r.Name, r.Email, r.RollNo = strings.TrimSpace(r.Name), normalizeEmail(r.Email), strings.TrimSpace(r.RollNo)
		res := importResult{Row: i + 1, Name: r.Name, Email: r.Email, RollNo: r.RollNo}
		status, id := importOne(r, hash, seenEmail, seenRoll)
		res.Status, res.ID = status, id
		if status == "created" {
			created++
		}
		results = append(results, res)
	}
	c.JSON(http.StatusOK, gin.H{"created": created, "temp_password": temp, "results": results})
}

// importOne validates and inserts one row, returning its status.
func importOne(r importRow, hash string, seenEmail, seenRoll map[string]bool) (string, int64) {
	if r.Name == "" || len(r.Name) > 100 || r.Email == "" || len(r.Email) > 255 ||
		!strings.Contains(r.Email, "@") || strings.ContainsAny(r.Email, " \t") || !validRollNo(r.RollNo) {
		return "invalid", 0
	}
	if seenEmail[r.Email] {
		return "duplicate email", 0
	}
	if exists, err := db.EmailExists(r.Email); err != nil || exists {
		return "duplicate email", 0
	}
	if r.RollNo != "" {
		if seenRoll[r.RollNo] {
			return "duplicate roll", 0
		}
		if exists, err := db.RollNoExists(r.RollNo); err != nil || exists {
			return "duplicate roll", 0
		}
	}
	id, err := db.CreateUser(r.Name, r.Email, hash, "student", optional(r.RollNo), nil, true)
	if err != nil {
		return "invalid", 0
	}
	seenEmail[r.Email] = true
	if r.RollNo != "" {
		seenRoll[r.RollNo] = true
	}
	return "created", id
}
