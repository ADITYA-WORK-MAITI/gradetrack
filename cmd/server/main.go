package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"gradetrack/internal/db"
	"gradetrack/internal/handlers"
	"gradetrack/internal/middleware"
)

func main() {
	_ = godotenv.Load() // .env is optional; real env vars take precedence

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET is required")
	}
	middleware.JWTSecret = []byte(secret)

	if err := db.Open(os.Getenv("DB_DSN")); err != nil {
		log.Fatalf("connect to database: %v", err)
	}

	dev := os.Getenv("APP_ENV") != "production"
	origin := os.Getenv("FRONTEND_ORIGIN")
	if origin == "" {
		origin = "http://localhost:5173"
	}

	r := gin.Default()           // Logger + Recovery
	_ = r.SetTrustedProxies(nil) // ClientIP() is the socket address; X-Forwarded-For is ignored
	r.Use(middleware.SecurityHeaders(dev), middleware.CORS(origin), middleware.BodyLimit())
	handlers.Routes(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	log.Fatal(r.Run(":" + port))
}
