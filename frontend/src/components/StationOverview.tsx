import { useState, useMemo } from "react"
import { useParams } from "react-router"
import AppAreaChart from "./AppAreaChart"
import BatteryCard from "./BatteryCard"
import { useOrchards } from "@/hooks/useOrchards"
import { Radio, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./ui/button"

type RangeKey = "6h" | "24h" | "48h" | "7d"

const RANGES: { key: RangeKey; label: string; hours: number }[] = [
  { key: "6h", label: "6h", hours: 6 },
  { key: "24h", label: "24h", hours: 24 },
  { key: "48h", label: "48h", hours: 48 },
  { key: "7d", label: "7d", hours: 168 },
]

function StationOverview() {
  const { stationId } = useParams<{ stationId: string }>()
  const { data: orchards } = useOrchards()

  const [rangeKey, setRangeKey] = useState<RangeKey>("48h")
  const [offset, setOffset] = useState(0) // offset in hours from "now" (0 = latest)

  const rangeHours = RANGES.find((r) => r.key === rangeKey)!.hours

  const { startTime, endTime } = useMemo(() => {
    const now = Date.now()
    const end = new Date(now - offset * 60 * 60 * 1000)
    const start = new Date(end.getTime() - rangeHours * 60 * 60 * 1000)
    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    }
  }, [rangeHours, offset])

  const handleRangeChange = (key: RangeKey) => {
    setRangeKey(key)
    setOffset(0) // reset to latest when changing range
  }

  const handleBack = () => setOffset((prev) => prev + rangeHours)
  const handleForward = () => setOffset((prev) => Math.max(0, prev - rangeHours))

  const formatRangeLabel = () => {
    const end = new Date(Date.now() - offset * 60 * 60 * 1000)
    const start = new Date(end.getTime() - rangeHours * 60 * 60 * 1000)

    const fmt = (d: Date) =>
      d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    return `${fmt(start)} — ${fmt(end)}`
  }

  if (!stationId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Select a station to view metrics
      </div>
    )
  }

  const station = orchards
    ?.flatMap((o) => o.stations ?? [])
    .find((s) => s.id === stationId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Radio className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">
            {station?.name ?? "Station"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sensor metrics
          </p>
        </div>
      </div>

      {/* Time range controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border bg-card">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => handleRangeChange(r.key)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                rangeKey === r.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              } ${r.key === "6h" ? "rounded-l-lg" : ""} ${r.key === "7d" ? "rounded-r-lg" : ""}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" onClick={handleBack}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={handleForward}
            disabled={offset === 0}
          >
            <ChevronRight className="size-4" />
          </Button>
          {offset > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setOffset(0)}>
              Latest
            </Button>
          )}
        </div>

        <span className="text-xs text-muted-foreground">{formatRangeLabel()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AppAreaChart stationId={stationId} metricType="temperature" startTime={startTime} endTime={endTime} />
        <AppAreaChart stationId={stationId} metricType="soil_moisture" startTime={startTime} endTime={endTime} />
        <AppAreaChart stationId={stationId} metricType="ph" startTime={startTime} endTime={endTime} />
        <BatteryCard stationId={stationId} />
      </div>
    </div>
  )
}

export default StationOverview
