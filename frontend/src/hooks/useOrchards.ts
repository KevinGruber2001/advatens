import { useQuery } from "@tanstack/react-query"
import { useApiClient } from "./useApiClient"

export const useOrchards = () => {
  const apiClient = useApiClient()

  return useQuery({
    queryKey: ["orchard", "list"],
    queryFn: apiClient.getOrchards,
  })
}
