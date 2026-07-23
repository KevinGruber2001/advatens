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

func StationToDomain(station db.Station) Station {
	return Station{
		DeviceId:  station.DeviceID,
		Id:        station.ID,
		Name:      station.Name,
		OrchardId: station.OrchardID,
	}
}

// StationToCredentials includes the generated AppKey — only ever call this
// for the create-station response; every other endpoint uses StationToDomain
// so the key is not re-exposed after creation.
func StationToCredentials(station db.Station) StationCredentials {
	appKey := ""
	if station.AppKey != nil {
		appKey = *station.AppKey
	}
	return StationCredentials{
		Id:        station.ID,
		OrchardId: station.OrchardID,
		Name:      station.Name,
		DeviceId:  station.DeviceID,
		AppEui:    stationAppEUI,
		AppKey:    appKey,
	}
}
