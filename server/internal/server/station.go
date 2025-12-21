package server

import (
	"context"
	db "server/internal/db/sqlc"
)

func (s Server) CreateStation(ctx context.Context, request CreateStationRequestObject) (CreateStationResponseObject, error) {

	station, err := s.queries.CreateStation(ctx, db.CreateStationParams{
		Name:      request.Body.Name,
		DeviceID:  request.Body.DeviceId,
		OrchardID: request.Body.OrchardId,
	})

	if err != nil {
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
	err := s.queries.DeleteStation(ctx, request.StationId)

	if err != nil {
		return nil, err
	}
	return DeleteStation204Response{}, nil
}
