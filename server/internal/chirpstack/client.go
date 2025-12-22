package chirpstack

import (
	"context"
	"crypto/tls"

	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/metadata"
)

type Client struct {
	deviceClient api.DeviceServiceClient
	apiToken     string
}

func NewClient(serverAddr, apiToken string) (*Client, error) {
	// Setup TLS config (use insecure for local development)
	creds := credentials.NewTLS(&tls.Config{
		InsecureSkipVerify: true,
	})

	// Create gRPC connection
	conn, err := grpc.Dial(
		serverAddr,
		grpc.WithTransportCredentials(creds),
	)
	if err != nil {
		return nil, err
	}

	return &Client{
		deviceClient: api.NewDeviceServiceClient(conn),
		apiToken:     apiToken,
	}, nil
}

// Helper to add auth token to context
func (c *Client) withAuth(ctx context.Context) context.Context {
	return metadata.NewOutgoingContext(ctx, metadata.Pairs("authorization", "Bearer "+c.apiToken))
}
