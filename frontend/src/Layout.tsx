import { Outlet } from "react-router"
import AppSideBar from "./components/AppSideBar"
import AppNavBar from "./components/AppNavBar"
import { SidebarInset } from "./components/ui/sidebar"

function Layout() {
  return (
    <>
      <AppSideBar />
      <SidebarInset>
        <AppNavBar />
        <div className="flex-1 overflow-auto p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  )
}

export default Layout
