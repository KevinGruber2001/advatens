import "./App.css"
import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react"
import { MockSignedIn, MockSignedOut } from "./mocks/MockClerkProvider"
import Layout from "./Layout"

const IS_MOCK = import.meta.env.VITE_MOCK === "true"

function App() {
  if (IS_MOCK) {
    return (
      <MockSignedIn>
        <Layout />
      </MockSignedIn>
    )
  }

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
