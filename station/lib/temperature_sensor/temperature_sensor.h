#ifndef TEMPERATURE_SENSOR_H
#define TEMPERATURE_SENSOR_H

class TemperatureSensor
{
public:
    TemperatureSensor();
    void begin();
    float readTemperature();
};

#endif