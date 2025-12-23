package chirpstack

import (
	"context"

	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
)

type Client struct {
	deviceClient api.DeviceServiceClient
	apiToken     string
}

func NewClient(serverAddr, apiToken string) (*Client, error) {

	// Create gRPC connection
	conn, err := grpc.NewClient(
		serverAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
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
