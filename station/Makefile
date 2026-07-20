FQBN  = rak_rui:nrf52:WisCoreRAK4631Board
PORT ?= /dev/cu.usbmodem*

# make firmware BENCH=1 -> 30 s uplink interval for bench testing
ifdef BENCH
BUILD_PROPS = --build-property compiler.cpp.extra_flags=-DUPLINK_PERIOD_MS=30000
endif

.PHONY: firmware flash monitor setup

# Build the RUI3 firmware (arduino-cli; RUI3 is not supported by PlatformIO)
firmware:
	arduino-cli compile --fqbn $(FQBN) $(BUILD_PROPS) .

flash:
	arduino-cli upload --fqbn $(FQBN) -p $(PORT) .

monitor:
	arduino-cli monitor -p $(PORT) --config baudrate=115200

# One-time toolchain setup for the RUI3 build (safe to re-run)
setup:
	arduino-cli config init 2>/dev/null || true
	arduino-cli config add board_manager.additional_urls \
		https://raw.githubusercontent.com/RAKWireless/RAKwireless-Arduino-BSP-Index/main/package_rakwireless.com_rui_index.json
	arduino-cli core update-index
	arduino-cli core install rak_rui:nrf52
	arduino-cli lib install RAK12035_SoilMoisture CayenneLPP
