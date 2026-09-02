package handlers

import (
	"crypto/rand"
	"math/big"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"gradetrack/internal/db"
	"gradetrack/internal/middleware"
)

const (
	minPasswordLen  = 8
	bcryptCost      = 12
	maxLoginFails   = 10
	lockoutDuration = 15 * time.Minute
)

type registerInput struct {
	Name     string `json:"name" binding:"required,max=100"`
	Email    string `json:"email" binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,min=8,max=72"`
	RollNo   string `json:"roll_no" binding:"max=30"`
	Phone    string `json:"phone" binding:"max=30"`
}

// optional turns "" into a NULL-able pointer.
func optional(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func hashPassword(c *gin.Context, password string) (string, bool) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		internalError(c, err)
		return "", false
	}
	return string(hash), true
}

// genPassword returns a random 12-character temporary password drawn from an
// alphabet without look-alike characters.
func genPassword() (string, error) {
	const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	out := make([]byte, 12)
	for i := range out {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		out[i] = alphabet[n.Int64()]
	}
	return string(out), nil
}

// Register creates a STUDENT account. Any role field in the body is ignored;
// teachers and admins are created by an admin via POST /users.
func Register(c *gin.Context) {
	var in registerInput
	if !bindJSON(c, &in, "name (≤100), valid email and password (8–72 chars) are required") {
		return
	}
	if !validRollNo(in.RollNo) {
		fail(c, http.StatusBadRequest, "roll_no must be 1–30 letters, digits or dashes")
		return
	}
	hash, ok := hashPassword(c, in.Password)
	if !ok {
		return
	}
	email := normalizeEmail(in.Email)
	id, err := db.CreateUser(in.Name, email, hash, "student", optional(in.RollNo), optional(in.Phone), false)
	if err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "name": in.Name, "email": email, "role": "student"})
}

type loginInput struct {
	Email    string `json:"email" binding:"required,max=255"`
	Password string `json:"password" binding:"required,max=72"`
}

// Login verifies credentials with account lockout: 10 consecutive failures
// lock the account for 15 minutes (423), even for the correct password. The
// counter resets on success. Old-cost hashes are transparently upgraded.
func Login(c *gin.Context) {
	var in loginInput
	if !bindJSON(c, &in, "email and password are required") {
		return
	}
	user, err := db.GetUserByEmail(normalizeEmail(in.Email))
	if err != nil {
		fail(c, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
		fail(c, http.StatusLocked, "account temporarily locked")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(in.Password)) != nil {
		var lockUntil *time.Time
		if user.FailedAttempts+1 >= maxLoginFails {
			t := time.Now().Add(lockoutDuration)
			lockUntil = &t
		}
		if err := db.RecordLoginFailure(user.ID, lockUntil); err != nil {
			internalError(c, err)
			return
		}
		if lockUntil != nil {
			fail(c, http.StatusLocked, "account temporarily locked")
			return
		}
		fail(c, http.StatusUnauthorized, "invalid email or password")
		return
	}
	if !user.IsActive {
		fail(c, http.StatusForbidden, "account deactivated")
		return
	}
	if user.FailedAttempts > 0 || user.LockedUntil != nil {
		if err := db.ResetLoginFailures(user.ID); err != nil {
			internalError(c, err)
			return
		}
	}
	if cost, err := bcrypt.Cost([]byte(user.PasswordHash)); err == nil && cost < bcryptCost {
		if hash, ok := hashPassword(c, in.Password); ok {
			if err := db.SetPasswordHash(user.ID, hash); err != nil {
				internalError(c, err)
				return
			}
		} else {
			return
		}
	}
	token, err := middleware.SignToken(user.ID, user.Role)
	if err != nil {
		internalError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id": user.ID, "name": user.Name, "role": user.Role,
			"must_change_password": user.MustChange,
		},
	})
}

func Me(c *gin.Context) {
	uid, _ := currentUser(c)
	user, err := db.GetUserByID(uid)
	if err != nil {
		dbError(c, err, "user not found")
		return
	}
	c.JSON(http.StatusOK, user)
}

// ChangePassword: any signed-in user replaces their own password. Clears the
// must-change flag set by an admin reset.
func ChangePassword(c *gin.Context) {
	var in struct {
		Old string `json:"old_password" binding:"required,max=72"`
		New string `json:"new_password" binding:"required,max=72"`
	}
	if !bindJSON(c, &in, "old_password and new_password (≤72 chars) are required") {
		return
	}
	if len(in.New) < minPasswordLen {
		fail(c, http.StatusBadRequest, "new password must be at least 8 characters")
		return
	}
	if in.New == in.Old {
		fail(c, http.StatusBadRequest, "new password must differ from the old one")
		return
	}
	uid, _ := currentUser(c)
	user, err := db.GetUserByID(uid)
	if err != nil {
		dbError(c, err, "user not found")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(in.Old)) != nil {
		fail(c, http.StatusBadRequest, "old password is incorrect")
		return
	}
	hash, ok := hashPassword(c, in.New)
	if !ok {
		return
	}
	if err := db.SetPassword(uid, hash, false); err != nil {
		dbError(c, err, "")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
