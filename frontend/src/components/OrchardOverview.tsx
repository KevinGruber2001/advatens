import { useParams } from "react-router"
import { useOrchards } from "@/hooks/useOrchards"
import { useMetrics } from "@/hooks/useMetrics"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { TreePine } from "lucide-react"

const STATION_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const metricInfo: Record<string, { label: string; unit: string; description: string }> = {
  temperature: { label: "Temperature", unit: "°C", description: "Ambient temperature across stations" },
  soil_moisture: { label: "Soil Moisture", unit: "%", description: "Volumetric water content across stations" },
  ph: { label: "pH Level", unit: "", description: "Soil acidity / alkalinity across stations" },
}

type Station = { id: string; name: string; device_id: string }

function ComparisonChart({
  stations,
  metricType,
}: {
  stations: Station[]
  metricType: "temperature" | "soil_moisture" | "ph"
}) {
  const info = metricInfo[metricType]

  // Fetch metrics for each station
  const queries = stations.map((s) => ({
    station: s,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    result: useMetrics(s.id, metricType),
  }))

  const anyLoading = queries.some((q) => q.result.isPending)
  const allError = queries.every((q) => q.result.isError)

  // Merge data into a single time-indexed array
  // Use the first station's timestamps as the baseline
  const baseData = queries[0]?.result.data
  const merged = baseData?.map((point, i) => {
    const row: Record<string, unknown> = { timestamp: point.timestamp }
    queries.forEach((q, idx) => {
      row[`station_${idx}`] = q.result.data?.[i]?.value ?? null
    })
    return row
  }) ?? []

  const chartConfig: ChartConfig = {}
  stations.forEach((s, idx) => {
    chartConfig[`station_${idx}`] = {
      label: s.name,
      color: STATION_COLORS[idx % STATION_COLORS.length],
    }
  })

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{info.label}</CardTitle>
        <CardDescription>{info.description}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        {anyLoading ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : allError ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-destructive">
            Failed to load
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <LineChart data={merged} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatTime}
                minTickGap={50}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_label, payload) => {
                      const ts = payload?.[0]?.payload?.timestamp
                      if (!ts) return ""
                      return new Date(ts).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }}
                    formatter={(value, name) => {
                      const idx = Number(String(name).replace("station_", ""))
                      const stationName = stations[idx]?.name ?? name
                      return [`${Number(value).toFixed(1)}${info.unit}`, stationName]
                    }}
                  />
                }
              />
              {stations.map((_, idx) => (
                <Line
                  key={idx}
                  dataKey={`station_${idx}`}
                  type="monotone"
                  stroke={STATION_COLORS[idx % STATION_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
        <div className="flex flex-wrap gap-4 px-4 pt-2">
          {stations.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs">
              <div
                className="size-2.5 rounded-full"
                style={{ backgroundColor: STATION_COLORS[idx % STATION_COLORS.length] }}
              />
              <span className="text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function OrchardOverview() {
  const { orchardId } = useParams<{ orchardId: string }>()
  const { data: orchards, isLoading } = useOrchards()

  const orchard = orchards?.find((o) => o.id === orchardId)

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading...</div>
  }

  if (!orchard) {
    return <div className="p-6 text-muted-foreground">Orchard not found</div>
  }

  const stations = orchard.stations ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <TreePine className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{orchard.name}</h1>
          <p className="text-sm text-muted-foreground">
            {stations.length} station{stations.length !== 1 ? "s" : ""} — last 48 hours
          </p>
        </div>
      </div>

      {stations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No stations in this orchard yet. Add one using the + button in the
            sidebar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <ComparisonChart stations={stations} metricType="temperature" />
          <ComparisonChart stations={stations} metricType="soil_moisture" />
          <ComparisonChart stations={stations} metricType="ph" />
        </div>
      )}
    </div>
  )
}

export default OrchardOverview
