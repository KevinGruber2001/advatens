#ifndef CONFIG_H
#define CONFIG_H

#include "LoRaWan_APP.h"

// OTAA keys
extern uint8_t devEui[8];
extern uint8_t appEui[8];
extern uint8_t appKey[16];

// LoRaWAN settings
extern LoRaMacRegion_t loraWanRegion;
extern DeviceClass_t loraWanClass;
extern uint32_t appTxDutyCycle;
extern bool overTheAirActivation;
extern bool loraWanAdr;
extern bool isTxConfirmed;
extern uint8_t appPort;
extern uint8_t confirmedNbTrials;

#endif
