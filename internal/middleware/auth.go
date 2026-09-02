// Package middleware implements JWT issuing/parsing, role checks, and the
// request-level security middleware (rate limiting, headers, CORS, body cap).
package middleware

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTSecret signs and verifies tokens. Set from the environment in main.
var JWTSecret []byte

const (
	tokenIssuer   = "gradetrack"
	tokenAudience = "gradetrack-web"
	tokenTTL      = 8 * time.Hour
)

// ValidRole reports whether s is one of the three known roles. Every place a
// role is read from outside (token claims, request bodies) goes through this.
func ValidRole(s string) bool {
	return s == "admin" || s == "teacher" || s == "student"
}

type Claims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// SignToken issues an 8h HS256 access token with iss/aud pinned.
func SignToken(userID int64, role string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    tokenIssuer,
			Audience:  jwt.ClaimStrings{tokenAudience},
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(JWTSecret)
}

// ParseToken verifies a token. Algorithm pinning happens twice by construction:
// jwt.WithValidMethods restricts the parser to HS256 before the key function is
// consulted, and the key function itself refuses any method that isn't the
// HMAC family — so alg=none, RS256, etc. can never reach signature checking.
// iss, aud, and exp are all required and validated.
func ParseToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok || t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, errors.New("unexpected signing method")
		}
		return JWTSecret, nil
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(tokenIssuer),
		jwt.WithAudience(tokenAudience),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
	)
	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.UserID <= 0 || !ValidRole(claims.Role) {
		return nil, errors.New("token missing user_id or role")
	}
	return claims, nil
}

// AuthRequired rejects requests without a valid Bearer token and stores
// user_id and role in the context for handlers.
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		tokenStr, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		claims, err := ParseToken(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}
		c.Set("user_id", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// RequireRole allows only the listed roles through. Must run after AuthRequired.
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("role")
		if ValidRole(role) {
			for _, r := range roles {
				if r == role {
					c.Next()
					return
				}
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
	}
}
