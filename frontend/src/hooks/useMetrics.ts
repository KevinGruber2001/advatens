import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "./useApiClient"

export const useMetrics = () => {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["metric", "list"],
    queryFn: () =>
      apiClient.getMetrics({
        queries: {
          station_id: "e5bb9875-7704-42f3-8033-3409132d9d90",
          metric_type: "temperature",
        },
      }),
  })
}
