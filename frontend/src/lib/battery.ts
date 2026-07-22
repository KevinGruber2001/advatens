import { BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, type LucideIcon } from "lucide-react"

// Approximate single-cell LiPo discharge curve. Voltage sits in a flat
// "plateau" for most of the usable charge, so this isn't linear — a plain
// (voltage - min) / (max - min) scaling would be badly wrong in the middle
// of the range. Sorted high to low; interpolated linearly between points.
const LIPO_CURVE: [voltage: number, percent: number][] = [
  [4.2, 100],
  [3.95, 75],
  [3.85, 55],
  [3.8, 40],
  [3.75, 25],
  [3.7, 12],
  [3.6, 5],
  [3.3, 0],
]

export function batteryVoltageToPercent(voltage: number): number {
  if (voltage >= LIPO_CURVE[0][0]) return 100
  if (voltage <= LIPO_CURVE[LIPO_CURVE.length - 1][0]) return 0

  for (let i = 0; i < LIPO_CURVE.length - 1; i++) {
    const [vHigh, pHigh] = LIPO_CURVE[i]
    const [vLow, pLow] = LIPO_CURVE[i + 1]
    if (voltage <= vHigh && voltage >= vLow) {
      const ratio = (voltage - vLow) / (vHigh - vLow)
      return pLow + ratio * (pHigh - pLow)
    }
  }
  return 0
}

// Shared so the battery chart header and the sidebar indicator agree on
// what counts as full/moderate/low, instead of duplicating thresholds.
export function getBatteryIcon(pct: number): LucideIcon {
  if (pct > 60) return BatteryFull
  if (pct > 30) return BatteryMedium
  if (pct > 15) return BatteryLow
  return BatteryWarning
}

export function getBatteryTextColor(pct: number): string {
  if (pct > 60) return "text-emerald-500"
  if (pct > 30) return "text-amber-500"
  return "text-red-500"
}
