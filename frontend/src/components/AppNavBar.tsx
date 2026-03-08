import { UserButton } from "@clerk/clerk-react"
import { MockUserButton } from "../mocks/MockClerkProvider"
import { ModeToggle } from "./ModeToggle"
import { SidebarTrigger } from "./ui/sidebar"
import { Separator } from "./ui/separator"

const IS_MOCK = import.meta.env.VITE_MOCK === "true"

function AppNavBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <ModeToggle />
        {IS_MOCK ? <MockUserButton /> : <UserButton />}
      </div>
    </header>
  )
}

export default AppNavBar
