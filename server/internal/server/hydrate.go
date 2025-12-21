package server

import (
	db "server/internal/db/sqlc"
)

func OrchardToDomain(orchard db.Orchard) Orchard {
	return Orchard{
		Id:      orchard.ID,
		Name:    orchard.Name,
		OwnerId: orchard.OwnerID,
	}
}

func OrchardToDb(orchard Orchard) db.Orchard {
	return db.Orchard{
		ID:      orchard.Id,
		Name:    orchard.Name,
		OwnerID: orchard.OwnerId,
	}
}

func StationToDomain(station db.Station) Station {
	return Station{
		DeviceId:  station.DeviceID,
		Id:        station.ID,
		Name:      station.Name,
		OrchardId: station.OrchardID,
	}
}
