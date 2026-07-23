// Package reconciler keeps ChirpStack in sync with the station table.
//
// The database is the source of truth: API handlers only write rows (with a
// sync_status of 'pending' or 'delete_pending') and nudge the reconciler. The
// reconciler periodically diffs the station table against the devices in the
// ChirpStack application and converges ChirpStack toward the database. This
// makes provisioning idempotent and self-healing: crashes between writes,
// failed ChirpStack calls and manual changes in the ChirpStack UI are all
// repaired on the next pass.
package reconciler

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/chirpstack/chirpstack/api/go/v4/api"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"server/internal/chirpstack"
	db "server/internal/db/sqlc"
)

type Reconciler struct {
	queries  *db.Queries
	cs       *chirpstack.Client
	interval time.Duration
	nudge    chan struct{}
}

func New(queries *db.Queries, cs *chirpstack.Client, interval time.Duration) *Reconciler {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	return &Reconciler{
		queries:  queries,
		cs:       cs,
		interval: interval,
		nudge:    make(chan struct{}, 1),
	}
}

// Nudge requests an immediate reconcile pass. It never blocks; if a pass is
// already queued the nudge is coalesced into it.
func (r *Reconciler) Nudge() {
	select {
	case r.nudge <- struct{}{}:
	default:
	}
}

// Run reconciles on every tick and on every nudge until ctx is cancelled.
func (r *Reconciler) Run(ctx context.Context) {
	r.reconcile(ctx)

	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("reconciler: stopped")
			return
		case <-ticker.C:
		case <-r.nudge:
		}
		r.reconcile(ctx)
	}
}

func (r *Reconciler) reconcile(ctx context.Context) {
	err := r.reconcileOnce(ctx)
	if err == nil {
		return
	}

	// The dev-mode login JWT expires; refresh it and retry once.
	if status.Code(err) == codes.Unauthenticated {
		if loginErr := r.cs.Relogin(ctx); loginErr != nil {
			log.Printf("reconciler: relogin failed: %v", loginErr)
			return
		}
		log.Println("reconciler: refreshed chirpstack token, retrying")
		err = r.reconcileOnce(ctx)
	}
	if err != nil {
		log.Printf("reconciler: pass failed: %v", err)
	}
}

func (r *Reconciler) reconcileOnce(ctx context.Context) error {
	stations, err := r.queries.ListStationsForSync(ctx)
	if err != nil {
		return fmt.Errorf("list stations: %w", err)
	}

	devices, err := r.cs.ListDevices(ctx)
	if err != nil {
		return fmt.Errorf("list chirpstack devices: %w", err)
	}

	deviceByEUI := make(map[string]*api.DeviceListItem, len(devices))
	for _, d := range devices {
		deviceByEUI[d.DevEui] = d
	}

	known := make(map[string]bool, len(stations))
	var firstErr error
	fail := func(err error) {
		if firstErr == nil {
			firstErr = err
		}
		log.Printf("reconciler: %v", err)
	}

	for _, station := range stations {
		known[station.DeviceID] = true
		device := deviceByEUI[station.DeviceID]

		switch station.SyncStatus {
		case db.StationSyncStatusDeletePending:
			if device != nil {
				if err := r.cs.DeleteDevice(ctx, station.DeviceID); err != nil {
					fail(fmt.Errorf("delete device %s: %w", station.DeviceID, err))
					continue
				}
			}
			if err := r.queries.HardDeleteStation(ctx, station.ID); err != nil {
				fail(fmt.Errorf("hard-delete station %s: %w", station.ID, err))
				continue
			}
			log.Printf("reconciler: deleted station %s (device %s)", station.ID, station.DeviceID)

		case db.StationSyncStatusPending:
			if device == nil {
				if err := r.createDevice(ctx, station); err != nil {
					fail(fmt.Errorf("create device %s: %w", station.DeviceID, err))
					continue
				}
				log.Printf("reconciler: created device %s for station %s", station.DeviceID, station.ID)
			} else if device.Name != station.Name {
				if err := r.updateDevice(ctx, station); err != nil {
					fail(fmt.Errorf("update device %s: %w", station.DeviceID, err))
					continue
				}
				log.Printf("reconciler: updated device %s for station %s", station.DeviceID, station.ID)
			}
			if err := r.queries.SetStationSyncStatus(ctx, db.SetStationSyncStatusParams{
				ID:         station.ID,
				SyncStatus: db.StationSyncStatusSynced,
			}); err != nil {
				fail(fmt.Errorf("mark station %s synced: %w", station.ID, err))
			}

		case db.StationSyncStatusSynced:
			if device == nil {
				// Drift: the device vanished from ChirpStack (e.g. deleted in
				// its UI). Recreate it — the database is the source of truth.
				if err := r.createDevice(ctx, station); err != nil {
					fail(fmt.Errorf("recreate device %s: %w", station.DeviceID, err))
					continue
				}
				log.Printf("reconciler: recreated missing device %s for station %s", station.DeviceID, station.ID)
			}
		}
	}

	// Devices in our application with no station row are orphans (e.g. left
	// over from a crash between the old dual writes). Remove them.
	for eui := range deviceByEUI {
		if known[eui] {
			continue
		}
		if err := r.cs.DeleteDevice(ctx, eui); err != nil {
			fail(fmt.Errorf("delete orphan device %s: %w", eui, err))
			continue
		}
		log.Printf("reconciler: deleted orphan device %s", eui)
	}

	return firstErr
}

func (r *Reconciler) createDevice(ctx context.Context, station db.Station) error {
	_, err := r.cs.CreateDevice(ctx, chirpstack.CreateDeviceRequest{
		DevEUI:      station.DeviceID,
		Name:        station.Name,
		Description: "Managed by advatens server",
	})
	if err != nil {
		return err
	}

	// Legacy/manually-provisioned stations have no generated key — leave
	// their keys to be set by hand in the ChirpStack UI, as before.
	if station.AppKey == nil {
		return nil
	}
	if err := r.cs.SetDeviceKeys(ctx, station.DeviceID, *station.AppKey); err != nil {
		return fmt.Errorf("set device keys: %w", err)
	}
	return nil
}

func (r *Reconciler) updateDevice(ctx context.Context, station db.Station) error {
	return r.cs.UpdateDevice(ctx, &api.Device{
		DevEui:          station.DeviceID,
		Name:            station.Name,
		Description:     "Managed by advatens server",
		ApplicationId:   r.cs.ApplicationID(),
		DeviceProfileId: r.cs.DeviceProfileID(),
	})
}
