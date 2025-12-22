import { UserButton } from "@clerk/clerk-react"
import { ModeToggle } from "./ModeToggle"

function AppNavBar() {
  return (
    <nav className="p-4 flex items-center justify-between">
      Collapsebutton
      <div className="flex items-center gap-4">
        <ModeToggle />
        <UserButton />
      </div>
    </nav>
  )
}

export default AppNavBar
