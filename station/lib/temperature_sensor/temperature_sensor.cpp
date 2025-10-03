#include "temperature_sensor.h"
#include <Arduino.h>

TemperatureSensor::TemperatureSensor()
{
    // Constructor code (if needed)
}

void TemperatureSensor::begin()
{
    // Initialize sensor hardware, e.g., start I2C, configure pins
}

float TemperatureSensor::readTemperature()
{
    // For example, return a dummy random temperature between 20.0 and 30.0
    return random(200, 300) / 10.0;
}
