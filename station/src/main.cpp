#include <Arduino.h>
#include "LoRaWan_APP.h"
#include "lora_app.h"
#include "config.h"

void setup()
{
  Serial.begin(115200);
  Mcu.begin(HELTEC_BOARD, SLOW_CLK_TPYE);
}

void loop()
{
  switch (deviceState)
  {
  case DEVICE_STATE_INIT:
#if (LORAWAN_DEVEUI_AUTO)
    LoRaWAN.generateDeveuiByChipID();
#endif
    LoRaWAN.init(loraWanClass, loraWanRegion);
    LoRaWAN.setDefaultDR(3);
    break;

  case DEVICE_STATE_JOIN:
    LoRaWAN.join();
    break;

  case DEVICE_STATE_SEND:
    prepareTxFrame(appPort);
    LoRaWAN.send();
    deviceState = DEVICE_STATE_CYCLE;
    break;

  case DEVICE_STATE_CYCLE:
    txDutyCycleTime = appTxDutyCycle + randr(-APP_TX_DUTYCYCLE_RND, APP_TX_DUTYCYCLE_RND);
    LoRaWAN.cycle(txDutyCycleTime);
    deviceState = DEVICE_STATE_SLEEP;
    break;

  case DEVICE_STATE_SLEEP:
    LoRaWAN.sleep(loraWanClass);
    break;

  default:
    deviceState = DEVICE_STATE_INIT;
    break;
  }
}