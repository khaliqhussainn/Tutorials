// app/api/user/stats/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const [enrollments, completedProgress, totalWatchTime, currentStreak, favoriteCoursesCount] = await Promise.all([
      prisma.enrollment.count({ where: { userId } }),
      prisma.videoProgress.count({ 
        where: { 
          userId, 
          completed: true, 
          testPassed: true 
        } 
      }),
      prisma.videoProgress.aggregate({
        where: { userId },
        _sum: { watchTime: true }
      }),
      prisma.dailyStreak.findFirst({
        where: { userId },
        orderBy: { date: 'desc' }
      }),
      prisma.favoriteCourse.count({ where: { userId } })
    ])

    // Calculate completed courses
    const enrolledCourses = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            videos: { select: { id: true } }
          }
        }
      }
    })

    let completedCourses = 0
    for (const enrollment of enrolledCourses) {
      const totalVideos = enrollment.course.videos.length
      const completedVideos = await prisma.videoProgress.count({
        where: {
          userId,
          videoId: { in: enrollment.course.videos.map((v: { id: any }) => v.id) },
          completed: true,
          testPassed: true
        }
      })
      
      if (totalVideos > 0 && completedVideos === totalVideos) {
        completedCourses++
      }
    }

    return NextResponse.json({
      enrolledCourses: enrollments,
      completedCourses,
      totalWatchTime: Math.floor((totalWatchTime._sum.watchTime || 0) / 60), // Convert to minutes
      currentStreak: currentStreak?.count || 0,
      favoriteCoursesCount
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}