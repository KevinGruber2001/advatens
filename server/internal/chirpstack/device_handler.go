package chirpstack

import (
	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"golang.org/x/net/context"
)

type CreateDeviceRequest struct {
	DevEUI      string // Device EUI (unique identifier)
	Name        string
	Description string
}

func (c *Client) CreateDevice(ctx context.Context, req CreateDeviceRequest) (*api.Device, error) {
	ctx = c.withAuth(ctx)

	device := &api.Device{
		DevEui:          req.DevEUI,
		Name:            req.Name,
		Description:     req.Description,
		ApplicationId:   c.applicationID,
		DeviceProfileId: c.deviceProfileID,
		IsDisabled:      false,
		SkipFcntCheck:   false,
	}

	createReq := &api.CreateDeviceRequest{
		Device: device,
	}

	_, err := c.deviceClient.Create(ctx, createReq)
	if err != nil {
		return nil, err
	}

	return device, nil
}

func (c *Client) GetDevice(ctx context.Context, devEUI string) (*api.Device, error) {
	ctx = c.withAuth(ctx)

	req := &api.GetDeviceRequest{
		DevEui: devEUI,
	}

	resp, err := c.deviceClient.Get(ctx, req)
	if err != nil {
		return nil, err
	}

	return resp.Device, nil
}

func (c *Client) DeleteDevice(ctx context.Context, devEUI string) error {
	ctx = c.withAuth(ctx)

	req := &api.DeleteDeviceRequest{
		DevEui: devEUI,
	}

	_, err := c.deviceClient.Delete(ctx, req)
	return err
}

func (c *Client) UpdateDevice(ctx context.Context, device *api.Device) error {
	ctx = c.withAuth(ctx)

	req := &api.UpdateDeviceRequest{
		Device: device,
	}

	_, err := c.deviceClient.Update(ctx, req)
	return err
}

// ListDevices returns all devices in the bootstrapped application.
func (c *Client) ListDevices(ctx context.Context) ([]*api.DeviceListItem, error) {
	ctx = c.withAuth(ctx)

	var devices []*api.DeviceListItem
	var offset uint32
	const pageSize = 100

	for {
		resp, err := c.deviceClient.List(ctx, &api.ListDevicesRequest{
			ApplicationId: c.applicationID,
			Limit:         pageSize,
			Offset:        offset,
		})
		if err != nil {
			return nil, err
		}
		devices = append(devices, resp.Result...)

		offset += uint32(len(resp.Result))
		if len(resp.Result) == 0 || offset >= resp.TotalCount {
			return devices, nil
		}
	}
}
