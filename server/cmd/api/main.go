package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	conf "server/config"
	"server/internal/chirpstack"
	"server/internal/migrate"
	"server/internal/server"
	"syscall"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

func gracefulShutdown(apiServer *http.Server, done chan bool) {
	// Create context that listens for the interrupt signal from the OS.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Listen for the interrupt signal.
	<-ctx.Done()

	log.Println("shutting down gracefully, press Ctrl+C again to force")
	stop() // Allow Ctrl+C to force shutdown

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := apiServer.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown with error: %v", err)
	}

	log.Println("Server exiting")

	// Notify the main goroutine that the shutdown is complete
	done <- true
}

func main() {

	ctx := context.Background()

	env, err := conf.LoadConfig()

	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}
	// Setup Logger

	// Setup Postgres

	dbUrl := fmt.Sprintf(
		"postgresql://%s:%s@%s:%s/%s?sslmode=disable&search_path=%s",
		env.DB_USERNAME,
		env.DB_PASSWORD,
		env.DB_HOST,
		env.DB_PORT,
		env.DB_DATABASE,
		env.DB_SCHEMA,
	)

	config, err := pgxpool.ParseConfig(dbUrl)
	if err != nil {
		log.Fatal(err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, config)

	if err != nil {
		log.Fatal(err)
	}

	defer pool.Close()

	err = migrate.Migrate(pool)

	if err != nil {
		log.Print("Failed to migrate database")
	}

	// Setup Influx

	token := env.INFLUXDB_TOKEN
	url := env.INFLUXDB_URL
	client := influxdb2.NewClient(url, token)
	queryApi := client.QueryAPI(env.INFLUXDB_ORG)

	// Setup Chirpstack

	chirpStackClient, err := chirpstack.NewClient(env.CHIRPSTACK_API_URL, env.CHIRPSTACK_API_TOKEN)

	if err != nil {
		log.Fatalf("Error creating chirpstack client: %v", err)
	}
	serverImpl := server.NewServer(pool, queryApi, chirpStackClient, &env)

	if env.CLERK_SECRET_KEY == "" {
		log.Fatal("CLERK_SECRET_KEY environment variable is required")
	}

	clerk.SetKey(env.CLERK_SECRET_KEY)

	strictHandler := server.NewStrictHandler(serverImpl, []server.StrictMiddlewareFunc{})

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		AllowAllOrigins:  true,
		AllowCredentials: true,
	}))

	r.Use(ClerkAuthMiddleware())
	server.RegisterHandlers(r, strictHandler)

	httpServer := &http.Server{Addr: ":8888", Handler: r}

	// Create a done channel to signal when the shutdown is complete
	done := make(chan bool, 1)

	// Run graceful shutdown in a separate goroutine
	go gracefulShutdown(httpServer, done)

	// Start the server
	log.Println("Starting server on :8888")
	err = httpServer.ListenAndServe()
	if err != nil {
		log.Panicf("HTTP server error: %v", err)
	}

	// Wait for the graceful shutdown to complete
	<-done
	log.Println("Graceful shutdown complete.")
}

func ClerkAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		log.Printf("Authorization header: %s", authHeader)

		writer := &responseCaptureWriter{ResponseWriter: c.Writer, statusCode: 200}

		handler := clerkhttp.RequireHeaderAuthorization()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract claims from Clerk session (if possible)
			claims, ok := clerk.SessionClaimsFromContext(r.Context())
			if !ok {
				log.Println("No claims found in middleware")
				// Optionally abort here or continue depending on your auth flow
			} else {
				// Add user ID to Gin context
				c.Set("userID", claims.Subject)

				// Also add to request context if you want
				ctx := context.WithValue(r.Context(), "userID", claims.Subject)
				r = r.WithContext(ctx)
			}

			c.Request = r
		}))

		handler.ServeHTTP(writer, c.Request)

		if writer.statusCode == http.StatusUnauthorized || writer.statusCode == http.StatusForbidden {
			c.Abort()
			return
		}

		c.Next()
	}
}

// Helper to capture status code from ResponseWriter
type responseCaptureWriter struct {
	gin.ResponseWriter
	statusCode int
}

func (w *responseCaptureWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}
