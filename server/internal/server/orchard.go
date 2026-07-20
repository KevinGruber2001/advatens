package server

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"

	db "server/internal/db/sqlc"
)

func (s Server) GetOrchards(ctx context.Context, request GetOrchardsRequestObject) (GetOrchardsResponseObject, error) {

	userId, ok := userIDFromContext(ctx)
	if !ok {
		return GetOrchards401JSONResponse{}, nil
	}

	orchards, err := s.queries.ListOrchards(ctx, userId)
	if err != nil {
		log.Printf("Error listing orchards for user %s: %v", userId, err)
		return nil, err
	}

	orchardIds := make([]uuid.UUID, len(orchards))
	for i, orchard := range orchards {
		orchardIds[i] = orchard.ID
	}

	stations, err := s.queries.ListStationsByOrchards(ctx, orchardIds)
	if err != nil {
		log.Printf("Error listing stations for user %s: %v", userId, err)
		return nil, err
	}

	stationsByOrchard := make(map[uuid.UUID][]Station)
	for _, station := range stations {
		stationsByOrchard[station.OrchardID] = append(stationsByOrchard[station.OrchardID], StationToDomain(station))
	}

	domainOrchards := make([]Orchard, len(orchards))
	for i, orchard := range orchards {
		domainOrchards[i] = OrchardToDomain(orchard)
		orchardStations := stationsByOrchard[orchard.ID]
		if orchardStations == nil {
			orchardStations = []Station{}
		}
		domainOrchards[i].Stations = &orchardStations
	}

	return GetOrchards200JSONResponse(domainOrchards), nil
}

func (s Server) GetOrchard(ctx context.Context, request GetOrchardRequestObject) (GetOrchardResponseObject, error) {

	orchard, err := s.queries.GetOrchardById(ctx, request.OrchardId)

	if err != nil {
		log.Printf("Error getting orchard %s: %v", request.OrchardId, err)
		return nil, err
	}
	return GetOrchard200JSONResponse(OrchardToDomain(orchard)), nil
}

func (s Server) CreateOrchard(ctx context.Context, request CreateOrchardRequestObject) (CreateOrchardResponseObject, error) {

	userId, ok := userIDFromContext(ctx)
	if !ok {
		return CreateOrchard401JSONResponse{}, nil
	}

	// Validate input
	if len(request.Body.Name) < 2 || len(request.Body.Name) > 32 {
		log.Printf("Invalid orchard name length: %d characters", len(request.Body.Name))
		return nil, fmt.Errorf("orchard name must be between 2 and 32 characters")
	}

	orchard, err := s.queries.CreateOrchard(ctx, db.CreateOrchardParams{
		Name:    request.Body.Name,
		OwnerID: userId,
	})

	if err != nil {
		log.Printf("Error creating orchard for user %s: %v", userId, err)
		return nil, err
	}

	return CreateOrchard201JSONResponse(OrchardToDomain(orchard)), nil
}

func (s Server) UpdateOrchard(ctx context.Context, request UpdateOrchardRequestObject) (UpdateOrchardResponseObject, error) {

	// Validate input
	if request.Body.Name != nil && (len(*request.Body.Name) < 2 || len(*request.Body.Name) > 32) {
		log.Printf("Invalid orchard name length: %d characters", len(*request.Body.Name))
		return nil, fmt.Errorf("orchard name must be between 2 and 32 characters")
	}

	orchard, err := s.queries.UpdateOrchard(ctx, db.UpdateOrchardParams{
		ID:   request.OrchardId,
		Name: request.Body.Name,
	})

	if err != nil {
		log.Printf("Error updating orchard %s: %v", request.OrchardId, err)
		return nil, err
	}

	return UpdateOrchard200JSONResponse(OrchardToDomain(orchard)), nil
}

func (s Server) DeleteOrchard(ctx context.Context, request DeleteOrchardRequestObject) (DeleteOrchardResponseObject, error) {

	err := s.queries.DeleteOrchard(ctx, request.OrchardId)

	if err != nil {
		log.Printf("Error deleting orchard %s: %v", request.OrchardId, err)
		return nil, err
	}

	return DeleteOrchard204Response{}, nil
}
