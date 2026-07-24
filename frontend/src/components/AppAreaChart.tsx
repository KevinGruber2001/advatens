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
import { Area, AreaChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from "recharts"
import { useMetrics } from "@/hooks/useMetrics"
import type z from "zod"
import type { schemas } from "generated.api"

type MetricType = z.infer<typeof schemas.Metric>["metric_type"]

const metricConfig: Record<
  string,
  { label: string; unit: string; color: string; description: string; fallbackDomain: [number, number] }
> = {
  temperature: {
    label: "Temperature",
    unit: "°C",
    color: "var(--chart-1)",
    description: "Ambient temperature readings",
    fallbackDomain: [0, 40],
  },
  soil_moisture: {
    label: "Soil Moisture",
    unit: "%",
    color: "var(--chart-2)",
    description: "Relative to this sensor's dry/wet calibration",
    fallbackDomain: [0, 100],
  },
  battery_level: {
    label: "Battery",
    unit: "%",
    color: "var(--chart-4)",
    description: "Device battery charge",
    fallbackDomain: [0, 100],
  },
}

// Soil moisture is calibrated per-sensor (ATC+SOILCAL) so 0% always means
// "as dry as this sensor's dry point" and 100% "as wet as its wet point" —
// that makes generic zone thresholds meaningful across different physical
// sensors, unlike raw uncalibrated volumetric water content.
const SOIL_MOISTURE_DRY_THRESHOLD = 25
const SOIL_MOISTURE_WET_THRESHOLD = 70

interface AppAreaChartProps {
  stationId: string
  metricType: MetricType
  startTime?: string
  endTime?: string
  // Applied to every plotted value and the header's current-value display.
  // Used e.g. to convert battery_level's raw stored voltage into a percent.
  valueTransform?: (raw: number) => number
}

function AppAreaChart({ stationId, metricType, startTime, endTime, valueTransform }: AppAreaChartProps) {
  const { data, isPending, isError } = useMetrics(stationId, metricType, startTime, endTime)
  const config = metricConfig[metricType] ?? {
    label: metricType,
    unit: "",
    color: "var(--chart-1)",
    description: "",
    fallbackDomain: [0, 100] as [number, number],
  }

  const chartConfig = {
    value: {
      label: config.label,
      color: config.color,
    },
  } satisfies ChartConfig

  // Recharts auto-scales the X axis to whatever data points exist unless
  // given an explicit numeric domain — without this, a sparse-data station
  // renders "7d" and "48h" identically, since both just fit to the same
  // handful of points instead of showing the actual selected time window.
  const hasData = (data ?? []).length > 0
  const domain: [number, number] | ["auto", "auto"] =
    startTime && endTime
      ? [new Date(startTime).getTime(), new Date(endTime).getTime()]
      : ["auto", "auto"]
  // With zero real readings, feed the chart two invisible boundary points
  // (start/end of the requested range, no value) rather than an empty array
  // — Recharts needs *some* data to lay out axes at all, and this keeps the
  // X axis spanning the full requested window instead of collapsing.
  const HOUR_MS = 60 * 60 * 1000
  const chartData = hasData
    ? (() => {
        const points = (data ?? []).map((d) => ({
          ...d,
          time: new Date(d.timestamp).getTime(),
          value: valueTransform ? valueTransform(d.value) : d.value,
        }))
        // Server metrics are hour-bucketed, so the latest bucket timestamp is
        // aligned to hh:00 even when it includes readings up to "now". Extend
        // the final point to range-end so the chart visually covers the whole
        // selected window while keeping hour-aligned ticks.
        if (typeof domain[1] === "number" && points.length > 0) {
          const lastPoint = points[points.length - 1]
          const tailMs = domain[1] - lastPoint.time
          if (tailMs > 0 && tailMs < HOUR_MS) {
            points.push({
              ...lastPoint,
              time: domain[1],
              timestamp: new Date(domain[1]).toISOString(),
            })
          }
        }
        return points
      })()
    : typeof domain[0] === "number"
      ? [{ time: domain[0] }, { time: domain[1] }]
      : []
  const yDomain: [number, number] | ["auto", "auto"] =
    metricType === "soil_moisture" ? [0, 100] : hasData ? ["auto", "auto"] : config.fallbackDomain
  const isSoilMoistureZoned = metricType === "soil_moisture" && typeof domain[0] === "number"

  const DAY_MS = 24 * HOUR_MS
  // Explicit, human-aligned ticks rather than Recharts' default "nice"
  // algorithm: hourly for 6h, every 4h for 24h, every 8h for 48h, daily for
  // 7d — all aligned to real clock/day boundaries (e.g. 4:00, not 4:15) by
  // walking forward from local midnight of the range's start day.
  let tickStepMs = HOUR_MS
  let isDailyTicks = false
  const [rawStart, rawEnd] = domain
  const rangeMs = typeof rawStart === "number" && typeof rawEnd === "number" ? rawEnd - rawStart : undefined
  if (rangeMs !== undefined) {
    if (rangeMs <= 6 * HOUR_MS + HOUR_MS) tickStepMs = HOUR_MS
    else if (rangeMs <= 24 * HOUR_MS + HOUR_MS) tickStepMs = 4 * HOUR_MS
    else if (rangeMs <= 48 * HOUR_MS + HOUR_MS) tickStepMs = 8 * HOUR_MS
    else {
      tickStepMs = DAY_MS
      isDailyTicks = true
    }
  }

  const ticks: number[] | undefined =
    typeof rawStart === "number" && typeof rawEnd === "number"
      ? (() => {
          const dayStart = new Date(rawStart)
          dayStart.setHours(0, 0, 0, 0)
          const result: number[] = []
          for (let t = dayStart.getTime(); t <= rawEnd; t += tickStepMs) {
            if (t >= rawStart) result.push(t)
          }
          return result
        })()
      : undefined

  const formatTime = (time: number) => {
    const d = new Date(time)
    if (isDailyTicks) {
      return d.toLocaleDateString([], { weekday: "short" })
    }
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatYAxis = (value: number) => {
    return `${value.toFixed(0)}${config.unit}`
  }

  const latestRaw = data?.[data.length - 1]?.value
  const latestValue = latestRaw === undefined ? undefined : valueTransform ? valueTransform(latestRaw) : latestRaw

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{config.description}</CardDescription>
        <CardTitle className="flex items-baseline gap-1.5">
          {isPending ? (
            <span className="text-muted-foreground text-sm font-normal">Loading...</span>
          ) : isError ? (
            <span className="text-destructive text-sm font-normal">Failed to load</span>
          ) : (
            <>
              <span className="text-2xl tabular-nums">
                {latestValue?.toFixed(1)}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {config.unit}
              </span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative px-2 pt-0 pb-4">
        {!isPending && !isError && !hasData && (
          <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
            No data in this range
          </span>
        )}
        {!isPending && !isError && (
          <ChartContainer config={chartConfig} className="h-[160px] w-full">
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: -4, right: 8, top: 4, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={domain}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatTime}
                ticks={ticks}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={formatYAxis}
                width={48}
                domain={yDomain}
                tickCount={5}
              />
              {isSoilMoistureZoned && (
                <ReferenceArea
                  x1={domain[0]}
                  x2={domain[1]}
                  y1={0}
                  y2={SOIL_MOISTURE_DRY_THRESHOLD}
                  fill="var(--destructive)"
                  fillOpacity={0.08}
                  stroke="none"
                  ifOverflow="visible"
                />
              )}
              {isSoilMoistureZoned && (
                <ReferenceArea
                  x1={domain[0]}
                  x2={domain[1]}
                  y1={SOIL_MOISTURE_WET_THRESHOLD}
                  y2={100}
                  fill="#3b82f6"
                  fillOpacity={0.08}
                  stroke="none"
                  ifOverflow="visible"
                />
              )}
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
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
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}${config.unit}`,
                      config.label,
                    ]}
                  />
                }
              />
              <defs>
                <linearGradient id={`fill-${metricType}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                dataKey="value"
                type="monotone"
                fill={`url(#fill-${metricType})`}
                stroke={config.color}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default AppAreaChart
