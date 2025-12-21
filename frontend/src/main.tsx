import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { ClerkProvider } from "@clerk/react-router"
import { BrowserRouter, Route, Routes } from "react-router"
import { ThemeProvider } from "./components/ThemeProvider.tsx"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { UserProfile } from "@clerk/clerk-react"
import CreateOrchardPage from "./pages/CreateOrchardPage.tsx"
import CreateStationPage from "./pages/CreateStationPage.tsx"
import { SidebarProvider } from "./components/ui/sidebar.tsx"
import HomePage from "./components/Homepage.tsx"

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Add your CLERK publish key")
}

function Root() {
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <SidebarProvider>
          <BrowserRouter>
            <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
              <Routes>
                <Route path="/" element={<App />}>
                  <Route index element={<HomePage />} />
                  <Route
                    path="orchard/create"
                    element={<CreateOrchardPage />}
                  />
                  <Route
                    path="orchard/:orchardId/station/create"
                    element={<CreateStationPage />}
                  />
                </Route>
              </Routes>
            </ClerkProvider>
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
