package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	conf "server/config"
	"server/internal/chirpstack"
	db "server/internal/db/sqlc"
	"server/internal/migrate"
	mqttSub "server/internal/mqtt"
	"server/internal/reconciler"
	"server/internal/server"
	"strings"
	"syscall"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func gracefulShutdown(apiServer *http.Server, mqttSubscriber *mqttSub.Subscriber, stopReconciler context.CancelFunc, done chan bool) {
	// Create context that listens for the interrupt signal from the OS.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Listen for the interrupt signal.
	<-ctx.Done()

	log.Println("shutting down gracefully, press Ctrl+C again to force")
	stop() // Allow Ctrl+C to force shutdown

	// Stop background workers
	stopReconciler()
	if mqttSubscriber != nil {
		mqttSubscriber.Stop()
	}

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
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Setup ChirpStack

	chirpStackClient, err := chirpstack.NewClient(chirpstack.ClientConfig{
		ServerAddr:    env.CHIRPSTACK_API_URL,
		APIToken:      env.CHIRPSTACK_API_TOKEN,
		AdminEmail:    env.CHIRPSTACK_ADMIN_EMAIL,
		AdminPassword: env.CHIRPSTACK_ADMIN_PASSWORD,
	})
	if err != nil {
		log.Fatalf("Error creating chirpstack client: %v", err)
	}

	// The MQTT topic and the reconciler both depend on the bootstrapped
	// application ID, so a failed bootstrap means a dead pipeline — fail fast
	// and let the container restart policy retry until ChirpStack is up.
	if err := chirpStackClient.EnsureInfrastructure(ctx); err != nil {
		log.Fatalf("ChirpStack bootstrap failed: %v", err)
	}

	// Setup MQTT Subscriber

	var mqttSubscriber *mqttSub.Subscriber
	if env.MQTT_BROKER_URL != "" {
		mqttSubscriber = mqttSub.NewSubscriber(mqttSub.Config{
			BrokerURL:     env.MQTT_BROKER_URL,
			ClientID:      "advatens-server",
			ApplicationID: chirpStackClient.ApplicationID(),
		}, pool)
		if err := mqttSubscriber.Start(); err != nil {
			log.Printf("Warning: MQTT subscriber start failed: %v", err)
		}
	} else {
		log.Println("Warning: MQTT_BROKER_URL not set, MQTT subscriber disabled")
	}

	// Setup Reconciler (keeps ChirpStack in sync with the station table)

	rec := reconciler.New(db.New(pool), chirpStackClient, 30*time.Second)

	reconcilerCtx, stopReconciler := context.WithCancel(ctx)
	defer stopReconciler()
	go rec.Run(reconcilerCtx)

	serverImpl := server.NewServer(pool, rec)

	if env.CLERK_SECRET_KEY == "" {
		log.Fatal("CLERK_SECRET_KEY environment variable is required")
	}

	clerk.SetKey(env.CLERK_SECRET_KEY)

	strictHandler := server.NewStrictHandler(serverImpl, []server.StrictMiddlewareFunc{})

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization"},
		AllowOrigins:     corsOrigins(env.CORS_ALLOWED_ORIGINS),
		AllowCredentials: true,
	}))

	r.Use(ClerkAuthMiddleware())
	server.RegisterHandlers(r, strictHandler)

	httpServer := &http.Server{Addr: ":8888", Handler: r}

	// Create a done channel to signal when the shutdown is complete
	done := make(chan bool, 1)

	// Run graceful shutdown in a separate goroutine
	go gracefulShutdown(httpServer, mqttSubscriber, stopReconciler, done)

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

// corsOrigins parses the comma-separated CORS_ALLOWED_ORIGINS value, falling
// back to common local dev origins when unset.
func corsOrigins(configured string) []string {
	if configured == "" {
		return []string{"http://localhost:3000", "http://localhost:5173"}
	}
	var origins []string
	for _, origin := range strings.Split(configured, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}

// ClerkAuthMiddleware validates the Clerk session token (via the SDK's
// JWKS-caching middleware) and stores the user ID on the gin context.
func ClerkAuthMiddleware() gin.HandlerFunc {
	requireAuth := clerkhttp.RequireHeaderAuthorization()
	return func(c *gin.Context) {
		authorized := false
		requireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authorized = true
			if claims, ok := clerk.SessionClaimsFromContext(r.Context()); ok {
				c.Set(server.UserIDKey, claims.Subject)
			}
		})).ServeHTTP(c.Writer, c.Request)

		if !authorized {
			// RequireHeaderAuthorization already wrote the 401/403 response.
			c.Abort()
			return
		}
		c.Next()
	}
}
