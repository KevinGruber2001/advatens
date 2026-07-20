# Station roadmap

Path from the current firmware (working RAK example on a desk) to a fleet of
stations surviving unattended in an orchard. Phases build on each other;
within a phase, steps are ordered by priority.

Current state: RAK4631 (RUI3 4.2.2) + RAK12035, CayenneLPP uplink of soil
temperature and moisture every 20 s, confirmed, credentials baked into the
binary via `secrets.h`, no battery reporting, no remote configuration.

---

## Phase 1 — Field-ready firmware

Goal: one station can be deployed outdoors and trusted to run on a battery
for a season. Everything here is a change to `station.ino`.

### 1.1 Realistic uplink cadence, unconfirmed

**Why.** 20 s confirmed uplinks with retry drain the battery in days and
waste EU868 duty cycle. Soil conditions change over hours, not seconds; and
a lost reading is irrelevant when the next one arrives shortly after —
confirmed mode buys nothing but airtime and battery cost.

**What.** Raise the uplink interval to 15–30 min (keep a short interval
behind a debug flag for bench work). Switch `api.lorawan.send` to
unconfirmed and drop `cfm`/`rety`. Keep ADR on — stations are stationary,
it will settle on an efficient data rate.

**Done when.** A station on the bench uplinks every 15 min unconfirmed and
the measured average current supports a season on the chosen battery
(see 1.5).

### 1.2 Power-gate the soil sensor

**Why.** The RAK12035 is powered continuously today. Between two readings
15 min apart it does nothing but consume — sensor idle current is a large
share of the total sleep budget.

**What.** Use the library's `sensor_on()` / `sensor_off()` around each
reading: power up, wait the sensor's stabilization time, read capacitance +
temperature, power down. Re-apply any sensor register settings after each
power-up since they don't survive power-off.

**Done when.** Sleep current measured at the battery drops accordingly and
readings after power-cycling match continuous-power readings.

### 1.3 Battery voltage in the uplink

**Why.** The server data model and dashboard already expect a battery
measurement, and battery trend is the single most important operational
signal from a field device — it predicts failure before it happens.

**What.** Read the battery via RUI3 (`api.system.bat.get()`), add it to the
payload on its own CayenneLPP channel (channel 3, analog-input or voltage
type — pick one and mirror it in the ChirpStack codec / server ingest).
Verify the value appears end-to-end in the dashboard.

**Done when.** Battery voltage from a real station renders in the frontend
chart.

### 1.4 Join and runtime robustness

**Why.** `setup()` currently either blocks forever re-joining every 10 s or
`return`s early, leaving a device that looks alive but will never uplink.
In the field there is no serial console and no one to press reset.

**What.**
- Join with exponential backoff (e.g. 30 s → 1 min → … → cap at 1 h),
  sleeping between attempts instead of busy-waiting, so a station deployed
  before the gateway is up joins on its own later.
- After N consecutive failures of any critical step (join lost, sensor
  unreadable), `api.system.reboot()` as a last resort.
- Handle a failed sensor read gracefully: still uplink temperature/battery
  if only moisture failed, or skip the cycle — never hang.

**Done when.** A station powered on with the gateway offline joins and
resumes automatically once the gateway appears, without intervention.

### 1.5 Power audit

**Why.** All of the above is guesswork until sleep current is measured.
A single misbehaving peripheral (BLE advertising, a floating pin, the
sensor) can dominate the budget.

**What.** Measure current in sleep and during an uplink cycle (PPK2 or a
multimeter with min/max). Disable what isn't needed — RUI3 has BLE
advertising enabled by default on the RAK4631; turn it off (or advertise
only for the first minutes after boot as a service window). From the
measurements, compute expected life on the chosen battery and record both
numbers in the README.

**Done when.** README states measured sleep current, average current, and
projected battery life.

### 1.6 CI compile check

**Why.** The firmware has no automated check at all; a broken commit is
only discovered at the next manual `make firmware`.

**What.** GitHub Actions workflow: install arduino-cli, run `make setup`
(cached), `make firmware` on every PR touching `station/`. Compile-only —
no hardware needed.

**Done when.** A PR that breaks the build goes red.

---

## Phase 2 — Fleet provisioning

Goal: flashing station #10 is a 5-minute checklist, not a code edit.

### 2.1 One generic binary — credentials out of the build

**Why.** `secrets.h` bakes LoRaWAN keys into the binary, so every station
needs its own compiled firmware. That doesn't scale and it couples a
security artifact to the build.

**What.** RUI3 stores LoRaWAN credentials in flash and the AT command set
(`AT+DEVEUI`, `AT+APPEUI`, `AT+APPKEY`) is already active on serial
(`RAK_AT_MODE`). Remove the `secrets.h` mechanism and the `api.lorawan.*.set`
key calls from `setup()`; the sketch only *reads* what's provisioned.
Provision each device once over USB (WisToolBox or a serial script) after
flashing.

**Done when.** Two stations run the identical binary with different
identities, and the repo contains no credential material at all.

### 2.2 Server-driven key generation

**Why.** The Go server already treats the `station` table as the source of
truth and reconciles devices into ChirpStack. Keys invented ad hoc at the
bench bypass that and drift is inevitable.

**What.** Server generates DevEUI/AppKey when a station is created (API +
frontend already exist for stations); the provisioning step at the bench
pulls them from the server (or the operator copies them from the dashboard)
and writes them to the device via AT commands. Write the runbook down in
`station/README.md`: flash → provision keys → label the physical device
with its DevEUI → verify join.

**Done when.** A new station goes from blank hardware to visible-in-dashboard
using only the runbook, with keys that never existed outside server + device.

### 2.3 Per-sensor calibration stored on the device

**Why.** RAK12035 dry/wet capacitance values vary per sensor unit; the
current firmware hardcodes one pair (356/560) for all stations, so absolute
moisture % is wrong on every other sensor.

**What.** Store dry/wet values in RUI3 user flash (`api.system.flash`),
falling back to defaults if unset. Add a custom AT command
(`api.system.atMode.add`) to set them, e.g. `ATC+SOILCAL=<dry>,<wet>`.
Define the bench calibration procedure (reading in dry air, reading in
water) and add it to the provisioning runbook. Consider logging raw
capacitance alongside moisture % in the uplink during the pilot so
calibration can be corrected retroactively server-side.

**Done when.** Two sensors in the same glass of water report the same
moisture %.

---

## Phase 3 — Remote operations

Goal: a deployed station can be observed and adjusted without driving to
the orchard.

### 3.1 Downlink configuration

**Why.** The uplink interval (and later thresholds) will need tuning after
deployment — battery reality vs. data resolution. Today the only knob is
reflashing.

**What.** Define a minimal downlink format on a dedicated fPort (e.g.
fPort 10: `[cmd, value…]`, first command = set uplink interval in minutes,
with sane bounds). Implement it in `recvCallback` (which currently only
prints), persist to user flash, apply on next cycle. Class A means the
downlink arrives after an uplink — document that latency expectation.
Add the sending side to the server later; `chirpstack` UI queueing is
enough to start.

**Done when.** Changing the interval from the ChirpStack UI takes effect
without touching the device, and survives a reboot.

### 3.2 Status uplink

**Why.** When a station misbehaves, the measurement stream alone can't
distinguish firmware version, reboot loops, or radio trouble.

**What.** Once per day (and once after every boot), send a status packet on
a separate fPort: firmware version, reset reason, join attempt count since
boot. Keep it tiny. Surface at least firmware version in the dashboard's
station detail.

**Done when.** The dashboard shows which firmware version every deployed
station runs.

### 3.3 Firmware update strategy — decision gate

**Why.** This decides hardware purchases, so it must be settled *before*
scaling beyond a handful of stations. Current facts: LoRaWAN FUOTA works
with ChirpStack on the RAK3172 (STM32WL) with RUI3 v5; the RAK4631's RUI3
core (nRF52, latest 4.2.2) has no FUOTA, and no timeline is public. The
RAK4631 fallbacks are BLE DFU (walk up with a phone) and USB.

**What.** Decide explicitly, and record the decision:
- **Few stations / accessible sites** → stay on RAK4631, BLE DFU is fine.
- **Many stations / remote sites** → port the sketch to RAK3172 (small: the
  RAK12035 is I2C, the RUI3 API is identical; losses are BLE and flash
  headroom, currently unused) and adopt RUI3 v5 FUOTA once it's stable.
Prototype the port on one RAK3172 evaluation board before committing.

**Done when.** A written decision exists and the next hardware order
follows it.

---

## Phase 4 — Hardware & field validation

Goal: numbers instead of assumptions.

### 4.1 Deployment hardware

**Why.** The electronics currently live on a desk; an orchard adds rain,
condensation, UV, temperature swings and curious wildlife.

**What.** Choose and test: IP65+ enclosure with cable gland for the sensor
lead, battery (Li-SOCl₂ or Li-ion + solar, informed by the Phase 1 power
audit), external antenna placement, and mounting (pole/tree, sensor burial
depth per agronomic advice — typically root-zone depth).

**Done when.** One fully assembled station has survived ≥2 weeks outdoors
including rain, with dry electronics.

### 4.2 Field pilot

**Why.** Radio range, real battery curve, sensor drift and packet loss can
only be learned outside.

**What.** Deploy 2–3 stations at the target orchard at realistic distances
from the gateway. Track for 4–6 weeks: packet delivery rate, SF/RSSI per
station (ChirpStack has this), battery voltage curve, moisture plausibility
against manual checks (or rain events). Feed findings back into Phase 1
settings (interval, ADR behavior) and Phase 2 calibration.

**Done when.** A pilot report exists: delivery rate, projected battery life
from the measured curve, and a go/no-go for wider rollout.
