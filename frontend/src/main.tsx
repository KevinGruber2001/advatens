import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { BrowserRouter, Route, Routes } from "react-router"
import { ThemeProvider } from "./components/ThemeProvider.tsx"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SidebarProvider } from "./components/ui/sidebar.tsx"
import HomePage from "./components/Homepage.tsx"
import StationOverview from "./components/StationOverview.tsx"

const IS_MOCK = import.meta.env.VITE_MOCK === "true"

async function getClerkProvider() {
  if (IS_MOCK) {
    const { MockClerkProvider } = await import("./mocks/MockClerkProvider.tsx")
    return { Provider: MockClerkProvider, publishableKey: undefined }
  }
  const { ClerkProvider } = await import("@clerk/react-router")
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  if (!key) throw new Error("Add your CLERK publish key")
  return { Provider: ClerkProvider, publishableKey: key }
}

async function boot() {
  if (IS_MOCK) {
    const { worker } = await import("./mocks/browser.ts")
    await worker.start({ onUnhandledRequest: "bypass" })
  }

  const { Provider: AuthProvider, publishableKey } = await getClerkProvider()

  const queryClient = new QueryClient()

  function Root() {
    const authProps = publishableKey ? { publishableKey } : {}

    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <SidebarProvider>
            <BrowserRouter>
              <AuthProvider {...authProps}>
                <Routes>
                  <Route path="/" element={<App />}>
                    <Route index element={<HomePage />} />
                    <Route path="station/:stationId" element={<StationOverview />} />
                  </Route>
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </SidebarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    )
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Root />
    </StrictMode>
  )
}

boot()
