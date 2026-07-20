package chirpstack

import (
	"context"
	"fmt"
	"log"

	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
)

type Client struct {
	deviceClient        api.DeviceServiceClient
	applicationClient   api.ApplicationServiceClient
	deviceProfileClient api.DeviceProfileServiceClient
	tenantClient        api.TenantServiceClient
	internalClient      api.InternalServiceClient
	apiToken            string

	// Login credentials, kept so the JWT can be refreshed when it expires.
	adminEmail    string
	adminPassword string

	// IDs populated by EnsureInfrastructure()
	applicationID   string
	deviceProfileID string
}

// ClientConfig holds all configuration for creating a ChirpStack client.
type ClientConfig struct {
	ServerAddr string
	// If set, used directly for authentication (production).
	APIToken string
	// If APIToken is empty, login with these credentials to obtain a JWT.
	// Defaults to admin / admin for local development.
	AdminEmail    string
	AdminPassword string
}

func NewClient(cfg ClientConfig) (*Client, error) {
	conn, err := grpc.NewClient(
		cfg.ServerAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, err
	}

	c := &Client{
		deviceClient:        api.NewDeviceServiceClient(conn),
		applicationClient:   api.NewApplicationServiceClient(conn),
		deviceProfileClient: api.NewDeviceProfileServiceClient(conn),
		tenantClient:        api.NewTenantServiceClient(conn),
		internalClient:      api.NewInternalServiceClient(conn),
		apiToken:            cfg.APIToken,
	}

	// If no API token provided, login with admin credentials to get a JWT
	if cfg.APIToken == "" {
		c.adminEmail = cfg.AdminEmail
		if c.adminEmail == "" {
			c.adminEmail = "admin"
		}
		c.adminPassword = cfg.AdminPassword
		if c.adminPassword == "" {
			c.adminPassword = "admin"
		}

		if err := c.login(context.Background(), c.adminEmail, c.adminPassword); err != nil {
			return nil, fmt.Errorf("chirpstack login: %w", err)
		}
		log.Printf("chirpstack: authenticated via login (email=%s)", c.adminEmail)
	}

	return c, nil
}

// Relogin refreshes the JWT using the stored admin credentials. It is a no-op
// when a static API token is used (credentials were never stored).
func (c *Client) Relogin(ctx context.Context) error {
	if c.adminEmail == "" {
		return nil
	}
	return c.login(ctx, c.adminEmail, c.adminPassword)
}

// login authenticates with ChirpStack and stores the JWT for subsequent calls.
func (c *Client) login(ctx context.Context, email, password string) error {
	resp, err := c.internalClient.Login(ctx, &api.LoginRequest{
		Email:    email,
		Password: password,
	})
	if err != nil {
		return err
	}
	c.apiToken = resp.Jwt
	return nil
}

// ApplicationID returns the bootstrapped application ID.
func (c *Client) ApplicationID() string {
	return c.applicationID
}

// DeviceProfileID returns the bootstrapped device profile ID.
func (c *Client) DeviceProfileID() string {
	return c.deviceProfileID
}

// Helper to add auth token to context
func (c *Client) withAuth(ctx context.Context) context.Context {
	return metadata.NewOutgoingContext(ctx, metadata.Pairs("authorization", "Bearer "+c.apiToken))
}
