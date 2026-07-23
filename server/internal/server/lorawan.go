package server

import "crypto/rand"

// AppEUI/JoinEUI is fixed at all zeros for this private network — there is
// no join-server routing hierarchy to address, so it doesn't need to be
// generated or stored per station.
const stationAppEUI = "0000000000000000"

func generateHexID(numBytes int) (string, error) {
	b := make([]byte, numBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	const hexDigits = "0123456789abcdef"
	out := make([]byte, numBytes*2)
	for i, v := range b {
		out[i*2] = hexDigits[v>>4]
		out[i*2+1] = hexDigits[v&0x0f]
	}
	return string(out), nil
}

// generateDevEUI returns a random 64-bit LoRaWAN DevEUI as lowercase hex.
func generateDevEUI() (string, error) {
	return generateHexID(8)
}

// generateAppKey returns a random 128-bit LoRaWAN AppKey as lowercase hex.
func generateAppKey() (string, error) {
	return generateHexID(16)
}
