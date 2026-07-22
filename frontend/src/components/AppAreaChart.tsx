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
  { label: string; unit: string; color: string; description: string }
> = {
  temperature: {
    label: "Temperature",
    unit: "°C",
    color: "var(--chart-1)",
    description: "Ambient temperature readings",
  },
  soil_moisture: {
    label: "Soil Moisture",
    unit: "%",
    color: "var(--chart-2)",
    description: "Relative to this sensor's dry/wet calibration",
  },
  battery_level: {
    label: "Battery",
    unit: "%",
    color: "var(--chart-4)",
    description: "Device battery charge",
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
  const chartData = (data ?? []).map((d) => ({
    ...d,
    time: new Date(d.timestamp).getTime(),
    value: valueTransform ? valueTransform(d.value) : d.value,
  }))
  const domain: [number, number] | ["auto", "auto"] =
    startTime && endTime
      ? [new Date(startTime).getTime(), new Date(endTime).getTime()]
      : ["auto", "auto"]
  const isSoilMoistureZoned = metricType === "soil_moisture" && typeof domain[0] === "number"

  const formatTime = (time: number) => {
    return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
      <CardContent className="px-2 pt-0 pb-4">
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
                minTickGap={40}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={formatYAxis}
                width={48}
                domain={metricType === "soil_moisture" ? [0, 100] : ["auto", "auto"]}
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
