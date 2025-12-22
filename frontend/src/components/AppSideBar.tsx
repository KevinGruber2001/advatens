import { Link, useLocation } from "react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar"
import { Separator } from "./ui/separator"
import { GlassWater, Plus } from "lucide-react"
import { useOrchards } from "@/hooks/useOrchards"
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet"
import CreateStation from "./CreateStation"
import CreateOrchard from "./CreateOrchard"

function AppSideBar() {
  const { data, isLoading, isError } = useOrchards()
  const location = useLocation()

  if (isLoading) return <></>

  if (isError) return <></>

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Link to={"/"} className="flex">
                <GlassWater />
                <span>Advatens</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {data?.map((orchard) => (
          <SidebarGroup key={orchard.id}>
            <SidebarGroupLabel>{orchard.name}</SidebarGroupLabel>
            <SidebarGroupAction>
              <Sheet>
                <SheetTrigger asChild>
                  <Plus />
                </SheetTrigger>
                <SheetContent>
                  <CreateStation orchardId={orchard.id} />
                </SheetContent>
              </Sheet>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {orchard.stations?.map((station) => {
                  const isActive = location.pathname === `/station/${station.id}`

                  return (
                  <SidebarMenuItem key={station.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={`station/${station.id}`}>
                        {station.name}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <Separator />

        <SidebarGroup>
          <SidebarMenu>
            <Sheet>
              <SheetTrigger asChild>
                <SidebarMenuItem className="flex">
                  <Plus /> Add Orchard
                </SidebarMenuItem>
              </SheetTrigger>
              <SheetContent>
                <CreateOrchard />
              </SheetContent>
            </Sheet>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
    </Sidebar>
  )
}

export default AppSideBar
