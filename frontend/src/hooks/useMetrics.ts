import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "./useApiClient"
import type z from "zod"
import type { schemas } from "generated.api"

type MetricType = z.infer<typeof schemas.Metric>["metric_type"]

export const useMetrics = (
  stationId: string,
  metricType: MetricType,
  startTime?: string,
  endTime?: string
) => {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["metric", "list", stationId, metricType, startTime, endTime],
    queryFn: () =>
      apiClient.getMetrics({
        queries: {
          station_id: stationId,
          metric_type: metricType,
          start_time: startTime,
          end_time: endTime,
        },
      }),
  })
}
