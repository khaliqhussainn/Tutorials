// components/providers/AuthProvider.tsx - ENHANCED VERSION
'use client'

import { SessionProvider } from 'next-auth/react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Refetch session every 5 minutes to ensure fresh data
      refetchInterval={5 * 60}
      // Refetch session when window gains focus
      refetchOnWindowFocus={true}
      // Refetch when network comes back online
      refetchWhenOffline={false}
      // Base path for NextAuth (useful if you have a custom setup)
      basePath="/api/auth"
    >
      {children}
    </SessionProvider>
  )
}