// app/courses/layout.tsx - Add dynamic config to courses layout if it exists
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}