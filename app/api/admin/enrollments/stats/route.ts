import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

// app/api/admin/enrollments/stats/route.ts - FIXED VERSION
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [
      totalEnrollments,
      completedEnrollments,
      enrollmentsThisMonth,
      allEnrollments
    ] = await Promise.all([
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { progress: 100 } }),
      prisma.enrollment.count({
        where: {
          enrolledAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.enrollment.findMany({
        select: {
          progress: true,
          enrolledAt: true,
          completedAt: true
        }
      })
    ])

    const activeEnrollments = allEnrollments.filter(e => e.progress > 0 && e.progress < 100).length
    const averageProgress = allEnrollments.length > 0 
      ? Math.round(allEnrollments.reduce((acc, e) => acc + e.progress, 0) / allEnrollments.length)
      : 0

    const completionRate = totalEnrollments > 0 
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0

    // Calculate average completion time in days
    const completedWithTime = allEnrollments.filter(e => e.completedAt && e.enrolledAt)
    const averageCompletionTime = completedWithTime.length > 0
      ? Math.round(
          completedWithTime.reduce((acc, e) => {
            const days = Math.floor(
              (new Date(e.completedAt!).getTime() - new Date(e.enrolledAt).getTime()) / (1000 * 60 * 60 * 24)
            )
            return acc + days
          }, 0) / completedWithTime.length
        )
      : 0

    // Mock revenue calculation (you can implement actual revenue logic)
    const totalRevenue = totalEnrollments * 50 // Assuming $50 per enrollment

    return NextResponse.json({
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      averageProgress,
      totalRevenue,
      enrollmentsThisMonth,
      completionRate,
      averageCompletionTime
    })
  } catch (error) {
    console.error("Error fetching enrollment stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
