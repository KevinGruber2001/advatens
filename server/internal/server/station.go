package server

import (
	"context"
	"errors"
	"log"

	"github.com/jackc/pgx/v5/pgconn"

	db "server/internal/db/sqlc"
)

func errorResponse(code int, message string) Error {
	return Error{Code: &code, Message: &message}
}

func (s Server) CreateStation(ctx context.Context, request CreateStationRequestObject) (CreateStationResponseObject, error) {

	// Verify Orchard Exists
	orchard, err := s.queries.GetOrchardById(ctx, request.Body.OrchardId)
	if err != nil {
		log.Printf("error getting orchard: %v", err)
		return nil, err
	}

	appKey, err := generateAppKey()
	if err != nil {
		log.Printf("error generating app key: %v", err)
		return nil, err
	}

	// DevEUI collisions are astronomically unlikely (64 bits of randomness)
	// but the column is unique, so retry a few times rather than fail outright.
	const maxAttempts = 5
	var station db.Station
	for attempt := 0; attempt < maxAttempts; attempt++ {
		deviceID, genErr := generateDevEUI()
		if genErr != nil {
			log.Printf("error generating device EUI: %v", genErr)
			return nil, genErr
		}

		// The station is only written to the database here; the reconciler
		// provisions the ChirpStack device (and its keys) asynchronously.
		station, err = s.queries.CreateStation(ctx, db.CreateStationParams{
			Name:      request.Body.Name,
			DeviceID:  deviceID,
			OrchardID: orchard.ID,
			AppKey:    &appKey,
		})
		if err == nil {
			break
		}

		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			continue // DevEUI collision, try another
		}
		log.Printf("error creating station: %v", err)
		return nil, err
	}
	if err != nil {
		return nil, err
	}

	s.sync.Nudge()

	return CreateStation201JSONResponse(StationToCredentials(station)), nil
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

	s.sync.Nudge()

	return UpdateStation200JSONResponse(StationToDomain(station)), nil
}

func (s Server) DeleteStation(ctx context.Context, request DeleteStationRequestObject) (DeleteStationResponseObject, error) {

	// Soft-delete: the row is marked and hidden from reads immediately; the
	// reconciler removes the ChirpStack device and then the row itself.
	err := s.queries.MarkStationDeletePending(ctx, request.StationId)
	if err != nil {
		log.Printf("error deleting station: %v", err)
		return nil, err
	}

	s.sync.Nudge()

	return DeleteStation204Response{}, nil
}
