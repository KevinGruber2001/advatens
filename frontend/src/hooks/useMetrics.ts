import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "./useApiClient"

export const useMetrics = (
  stationId: string,
  metricType: "temperature" | "soil_moisture" | "ph" | "battery_level"
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
