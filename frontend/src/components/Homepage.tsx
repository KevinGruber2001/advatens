import AppAreaChart from "./AppAreaChart"

function HomePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
      <div className="bg-primary-foreground  rounded-lg lg:col-span-2 xl:col-span-1 2xl:col-span-2">
        <AppAreaChart />
      </div>
      <div className="bg-primary-foreground rounded-lg"></div>
      <div className="bg-primary-foreground rounded-lg"></div>
      <div className="bg-primary-foreground rounded-lg"></div>
      <div className="bg-primary-foreground rounded-lg lg:col-span-2 xl:col-span-1 2xl:col-span-"></div>
      <div className="bg-primary-foreground rounded-lg"></div>
    </div>
  )
}

export default HomePage
