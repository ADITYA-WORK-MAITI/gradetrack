package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// MaxBodyBytes caps every request body (1 MB).
const MaxBodyBytes = 1 << 20

// SecurityHeaders sets conservative browser headers on every response. The
// CSP is strict for the built app; in development it also allows the Vite dev
// server (inline styles / HMR websocket) so local work isn't broken.
func SecurityHeaders(dev bool) gin.HandlerFunc {
	csp := "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
	if dev {
		csp = "default-src 'self' http://localhost:5173 ws://localhost:5173; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' http://localhost:5173; frame-ancestors 'none'"
	}
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy", csp)
		h.Set("Cache-Control", "no-store")
		c.Next()
	}
}

// CORS allows exactly one origin (the frontend), with the methods and headers
// the app uses. Preflights from any other origin are rejected with 403; plain
// requests from other origins get no CORS headers (the browser blocks them).
func CORS(allowedOrigin string) gin.HandlerFunc {
	allowed := strings.TrimRight(allowedOrigin, "/")
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			c.Next()
			return
		}
		if origin != allowed {
			if c.Request.Method == http.MethodOptions {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "origin not allowed"})
				return
			}
			c.Next()
			return
		}
		h := c.Writer.Header()
		h.Set("Access-Control-Allow-Origin", allowed)
		h.Set("Vary", "Origin")
		h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		h.Set("Access-Control-Max-Age", "600")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// BodyLimit rejects oversized bodies up front (Content-Length) and wraps the
// body so chunked uploads past the cap fail inside the JSON decoder, where
// handlers translate the error into 413.
func BodyLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > MaxBodyBytes {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{"error": "request too large"})
			return
		}
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxBodyBytes)
		}
		c.Next()
	}
}
