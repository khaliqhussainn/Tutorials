// app/profile/layout.tsx - Add dynamic config to profile layout if it exists  
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}