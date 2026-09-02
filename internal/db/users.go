package db

import (
	"time"

	"gradetrack/internal/models"
)

// CreateUser inserts a user. rollNo and phone may be nil. mustChange marks
// the password as temporary (the user is forced to change it at first login).
func CreateUser(name, email, passwordHash, role string, rollNo, phone *string, mustChange bool) (int64, error) {
	res, err := DB.Exec(`INSERT INTO users (name, email, password_hash, role, roll_no, phone, must_change_password)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		name, email, passwordHash, role, rollNo, phone, mustChange)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetUserByID(id int64) (models.User, error) {
	var u models.User
	err := DB.Get(&u, `SELECT * FROM users WHERE id = ?`, id)
	return u, err
}

func GetUserByEmail(email string) (models.User, error) {
	var u models.User
	err := DB.Get(&u, `SELECT * FROM users WHERE email = ?`, email)
	return u, err
}

// EmailExists / RollNoExists back the per-row duplicate checks of the CSV import.
func EmailExists(email string) (bool, error) {
	var n int
	err := DB.Get(&n, `SELECT COUNT(*) FROM users WHERE email = ?`, email)
	return n > 0, err
}

func RollNoExists(rollNo string) (bool, error) {
	var n int
	err := DB.Get(&n, `SELECT COUNT(*) FROM users WHERE roll_no = ?`, rollNo)
	return n > 0, err
}

// ListUsers returns every user, optionally filtered by a case-insensitive
// substring match on name, email or roll number.
func ListUsers(q string) ([]models.User, error) {
	users := []models.User{}
	if q == "" {
		err := DB.Select(&users, `SELECT * FROM users ORDER BY id`)
		return users, err
	}
	like := "%" + q + "%"
	err := DB.Select(&users, `SELECT * FROM users
		WHERE name LIKE ? OR email LIKE ? OR roll_no LIKE ?
		ORDER BY id`, like, like, like)
	return users, err
}

// SetPassword stores a new hash and sets/clears the must-change flag.
func SetPassword(id int64, passwordHash string, mustChange bool) error {
	_, err := DB.Exec(`UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?`, passwordHash, mustChange, id)
	return err
}

func SetUserActive(id int64, active bool) error {
	_, err := DB.Exec(`UPDATE users SET is_active = ? WHERE id = ?`, active, id)
	return err
}

// SetPasswordHash replaces the hash only (transparent cost upgrade on login).
func SetPasswordHash(id int64, passwordHash string) error {
	_, err := DB.Exec(`UPDATE users SET password_hash = ? WHERE id = ?`, passwordHash, id)
	return err
}

// RecordLoginFailure bumps the consecutive-failure counter; when lockUntil is
// set the account is locked and the counter starts over.
func RecordLoginFailure(id int64, lockUntil *time.Time) error {
	if lockUntil != nil {
		_, err := DB.Exec(`UPDATE users SET failed_attempts = 0, locked_until = ? WHERE id = ?`, lockUntil, id)
		return err
	}
	_, err := DB.Exec(`UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?`, id)
	return err
}

// ResetLoginFailures clears the counter and any lock after a successful login.
func ResetLoginFailures(id int64) error {
	_, err := DB.Exec(`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?`, id)
	return err
}
