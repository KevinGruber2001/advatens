import { Outlet } from "react-router"
//import AppDrawer from "./components/AppDrawer"
import AppSideBar from "./components/AppSideBar"
import AppNavBar from "./components/AppNavBar"

function Layout() {
  return (
    <div className="flex h-screen w-full">
      <AppSideBar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <AppNavBar />
        <div className="px-4 flex-1 overflow-auto;">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
