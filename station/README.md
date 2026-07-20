# Station firmware

Soil moisture LoRaWAN station: RAK4631 (RUI3) + RAK12035 soil sensor.

- Uplink every **15 min** (unconfirmed, ADR on), CayenneLPP on fPort 2,
  matching the server's metric mapping
  (`server/internal/mqtt/subscriber.go`):

  | Channel | LPP type          | ChirpStack object key | Meaning              |
  |---------|-------------------|-----------------------|----------------------|
  | 1       | Temperature       | `temperatureSensor_1` | soil temp, 0.1 °C    |
  | 3       | Analog input      | `analogInput_3`       | soil moisture, %     |
  | 4       | Analog input      | `analogInput_4`       | battery voltage, V   |

- The soil sensor is powered only around each reading.
- Join uses exponential backoff (30 s → 1 h cap) and reboots after 20
  failed attempts; a station deployed before its gateway joins by itself.
- BLE advertises for 4 min after boot (WisToolBox service window), then off.
- One generic binary for all stations: **no credentials in the build**.

RUI3 has no PlatformIO support, so the firmware is built with **arduino-cli**.
This folder is the sketch: `station.ino` (folder name = sketch name).

## Build

```sh
make setup                # one-time: RUI3 board package + libraries
make firmware             # compile
make firmware BENCH=1     # compile with 30 s uplink interval for bench work
make flash PORT=/dev/cu.usbmodemXXXX
make monitor PORT=/dev/cu.usbmodemXXXX
```

## Provisioning a new station (bench runbook)

1. **Flash** the generic firmware: `make flash PORT=...`.
2. **Set LoRaWAN credentials** over the serial console (`make monitor`).
   Take DevEUI/AppKey from the server/dashboard for this station
   (the `station` table is the source of truth; the reconciler creates the
   device in ChirpStack):

   ```
   AT+DEVEUI=65061aef0b1de4f3
   AT+APPEUI=0000000000000000
   AT+APPKEY=<32 hex chars>
   ```

   RUI3 persists these in flash — they survive reflashing the sketch.
3. **Calibrate the soil sensor** (values differ per sensor unit):
   - hold the sensor in dry air, wait 1 min, read the capacitance from the
     serial log (or `ATC+SOILCAL=?` for current values);
   - submerge the probe in water up to the line, wait 1 min, read again;
   - store both: `ATC+SOILCAL=<dry>,<wet>` (e.g. `ATC+SOILCAL=560,356`).
   Persisted in user flash; check with `ATC+SOILCAL=?`.
4. **Verify join**: `ATZ` (reboot) and watch the log for `Joined` and the
   first uplink; confirm the measurement shows up in the dashboard.
5. **Label** the physical device with its DevEUI.

## Behavior reference

- `AT+...` — the whole RUI3 AT command set is live on serial and over BLE
  during the service window.
- `ATC+SOILCAL=<dry>,<wet>` — set calibration; `ATC+SOILCAL=?` reads it.
- Reboots itself after 24 consecutive failed cycles (~6 h) or 20 failed
  join attempts — last-resort recovery, no human required.
- If only part of the sensor read fails, the uplink still carries whatever
  is valid (battery voltage always included, as a liveness signal).

## Power

To be measured (ROADMAP 1.5): sleep current, average current, projected
battery life. Record the numbers here.
