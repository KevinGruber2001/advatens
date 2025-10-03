#include "lora_app.h"
#include <CayenneLPP.h>

#include "temperature_sensor.h"

extern uint8_t appData[];
extern uint8_t appDataSize;

CayenneLPP lpp(51);

TemperatureSensor tempSensor;

void prepareTxFrame(uint8_t port)
{
    lpp.reset();

    lpp.addTemperature(1, tempSensor.readTemperature());

    appDataSize = lpp.getSize();
    memcpy(appData, lpp.getBuffer(), appDataSize);
}