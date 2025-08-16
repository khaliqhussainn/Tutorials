// app/profile/layout.tsx - Server component layout
import { Metadata } from 'next'

// Force dynamic rendering - these exports are valid for layouts
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Profile | EduPlatform',
  description: 'Manage your profile and view your learning progress.',
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}