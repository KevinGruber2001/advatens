import { Link, useLocation } from "react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "./ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible"
import { ChevronRight, Leaf, Plus, Radio, TreePine } from "lucide-react"
import { useOrchards } from "@/hooks/useOrchards"
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet"
import CreateStation from "./CreateStation"
import CreateOrchard from "./CreateOrchard"

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
                  <span className="truncate font-semibold">Advatens</span>
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
          <Sheet>
            <SidebarGroupAction asChild>
              <SheetTrigger>
                <Plus className="size-4" />
                <span className="sr-only">Add Orchard</span>
              </SheetTrigger>
            </SidebarGroupAction>
            <SheetContent>
              <CreateOrchard />
            </SheetContent>
          </Sheet>
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
              return (
              <Collapsible key={orchard.id} defaultOpen asChild className="group/collapsible">
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={orchard.name} className="pointer-events-none hover:bg-transparent">
                    <TreePine className="size-4" />
                    <span>{orchard.name}</span>
                  </SidebarMenuButton>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRight className="size-4" />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <Sheet>
                    <SidebarMenuAction asChild className="right-6">
                      <SheetTrigger>
                        <Plus className="size-4" />
                        <span className="sr-only">Add Station</span>
                      </SheetTrigger>
                    </SidebarMenuAction>
                    <SheetContent>
                      <CreateStation orchardId={orchard.id} />
                    </SheetContent>
                  </Sheet>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {orchard.stations?.map((station) => {
                        const isActive =
                          location.pathname === `/station/${station.id}`
                        return (
                          <SidebarMenuSubItem key={station.id}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <Link to={`/station/${station.id}`}>
                                <Radio className="size-3.5" />
                                <span>{station.name}</span>
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
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default AppSideBar
