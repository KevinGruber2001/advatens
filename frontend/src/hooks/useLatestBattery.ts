import { useMetrics } from "./useMetrics"
import { batteryVoltageToPercent } from "@/lib/battery"

// Thin wrapper for spots that only need the most recent battery reading
// (e.g. a sidebar indicator) rather than the full history AppAreaChart uses.
export function useLatestBatteryPercent(stationId: string) {
  const { data, isPending, isError } = useMetrics(stationId, "battery_level")
  const latest = data?.[data.length - 1]

  return {
    percent: latest ? batteryVoltageToPercent(latest.value) : undefined,
    isPending,
    isError,
  }
}
