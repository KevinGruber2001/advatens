import type { ReactNode } from "react"

export function MockClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function MockSignedIn({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function MockSignedOut({ children }: { children: ReactNode }) {
  void children
  return null
}

export function MockUserButton() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#6366f1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      M
    </div>
  )
}

export function useMockAuth() {
  return {
    getToken: () => Promise.resolve("mock-token"),
    isLoaded: true,
    isSignedIn: true,
    userId: "mock-user-001",
    sessionId: "mock-session",
    orgId: null,
    orgRole: null,
    orgSlug: null,
    signOut: () => Promise.resolve(),
  }
}
