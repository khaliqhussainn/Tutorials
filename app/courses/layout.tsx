// app/courses/layout.tsx - Server component layout with proper exports
import { Metadata } from 'next'

// Force dynamic rendering - these exports are valid for layouts
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Courses | EduPlatform',
  description: 'Browse our comprehensive library of expert-led courses. From beginner-friendly tutorials to advanced masterclasses.',
}

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}