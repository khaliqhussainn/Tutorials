
// app/api/user/stats/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, createdAt: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userId = user.id

    // Get comprehensive user statistics
    const [
      enrollments,
      completedProgress,
      totalWatchTime,
      currentStreak,
      favoriteCoursesCount,
      thisWeekProgress,
      completedVideos
    ] = await Promise.all([
      // Total enrollments
      prisma.enrollment.count({ 
        where: { userId } 
      }),
      
      // Completed video progress (videos that are actually finished)
      prisma.videoProgress.count({ 
        where: { 
          userId, 
          completed: true
        } 
      }),
      
      // Total watch time
      prisma.videoProgress.aggregate({
        where: { userId },
        _sum: { watchTime: true }
      }),
      
      // Current learning streak
      prisma.dailyStreak.findFirst({
        where: { userId },
        orderBy: { date: 'desc' }
      }),
      
      // Favorite courses count
      prisma.favoriteCourse.count({ 
        where: { userId } 
      }),

      // This week's progress (last 7 days)
      prisma.videoProgress.count({
        where: {
          userId,
          completed: true,
          completedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Total completed videos
      prisma.videoProgress.count({
        where: {
          userId,
          completed: true
        }
      })
    ])

    // Calculate completed courses by checking enrollment progress
    const enrolledCourses = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            videos: { select: { id: true } },
            sections: {
              include: {
                videos: { select: { id: true } }
              }
            }
          }
        }
      }
    })

    let completedCourses = 0
    let inProgressCourses = 0

    for (const enrollment of enrolledCourses) {
      // Get all videos from both sections and direct course videos
      const allVideoIds = [
        ...enrollment.course.videos.map(v => v.id),
        ...enrollment.course.sections.flatMap(section => 
          section.videos.map(v => v.id)
        )
      ]

      const totalVideos = allVideoIds.length

      if (totalVideos === 0) continue

      // Count completed videos for this course
      const completedCourseVideos = await prisma.videoProgress.count({
        where: {
          userId,
          videoId: { in: allVideoIds },
          completed: true
        }
      })

      const courseProgress = totalVideos > 0 ? (completedCourseVideos / totalVideos) * 100 : 0

      if (courseProgress === 100) {
        completedCourses++
      } else if (courseProgress > 0) {
        inProgressCourses++
      }
    }

    // Calculate average session time
    const sessionStats = await prisma.videoProgress.aggregate({
      where: { 
        userId,
        watchTime: { gt: 0 }
      },
      _avg: { watchTime: true },
      _count: { id: true }
    })

    // Recent achievements (last 30 days)
    const recentAchievements = await prisma.videoProgress.count({
      where: {
        userId,
        completed: true,
        completedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    })

    return NextResponse.json({
      // Basic stats
      enrolledCourses: enrollments,
      completedCourses,
      inProgressCourses,
      totalWatchTime: Math.floor((totalWatchTime._sum.watchTime || 0) / 60), // Convert to minutes
      completedVideos,
      favoriteCoursesCount,
      
      // Activity stats
      currentStreak: currentStreak?.count || 0,
      thisWeekProgress,
      recentAchievements,
      
      // Session stats
      averageSessionTime: Math.round(sessionStats._avg.watchTime || 0),
      totalSessions: sessionStats._count,
      
      // Profile info
      joinedDate: user.createdAt.toISOString(),
      
      // Calculated metrics
      completionRate: enrollments > 0 ? Math.round((completedCourses / enrollments) * 100) : 0,
      weeklyGoalProgress: Math.min(thisWeekProgress, 7), // Assuming goal of 7 videos per week
      
      // Learning insights
      totalLearningDays: currentStreak?.count || 0,
      averageProgressPerCourse: enrollments > 0 
        ? Math.round(((completedCourses * 100 + inProgressCourses * 50) / enrollments))
        : 0
    })
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}