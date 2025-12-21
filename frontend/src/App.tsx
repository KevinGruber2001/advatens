import "./App.css"
import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react"
import Layout from "./Layout"

function App() {
  return (
    <>
      <SignedOut>
        <SignIn />
      </SignedOut>
      <SignedIn>
        <Layout />
      </SignedIn>
    </>
  )
}

export default App
