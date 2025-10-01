// ===== app/api/admin/users/stats/route.ts =====
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [
      totalUsers,
      activeUsers,
      adminUsers,
      newUsersThisMonth,
      totalEnrollments,
      completedEnrollments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { progress: 100 } })
    ])

    const avgCompletionRate = totalEnrollments > 0 
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0

    return NextResponse.json({
      totalUsers,
      activeUsers,
      adminUsers,
      newUsersThisMonth,
      totalEnrollments,
      avgCompletionRate
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
