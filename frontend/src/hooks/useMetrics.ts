import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "./useApiClient"
import type z from "zod"
import type { schemas } from "generated.api"

type MetricType = z.infer<typeof schemas.Metric>["metric_type"]

export const useMetrics = (
  stationId: string,
  metricType: MetricType
) => {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["metric", "list", stationId, metricType],
    queryFn: () =>
      apiClient.getMetrics({
        queries: {
          station_id: stationId,
          metric_type: metricType,
        },
      }),
  })
}
