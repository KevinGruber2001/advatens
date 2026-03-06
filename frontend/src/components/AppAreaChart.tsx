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
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
    description: "Volumetric water content",
  },
  ph: {
    label: "pH Level",
    unit: "",
    color: "var(--chart-3)",
    description: "Soil acidity / alkalinity",
  },
  battery_level: {
    label: "Battery",
    unit: "%",
    color: "var(--chart-4)",
    description: "Device battery charge",
  },
}

interface AppAreaChartProps {
  stationId: string
  metricType: MetricType
  startTime?: string
  endTime?: string
}

function AppAreaChart({ stationId, metricType, startTime, endTime }: AppAreaChartProps) {
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

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatYAxis = (value: number) => {
    return `${value.toFixed(metricType === "ph" ? 1 : 0)}${config.unit}`
  }

  const latest = data?.[data.length - 1]

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
                {latest?.value.toFixed(1)}
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
              data={data ?? []}
              margin={{ left: -4, right: 8, top: 4, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="timestamp"
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
                domain={["auto", "auto"]}
                tickCount={5}
              />
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
