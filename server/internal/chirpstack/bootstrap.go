package chirpstack

import (
	"context"
	"fmt"
	"log"

	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"github.com/chirpstack/chirpstack/api/go/v4/common"
)

const (
	deviceProfileName = "advatens-cayenne-lpp"
	applicationName   = "advatens"
)

// EnsureInfrastructure ensures the required ChirpStack resources exist:
// a tenant, device profile and application. It uses a find-or-create pattern
// so it is idempotent and safe to call on every startup.
func (c *Client) EnsureInfrastructure(ctx context.Context) error {
	ctx = c.withAuth(ctx)

	tenantID, err := c.getDefaultTenantID(ctx)
	if err != nil {
		return fmt.Errorf("chirpstack bootstrap: get tenant: %w", err)
	}

	dpID, err := c.ensureDeviceProfile(ctx, tenantID)
	if err != nil {
		return fmt.Errorf("chirpstack bootstrap: ensure device profile: %w", err)
	}
	c.deviceProfileID = dpID
	log.Printf("chirpstack: ensured device profile %q (id=%s)", deviceProfileName, dpID)

	appID, err := c.ensureApplication(ctx, tenantID)
	if err != nil {
		return fmt.Errorf("chirpstack bootstrap: ensure application: %w", err)
	}
	c.applicationID = appID
	log.Printf("chirpstack: ensured application %q (id=%s)", applicationName, appID)

	return nil
}

// getDefaultTenantID lists tenants and returns the first one's ID.
// ChirpStack always has at least one default tenant after initial setup.
func (c *Client) getDefaultTenantID(ctx context.Context) (string, error) {
	resp, err := c.tenantClient.List(ctx, &api.ListTenantsRequest{
		Limit: 1,
	})
	if err != nil {
		return "", fmt.Errorf("list tenants: %w", err)
	}
	if len(resp.Result) == 0 {
		return "", fmt.Errorf("no tenants found in ChirpStack")
	}
	return resp.Result[0].Id, nil
}

// ensureDeviceProfile finds a device profile by name or creates it.
func (c *Client) ensureDeviceProfile(ctx context.Context, tenantID string) (string, error) {
	// Search for existing profile
	resp, err := c.deviceProfileClient.List(ctx, &api.ListDeviceProfilesRequest{
		Limit:    10,
		TenantId: tenantID,
		Search:   deviceProfileName,
	})
	if err != nil {
		return "", fmt.Errorf("list device profiles: %w", err)
	}

	for _, dp := range resp.Result {
		if dp.Name == deviceProfileName {
			return dp.Id, nil
		}
	}

	// Not found — create it
	createResp, err := c.deviceProfileClient.Create(ctx, &api.CreateDeviceProfileRequest{
		DeviceProfile: &api.DeviceProfile{
			Name:                deviceProfileName,
			TenantId:            tenantID,
			MacVersion:          common.MacVersion_LORAWAN_1_0_3,
			RegParamsRevision:   common.RegParamsRevision_B,
			SupportsOtaa:        true,
			Region:              common.Region_EU868,
			AdrAlgorithmId:      "default",
			PayloadCodecRuntime: api.CodecRuntime_CAYENNE_LPP,
		},
	})
	if err != nil {
		return "", fmt.Errorf("create device profile: %w", err)
	}

	return createResp.Id, nil
}

// ensureApplication finds an application by name or creates it.
func (c *Client) ensureApplication(ctx context.Context, tenantID string) (string, error) {
	// Search for existing application
	resp, err := c.applicationClient.List(ctx, &api.ListApplicationsRequest{
		Limit:    10,
		TenantId: tenantID,
		Search:   applicationName,
	})
	if err != nil {
		return "", fmt.Errorf("list applications: %w", err)
	}

	for _, app := range resp.Result {
		if app.Name == applicationName {
			return app.Id, nil
		}
	}

	// Not found — create it
	createResp, err := c.applicationClient.Create(ctx, &api.CreateApplicationRequest{
		Application: &api.Application{
			Name:        applicationName,
			Description: "Auto-managed by advatens server",
			TenantId:    tenantID,
		},
	})
	if err != nil {
		return "", fmt.Errorf("create application: %w", err)
	}

	return createResp.Id, nil
}
