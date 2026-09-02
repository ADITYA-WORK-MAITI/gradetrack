package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// LoginLimiter is an in-memory sliding-window limiter keyed by client IP +
// email: at most `limit` attempts per `window`. A cleanup goroutine drops
// idle keys so the map can't grow without bound.
type LoginLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
}

func NewLoginLimiter(limit int, window time.Duration) *LoginLimiter {
	l := &LoginLimiter{hits: map[string][]time.Time{}, limit: limit, window: window}
	go l.cleanup()
	return l
}

func (l *LoginLimiter) cleanup() {
	for range time.Tick(l.window) {
		cutoff := time.Now().Add(-l.window)
		l.mu.Lock()
		for k, ts := range l.hits {
			if len(ts) == 0 || ts[len(ts)-1].Before(cutoff) {
				delete(l.hits, k)
			}
		}
		l.mu.Unlock()
	}
}

// allow records one attempt for key and reports whether it is within the limit.
func (l *LoginLimiter) allow(key string) bool {
	now := time.Now()
	cutoff := now.Add(-l.window)
	l.mu.Lock()
	defer l.mu.Unlock()
	ts := l.hits[key]
	i := 0
	for i < len(ts) && ts[i].Before(cutoff) {
		i++
	}
	ts = ts[i:]
	if len(ts) >= l.limit {
		l.hits[key] = ts
		return false
	}
	l.hits[key] = append(ts, now)
	return true
}

// Middleware peeks at the JSON body for the email (restoring the body for the
// handler) and rejects with 429 once the key is over the limit.
func (l *LoginLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		body, _ := io.ReadAll(io.LimitReader(c.Request.Body, 4096))
		c.Request.Body = io.NopCloser(bytes.NewReader(body))
		var in struct {
			Email string `json:"email"`
		}
		_ = json.Unmarshal(body, &in)
		key := c.ClientIP() + "|" + strings.ToLower(strings.TrimSpace(in.Email))
		if !l.allow(key) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many attempts, try again shortly"})
			return
		}
		c.Next()
	}
}
