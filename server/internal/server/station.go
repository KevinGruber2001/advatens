package server

import (
	"context"
	"fmt"
	"log"
	"server/internal/chirpstack"
	db "server/internal/db/sqlc"
)

func (s Server) CreateStation(ctx context.Context, request CreateStationRequestObject) (CreateStationResponseObject, error) {

	// Verify Orchard Exists
	orchard, err := s.queries.GetOrchardById(ctx, request.Body.OrchardId)
	if err != nil {
		log.Printf("error getting orchard: %v", err)
		return nil, err
	}

	// Create Device in Chirpstack first
	// Create device in ChirpStack FIRST
	_, err = s.chirpstack.CreateDevice(ctx, chirpstack.CreateDeviceRequest{
		DevEUI:          request.Body.DeviceId,
		Name:            request.Body.Name,
		Description:     fmt.Sprintf("Station for orchard: %s", orchard.Name),
		ApplicationID:   s.config.CHIRPSTACK_APPLICATION_ID,
		DeviceProfileID: s.config.CHIRPSTACK_DEVICE_PROFILE_ID, // Need to configure this
	})

	if err != nil {
		log.Printf("error creating chirpstack device: %v", err)
		return nil, err
	}

	station, err := s.queries.CreateStation(ctx, db.CreateStationParams{
		Name:      request.Body.Name,
		DeviceID:  request.Body.DeviceId,
		OrchardID: orchard.ID,
	})

	if err != nil {
		// Rollback: Delete from Chirpstack if DB insert fails
		deleteErr := s.chirpstack.DeleteDevice(ctx, request.Body.DeviceId)
		if deleteErr != nil {
			log.Printf("error rolling back chirpstack device: %v", deleteErr)
		}

		log.Println("Error creating station: %v", err)
		return nil, err
	}

	return CreateStation201JSONResponse(StationToDomain(station)), nil
}

func (s Server) GetStationsByOrchard(ctx context.Context, request GetStationsByOrchardRequestObject) (GetStationsByOrchardResponseObject, error) {
	stations, err := s.queries.ListStationsByOrchard(ctx, request.OrchardId)

	if err != nil {
		return nil, err
	}

	domainStations := make([]Station, len(stations))

	for i, station := range stations {
		domainStations[i] = StationToDomain(station)
	}

	return GetStationsByOrchard200JSONResponse(domainStations), nil
}

func (s Server) GetStation(ctx context.Context, request GetStationRequestObject) (GetStationResponseObject, error) {

	station, err := s.queries.GetStationById(ctx, request.StationId)

	if err != nil {
		return nil, err
	}

	return GetStation200JSONResponse(StationToDomain(station)), nil
}

func (s Server) UpdateStation(ctx context.Context, request UpdateStationRequestObject) (UpdateStationResponseObject, error) {

	station, err := s.queries.UpdateStation(ctx, db.UpdateStationParams{
		ID:   request.StationId,
		Name: request.Body.Name,
	})

	if err != nil {
		return nil, err
	}

	return UpdateStation200JSONResponse(StationToDomain(station)), nil
}

func (s Server) DeleteStation(ctx context.Context, request DeleteStationRequestObject) (DeleteStationResponseObject, error) {

	station, err := s.queries.GetStationById(ctx, request.StationId)
	if err != nil {
		log.Printf("error getting station: %v", err)
		return nil, err
	}

	// Delete from Chirpstack
	err = s.chirpstack.DeleteDevice(ctx, station.DeviceID)
	if err != nil {
		log.Printf("error deleting chirpstack device: %v", err)
	}

	err = s.queries.DeleteStation(ctx, request.StationId)
	if err != nil {
		log.Printf("error deleting station: %v", err)
		return nil, err
	}

	return DeleteStation204Response{}, nil
}
