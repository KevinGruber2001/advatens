import { Link, useLocation } from "react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "./ui/sidebar"
import { Leaf, Plus, Radio, TreePine } from "lucide-react"
import { useOrchards } from "@/hooks/useOrchards"
import { useLatestBatteryPercent } from "@/hooks/useLatestBattery"
import { getBatteryIcon, getBatteryTextColor } from "@/lib/battery"
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet"
import { Button } from "./ui/button"
import CreateStation from "./CreateStation"
import CreateOrchard from "./CreateOrchard"

function StationBatteryIndicator({ stationId }: { stationId: string }) {
  const { percent, isPending, isError } = useLatestBatteryPercent(stationId)
  if (isPending || isError || percent === undefined) return null

  const Icon = getBatteryIcon(percent)
  return (
    <Icon
      className={`size-3.5 shrink-0 ml-auto ${getBatteryTextColor(percent)}`}
      aria-label={`Battery ${percent.toFixed(0)}%`}
    />
  )
}

function AppSideBar() {
  const { data, isLoading, isError } = useOrchards()
  const location = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Leaf className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">AgriNode</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Orchard Monitoring
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Orchards</SidebarGroupLabel>
          <SidebarMenu>
            {isLoading && (
              <>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </>
            )}
            {isError && (
              <div className="px-2 py-1.5 text-xs text-destructive">
                Failed to load
              </div>
            )}

            {data?.map((orchard) => {
              const isOrchardActive = location.pathname === `/orchard/${orchard.id}`
              return (
                <SidebarMenuItem key={orchard.id}>
                  <SidebarMenuButton asChild tooltip={orchard.name} isActive={isOrchardActive}>
                    <Link to={`/orchard/${orchard.id}`}>
                      <TreePine className="size-4" />
                      <span>{orchard.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    {orchard.stations?.map((station) => {
                      const isActive =
                        location.pathname === `/station/${station.id}`
                      return (
                        <SidebarMenuSubItem key={station.id}>
                          <SidebarMenuSubButton asChild isActive={isActive}>
                            <Link to={`/station/${station.id}`}>
                              <Radio className="size-3.5 shrink-0" />
                              <span className="truncate">{station.name}</span>
                              <StationBatteryIndicator stationId={station.id} />
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                    {(!orchard.stations || orchard.stations.length === 0) && (
                      <li className="px-2 py-1 text-xs text-muted-foreground">
                        No stations yet
                      </li>
                    )}
                  </SidebarMenuSub>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Plus className="size-4" />
              Create Orchard
            </Button>
          </SheetTrigger>
          <SheetContent>
            <CreateOrchard />
          </SheetContent>
        </Sheet>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Plus className="size-4" />
              Create Station
            </Button>
          </SheetTrigger>
          <SheetContent>
            <CreateStation />
          </SheetContent>
        </Sheet>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSideBar
