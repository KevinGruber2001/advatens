/**
 * Advatens soil moisture station — RUI3 firmware for RAK4631 + RAK12035.
 * Build with arduino-cli (RUI3 has no PlatformIO support), see README.md.
 *
 * Uplink (CayenneLPP, fPort 2, unconfirmed) matching the server's
 * metricMapping in server/internal/mqtt/subscriber.go:
 *   channel 1  temperature   (temperatureSensor_1)  soil temperature, °C
 *   channel 3  analog input  (analogInput_3)        soil moisture, %
 *   channel 4  analog input  (analogInput_4)        battery voltage, V
 *
 * LoRaWAN credentials are NOT set by this firmware. Provision them once per
 * device over serial (AT+DEVEUI / AT+APPEUI / AT+APPKEY); RUI3 persists them
 * in flash. Per-sensor calibration is set with ATC+SOILCAL=<dry>,<wet> and
 * persisted in user flash.
 */

#include <CayenneLPP.h>
#include "RAK12035_SoilMoisture.h"
#include "Wire.h"

#define OTAA_BAND (RAK_REGION_EU868)

// 15 min in the field; override for bench work: make firmware BENCH=1
#ifndef UPLINK_PERIOD_MS
#define UPLINK_PERIOD_MS (15UL * 60 * 1000)
#endif

#define FPORT (2)
#define CHANNEL_TEMPERATURE (1)
#define CHANNEL_MOISTURE (3)
#define CHANNEL_BATTERY (4)

// RAK12035 needs a moment after power-up before readings are valid
#define SENSOR_STABILIZE_MS (500)

#define JOIN_BACKOFF_INITIAL_MS (30UL * 1000)
#define JOIN_BACKOFF_MAX_MS (60UL * 60 * 1000)
#define JOIN_ATTEMPTS_BEFORE_REBOOT (20)

// Reboot as a last resort after this many uplink cycles in a row failed
// (sensor unreadable or send rejected). At 15 min per cycle this is ~6 h.
#define MAX_CONSECUTIVE_FAILURES (24)

// BLE service window after boot (for WisToolBox / future BLE DFU), then off
// to save power. Max 255 s (RUI3 API limit).
#define BLE_SERVICE_WINDOW_S (240)

// User-flash settings block (api.system.flash user partition, offset 0)
// v2 adds last-reboot diagnostics: existing field devices will not match this
// magic and fall back to default calibration once — re-run ATC+SOILCAL after
// flashing this on an already-deployed station.
#define SETTINGS_MAGIC (0x41445602) // "ADV" + layout version 2

enum RebootReason : uint8_t {
    REBOOT_REASON_NONE = 0,
    REBOOT_REASON_NWM_FIX = 1,    // work mode was wrong at boot, forced a fix
    REBOOT_REASON_JOIN_FAILED = 2,   // JOIN_ATTEMPTS_BEFORE_REBOOT exhausted
    REBOOT_REASON_UPLINK_FAILED = 3, // MAX_CONSECUTIVE_FAILURES exhausted
};

struct StationSettings {
    uint32_t magic;
    uint16_t dry_cal; // capacitance read as 0 % moisture
    uint16_t wet_cal; // capacitance read as 100 % moisture
    // Diagnostics for the reboot that preceded this boot. Set right before
    // any self-triggered api.system.reboot() call, and reported+cleared once
    // on the next boot — so the cause survives even if nobody had a serial
    // monitor open when it happened, but stale info isn't re-reported on a
    // later, unrelated reset.
    uint8_t last_reboot_reason; // RebootReason
    uint8_t last_sensor_ok;     // valid when reason == REBOOT_REASON_UPLINK_FAILED
    int32_t last_join_status;   // valid when reason == REBOOT_REASON_JOIN_FAILED
    int32_t last_send_status;   // valid when reason == REBOOT_REASON_UPLINK_FAILED
};

CayenneLPP lpp(51);
RAK12035 soilSensor;
StationSettings settings;
volatile bool uplink_due = false;
uint32_t consecutive_failures = 0;

// Latest async callback results, tracked live so they can be captured into
// settings at the moment we decide to reboot (the callbacks themselves don't
// know whether this was the failure that tipped us over the limit).
int32_t g_last_join_status = 0;
int32_t g_last_send_status = 0;

void loadSettings(void)
{
    settings.magic = 0;
    api.system.flash.get(0, (uint8_t *)&settings, sizeof(settings));
    if (settings.magic != SETTINGS_MAGIC) {
        // Unprovisioned: fall back to the values measured on the first
        // prototype sensor. Real deployments must run ATC+SOILCAL.
        settings.magic = SETTINGS_MAGIC;
        settings.dry_cal = 560;
        settings.wet_cal = 356;
        settings.last_reboot_reason = REBOOT_REASON_NONE;
        settings.last_sensor_ok = 1;
        settings.last_join_status = 0;
        settings.last_send_status = 0;
    }
}

bool saveSettings(void)
{
    return api.system.flash.set(0, (uint8_t *)&settings, sizeof(settings));
}

/**
 * Print what caused the previous self-triggered reboot, if any, then clear
 * it so an unrelated later reset doesn't re-report stale info.
 */
void reportLastReboot(void)
{
    switch (settings.last_reboot_reason) {
    case REBOOT_REASON_NWM_FIX:
        Serial.println("Last reboot: fixed LoRaWAN work mode");
        break;
    case REBOOT_REASON_JOIN_FAILED:
        Serial.printf("Last reboot: %d failed joins in a row (last join status %ld)\r\n",
                      JOIN_ATTEMPTS_BEFORE_REBOOT, (long)settings.last_join_status);
        break;
    case REBOOT_REASON_UPLINK_FAILED:
        Serial.printf("Last reboot: %d failed uplink cycles in a row (sensor_ok=%d, last send status %ld)\r\n",
                      MAX_CONSECUTIVE_FAILURES, settings.last_sensor_ok,
                      (long)settings.last_send_status);
        break;
    default:
        return; // nothing to report or clear
    }
    settings.last_reboot_reason = REBOOT_REASON_NONE;
    saveSettings();
}

void applyCalibration(void)
{
    soilSensor.set_dry_cal(settings.dry_cal);
    soilSensor.set_wet_cal(settings.wet_cal);
}

/**
 * ATC+SOILCAL=?           -> report current calibration
 * ATC+SOILCAL=<dry>,<wet> -> set and persist calibration
 */
int soilcal_handler(SERIAL_PORT port, char *cmd, stParam *param)
{
    if (param->argc == 1 && !strcmp(param->argv[0], "?")) {
        Serial.printf("%s=%u,%u\r\n", cmd, settings.dry_cal, settings.wet_cal);
        return AT_OK;
    }
    if (param->argc != 2) {
        return AT_PARAM_ERROR;
    }
    for (int a = 0; a < 2; a++) {
        for (size_t i = 0; i < strlen(param->argv[a]); i++) {
            if (!isdigit(*(param->argv[a] + i))) {
                return AT_PARAM_ERROR;
            }
        }
    }
    uint32_t dry = strtoul(param->argv[0], NULL, 10);
    uint32_t wet = strtoul(param->argv[1], NULL, 10);
    if (dry == 0 || wet == 0 || dry > 0xFFFF || wet > 0xFFFF || dry == wet) {
        return AT_PARAM_ERROR;
    }
    settings.dry_cal = (uint16_t)dry;
    settings.wet_cal = (uint16_t)wet;
    if (!saveSettings()) {
        return AT_ERROR;
    }
    applyCalibration();
    return AT_OK;
}

void recvCallback(SERVICE_LORA_RECEIVE_T *data)
{
    if (data->BufferSize > 0) {
        Serial.printf("Downlink on fPort %d: ", data->Port);
        for (int i = 0; i < data->BufferSize; i++) {
            Serial.printf("%02x", data->Buffer[i]);
        }
        Serial.print("\r\n");
    }
}

void joinCallback(int32_t status)
{
    g_last_join_status = status;
    Serial.printf("Join status: %d\r\n", status);
}

void sendCallback(int32_t status)
{
    g_last_send_status = status;
    if (status == RAK_LORAMAC_STATUS_OK) {
        Serial.println("Uplink sent");
    } else {
        Serial.printf("Uplink failed, status %d\r\n", status);
    }
}

void uplinkTimerHandler(void *data)
{
    (void)data;
    uplink_due = true; // work happens in loop(), not in timer context
}

/**
 * Join with exponential backoff between attempts. A station powered on
 * before its gateway exists will join by itself later.
 *
 * Waits with delay()/millis() rather than api.system.sleep.all(): RUI3's
 * sleep.all() is documented to wake on a LoRaWAN radio TX/RX event and not
 * resume sleeping afterward (RAKwireless forum, "Limitations on RUI3
 * Timers"), which made it return almost immediately throughout this loop —
 * a join attempt is nothing but radio activity (the join TX, the stack's
 * own RX1/RX2 window handling, the join-status callback). delay() is a
 * plain busy-wait, unaffected by that, confirmed working by direct test.
 * Trade-off: the device stays fully awake (no low-power sleep) for the
 * whole join sequence, including long backoff waits — worth revisiting for
 * battery life once this is confirmed solid in the field.
 */
void joinNetwork(void)
{
    uint32_t backoff = JOIN_BACKOFF_INITIAL_MS;
    uint32_t attempts = 0;

    while (api.lorawan.njs.get() == 0) {
        Serial.println("Joining LoRaWAN network...");
        api.lorawan.join();

        // give the join procedure up to 30 s to complete
        uint32_t wait_start = millis();
        while (api.lorawan.njs.get() == 0 && (millis() - wait_start) < 30000) {
            delay(200);
        }

        if (api.lorawan.njs.get() == 1) {
            break;
        }

        if (++attempts >= JOIN_ATTEMPTS_BEFORE_REBOOT) {
            Serial.println("Too many failed joins, rebooting");
            settings.last_reboot_reason = REBOOT_REASON_JOIN_FAILED;
            settings.last_join_status = g_last_join_status;
            saveSettings();
            api.system.reboot();
        }
        Serial.printf("Join failed (attempt %lu), retrying in %lus\r\n",
                      (unsigned long)attempts, (unsigned long)(backoff / 1000));
        uint32_t backoff_start = millis();
        while ((millis() - backoff_start) < backoff) {
            delay(200);
        }
        backoff = backoff * 2 > JOIN_BACKOFF_MAX_MS ? JOIN_BACKOFF_MAX_MS
                                                    : backoff * 2;
    }
    Serial.println("Joined");
}

void uplink_routine(void)
{
    // Power the sensor only around the reading
    soilSensor.sensor_on();
    delay(SENSOR_STABILIZE_MS);
    applyCalibration(); // sensor settings do not survive power-off

    uint16_t capacitance = 0;
    uint8_t moisture = 0;
    uint16_t temp = 0;
    bool cap_ok = soilSensor.get_sensor_capacitance(&capacitance);
    bool moist_ok = soilSensor.get_sensor_moisture(&moisture);
    bool temp_ok = soilSensor.get_sensor_temperature(&temp);

    soilSensor.sensor_sleep();

    float battery = api.system.bat.get();

    Serial.printf("capacitance=%u ok=%d moisture=%u%% ok=%d temp=%.1fC ok=%d bat=%.2fV\r\n",
                  capacitance, cap_ok, moisture, moist_ok, temp / 10.0,
                  temp_ok, battery);

    // Send whatever we have; battery alone still tells the server we're alive
    lpp.reset();
    if (temp_ok) {
        lpp.addTemperature(CHANNEL_TEMPERATURE, temp / 10.0);
    }
    if (moist_ok) {
        lpp.addAnalogInput(CHANNEL_MOISTURE, moisture);
    }
    lpp.addAnalogInput(CHANNEL_BATTERY, battery);

    bool sensor_ok = temp_ok && moist_ok;
    bool sent = api.lorawan.send(lpp.getSize(), lpp.getBuffer(), FPORT,
                                 false, 0);
    if (!sent) {
        Serial.println("Send request rejected");
    }

    if (sensor_ok && sent) {
        consecutive_failures = 0;
    } else if (++consecutive_failures >= MAX_CONSECUTIVE_FAILURES) {
        Serial.println("Too many consecutive failures, rebooting");
        settings.last_reboot_reason = REBOOT_REASON_UPLINK_FAILED;
        settings.last_sensor_ok = sensor_ok ? 1 : 0;
        settings.last_send_status = g_last_send_status;
        saveSettings();
        api.system.reboot();
    }
}

void setup()
{
    Serial.begin(115200, RAK_AT_MODE);
    delay(2000);

    Serial.println("Advatens Soil Moisture Station");
    Serial.printf("RUI3 %s\r\n", api.system.firmwareVersion.get().c_str());
    Serial.println("------------------------------------------------------");

    loadSettings();
    reportLastReboot();

    if (api.lorawan.nwm.get() != 1) {
        Serial.printf("Set Node device work mode %s\r\n",
                      api.lorawan.nwm.set() ? "Success" : "Fail");
        settings.last_reboot_reason = REBOOT_REASON_NWM_FIX;
        saveSettings();
        api.system.reboot();
    }

    api.system.atMode.add((char *)"SOILCAL",
                          (char *)"Soil sensor calibration: ATC+SOILCAL=<dry>,<wet>",
                          (char *)"SOILCAL", soilcal_handler,
                          RAK_ATCMD_PERM_WRITE | RAK_ATCMD_PERM_READ);

    // Soil sensor
    Wire.begin();
    soilSensor.setup(Wire);
    soilSensor.begin();

    uint8_t version = 0;
    soilSensor.get_sensor_version(&version);
    Serial.printf("Sensor firmware version: %02X\r\n", version);
    applyCalibration();
    Serial.printf("Calibration dry=%u wet=%u\r\n", settings.dry_cal,
                  settings.wet_cal);
    soilSensor.sensor_sleep();

    // LoRaWAN. Credentials (DevEUI/AppEUI/AppKey) come from flash — set them
    // once via AT commands, see README. Only non-secret parameters here.
    if (!api.lorawan.band.set(OTAA_BAND)) {
        Serial.println("Failed to set band");
    }
    if (!api.lorawan.deviceClass.set(RAK_LORA_CLASS_A)) {
        Serial.println("Failed to set class A");
    }
    if (!api.lorawan.njm.set(RAK_LORA_OTAA)) {
        Serial.println("Failed to set OTAA mode");
    }
    // Explicitly unconfirmed: earlier firmware persisted cfm=1 in flash
    if (!api.lorawan.cfm.set(0)) {
        Serial.println("Failed to set unconfirmed mode");
    }
    if (!api.lorawan.adr.set(true)) {
        Serial.println("Failed to enable ADR");
    }

    api.lorawan.registerRecvCallback(recvCallback);
    api.lorawan.registerJoinCallback(joinCallback);
    api.lorawan.registerSendCallback(sendCallback);

    joinNetwork();

    // BLE service window, deferred until after joining: api.system.sleep.all()
    // wakes on BLE advertising events, which was starving the join loop's
    // sleeps (measured actual sleep time near 0ms regardless of the
    // requested duration). Silences itself after BLE_SERVICE_WINDOW_S for
    // the power budget.
    api.ble.advertise.start(BLE_SERVICE_WINDOW_S);

    uint8_t dev_addr[4] = {0};
    api.lorawan.daddr.get(dev_addr, 4);
    Serial.printf("Device address %02X%02X%02X%02X, uplink every %lus\r\n",
                  dev_addr[0], dev_addr[1], dev_addr[2], dev_addr[3],
                  (unsigned long)(UPLINK_PERIOD_MS / 1000));

    // First uplink now, then periodic wake-ups from the timer
    uplink_due = true;
    api.system.timer.create(RAK_TIMER_0, uplinkTimerHandler,
                            RAK_TIMER_PERIODIC);
    api.system.timer.start(RAK_TIMER_0, UPLINK_PERIOD_MS, NULL);
}

void loop()
{
    if (uplink_due) {
        uplink_due = false;
        uplink_routine();
    }
    api.system.sleep.all(); // sleep until the timer (or any event) wakes us
}
