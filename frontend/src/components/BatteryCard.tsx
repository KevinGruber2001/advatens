import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { useMetrics } from "@/hooks/useMetrics"
import { BatteryFull, BatteryLow, BatteryMedium, BatteryWarning } from "lucide-react"

interface BatteryCardProps {
  stationId: string
}

function BatteryCard({ stationId }: BatteryCardProps) {
  const { data, isPending, isError } = useMetrics(stationId, "battery_level")

  const latest = data?.[data.length - 1]
  const level = latest?.value ?? 0

  const getBatteryIcon = (pct: number) => {
    if (pct > 60) return <BatteryFull className="size-8" />
    if (pct > 30) return <BatteryMedium className="size-8" />
    if (pct > 15) return <BatteryLow className="size-8" />
    return <BatteryWarning className="size-8" />
  }

  const getBatteryColor = (pct: number) => {
    if (pct > 60) return "text-emerald-500"
    if (pct > 30) return "text-amber-500"
    return "text-red-500"
  }

  const getBarColor = (pct: number) => {
    if (pct > 60) return "bg-emerald-500"
    if (pct > 30) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>Device battery charge</CardDescription>
        <CardTitle>
          {isPending ? (
            <span className="text-muted-foreground text-sm font-normal">Loading...</span>
          ) : isError ? (
            <span className="text-destructive text-sm font-normal">Failed to load</span>
          ) : (
            <div className="flex items-center gap-3">
              <span className={getBatteryColor(level)}>
                {getBatteryIcon(level)}
              </span>
              <span className="text-3xl tabular-nums font-bold">
                {level.toFixed(0)}%
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isPending && !isError && (
          <div className="space-y-3">
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(level)}`}
                style={{ width: `${Math.min(level, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {level > 60
                ? "Battery level is healthy"
                : level > 30
                  ? "Battery level is moderate"
                  : "Battery level is low — consider replacing"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BatteryCard
