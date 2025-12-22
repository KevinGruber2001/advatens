import { useOrchards } from "@/hooks/useOrchards"

function HomePage() {
  const { data: orchards, isLoading } = useOrchards()

  if (isLoading) {
    return <div className="p-6">Loading orchards...</div>
  }

  const totalStations = orchards?.reduce(
    (acc, orchard) => acc + (orchard.stations?.length || 0),
    0
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
      <div className="bg-primary-foreground rounded-lg p-6 lg:col-span-2 xl:col-span-1 2xl:col-span-2">
        <h2 className="text-2xl font-bold mb-4">Welcome to Advatens</h2>
        <p className="text-muted-foreground mb-4">
          Select a station from the sidebar to view metrics
        </p>
        <div className="space-y-2">
          <p className="text-sm">
            <span className="font-semibold">{orchards?.length || 0}</span> Orchards
          </p>
          <p className="text-sm">
            <span className="font-semibold">{totalStations || 0}</span> Stations
          </p>
        </div>
      </div>
      <div className="bg-primary-foreground rounded-lg"></div>
      <div className="bg-primary-foreground rounded-lg"></div>
      <div className="bg-primary-foreground rounded-lg"></div>
      <div className="bg-primary-foreground rounded-lg lg:col-span-2 xl:col-span-1 2xl:col-span-2"></div>
      <div className="bg-primary-foreground rounded-lg"></div>
    </div>
  )
}

export default HomePage
