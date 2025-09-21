
// app/api/admin/users/export/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Enrollments', 'Created At']
    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        user.id,
        `"${user.name || ''}"`,
        user.email,
        user.role,
        user.isActive ? 'Active' : 'Inactive',
        user._count.enrollments,
        new Date(user.createdAt).toISOString().split('T')[0]
      ].join(','))
    ].join('\n')

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("Error exporting users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
