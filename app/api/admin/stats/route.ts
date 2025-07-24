// app/api/admin/stats/route.ts
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

    const [totalUsers, totalCourses, totalVideos, totalEnrollments, recentEnrollments] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.video.count(),
      prisma.enrollment.count(),
      prisma.enrollment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } }
        }
      })
    ])

    return NextResponse.json({
      totalUsers,
      totalCourses,
      totalVideos,
      totalEnrollments,
      recentEnrollments
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
