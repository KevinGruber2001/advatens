import { useParams } from "react-router"
import AppAreaChart from "./AppAreaChart"

function StationOverview() {
  const {stationId} = useParams<{stationId: string}>()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
       <div className="bg-primary-foreground rounded-lg lg:col-span-2 xl:col-span-1 2xl:col-span-2">
        {stationId ? (
          <AppAreaChart stationId={stationId} metricType="soil_moisture" />
        ) : (
          <div className="p-6 text-center">
            Select a station to view metrics
          </div>
        )}
      </div>
      <div className="bg-primary-foreground rounded-lg"></div>
      <div className="bg-primary-foreground rounded-lg"></div>
      <div className="bg-primary-foreground rounded-lg"></div>
      <div className="bg-primary-foreground rounded-lg lg:col-span-2 xl:col-span-1 2xl:col-span-2"></div>
      <div className="bg-primary-foreground rounded-lg"></div>
    </div>
  )
}

export default StationOverview
