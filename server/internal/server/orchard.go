package server

import (
	"context"
	"log"
	db "server/internal/db/sqlc"
)

func (s Server) GetOrchards(ctx context.Context, request GetOrchardsRequestObject) (GetOrchardsResponseObject, error) {

	userIdVal := ctx.Value("userID")

	if userIdVal == nil {
		log.Printf("this is the weird bullshit happening")
		return GetOrchards401JSONResponse{}, nil
	}

	userId := userIdVal.(string)

	data, err := s.queries.ListOrchards(ctx, userId)

	if err != nil {
		return nil, err
	}

	domainOrchards := make([]Orchard, len(data))

	for i, orchard := range data {

		stations, err := s.queries.ListStationsByOrchard(ctx, orchard.ID)
		if err != nil {
			return nil, err
		}

		domainOrchards[i] = OrchardToDomain(orchard)

		stationsArray := new([]Station)
		*stationsArray = make([]Station, len(stations))
		for j, station := range stations {
			(*stationsArray)[j] = StationToDomain(station)
		}
		domainOrchards[i].Stations = stationsArray
	}

	return GetOrchards200JSONResponse(domainOrchards), nil
}

func (s Server) GetOrchard(ctx context.Context, request GetOrchardRequestObject) (GetOrchardResponseObject, error) {

	orchard, err := s.queries.GetOrchardById(ctx, request.OrchardId)

	if err != nil {
		return nil, err
	}
	return GetOrchard200JSONResponse(OrchardToDomain(orchard)), nil
}

func (s Server) CreateOrchard(ctx context.Context, request CreateOrchardRequestObject) (CreateOrchardResponseObject, error) {

	userIdVal := ctx.Value("userID")

	if userIdVal == nil {
		log.Printf("this is the weird bullshit happening")
		return CreateOrchard401JSONResponse{}, nil
	}

	userId := userIdVal.(string)

	orchard, err := s.queries.CreateOrchard(ctx, db.CreateOrchardParams{
		Name:    request.Body.Name,
		OwnerID: userId,
	})

	if err != nil {
		return nil, err
	}

	return CreateOrchard201JSONResponse(OrchardToDomain(orchard)), nil
}

func (s Server) UpdateOrchard(ctx context.Context, request UpdateOrchardRequestObject) (UpdateOrchardResponseObject, error) {

	orchard, err := s.queries.UpdateOrchard(ctx, db.UpdateOrchardParams{
		ID:   request.OrchardId,
		Name: request.Body.Name,
	})

	if err != nil {
		return nil, err
	}

	return UpdateOrchard200JSONResponse(OrchardToDomain(orchard)), nil
}

func (s Server) DeleteOrchard(ctx context.Context, request DeleteOrchardRequestObject) (DeleteOrchardResponseObject, error) {

	err := s.queries.DeleteOrchard(ctx, request.OrchardId)

	if err != nil {
		return nil, err
	}

	return DeleteOrchard204Response{}, nil
}
