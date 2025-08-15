// app/api/user/dashboard-stats/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, createdAt: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get comprehensive dashboard statistics
    const [
      totalEnrollments,
      totalWatchTime,
      completedVideos,
      favoriteCount,
      thisWeekProgress,
      averageSessionTime
    ] = await Promise.all([
      // Total enrollments
      prisma.enrollment.count({
        where: { userId: user.id }
      }),
      
      // Total watch time
      prisma.videoProgress.aggregate({
        where: { userId: user.id },
        _sum: { watchTime: true }
      }),
      
      // Completed videos
      prisma.videoProgress.count({
        where: { 
          userId: user.id, 
          completed: true 
        }
      }),
      
      // Favorite courses
      prisma.favoriteCourse.count({
        where: { userId: user.id }
      }),
      
      // This week's progress (last 7 days)
      prisma.videoProgress.count({
        where: {
          userId: user.id,
          completed: true,
          completedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Average session time calculation
      prisma.videoProgress.aggregate({
        where: { 
          userId: user.id,
          watchTime: { gt: 0 }
        },
        _avg: { watchTime: true },
        _count: { id: true }
      })
    ])

    // Calculate completed courses
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            videos: { select: { id: true } }
          }
        }
      }
    })

    let completedCourses = 0
    let inProgressCourses = 0

    for (const enrollment of enrollments) {
      const totalVideos = enrollment.course.videos.length
      if (totalVideos === 0) continue

      const completedCourseVideos = await prisma.videoProgress.count({
        where: {
          userId: user.id,
          videoId: { in: enrollment.course.videos.map(v => v.id) },
          completed: true
        }
      })

      const progress = (completedCourseVideos / totalVideos) * 100
      
      if (progress === 100) {
        completedCourses++
      } else if (progress > 0) {
        inProgressCourses++
      }
    }

    // Calculate learning streak (simplified version)
    const learningStreak = await calculateLearningStreak(user.id)

    return NextResponse.json({
      totalEnrollments,
      completedCourses,
      inProgressCourses,
      totalWatchTime: totalWatchTime._sum.watchTime || 0,
      completedVideos,
      favoriteCount,
      thisWeekProgress,
      averageSessionTime: Math.round(averageSessionTime._avg.watchTime || 0),
      learningStreak,
      joinedDate: user.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function calculateLearningStreak(userId: string): Promise<number> {
  try {
    // Get all completed video dates
    const completedVideos = await prisma.videoProgress.findMany({
      where: {
        userId,
        completed: true,
        completedAt: { not: null }
      },
      select: {
        completedAt: true
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    if (completedVideos.length === 0) return 0

    // Group by date and calculate consecutive days
    const uniqueDates = new Set(
      completedVideos
        .map(v => v.completedAt?.toDateString())
        .filter(Boolean)
    )

    const sortedDates = Array.from(uniqueDates)
      .filter((dateStr): dateStr is string => typeof dateStr === 'string')
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime())

    let streak = 0
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (const date of sortedDates) {
      const dayDiff = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dayDiff === streak || (streak === 0 && dayDiff <= 1)) {
        streak++
        currentDate = new Date(date)
      } else {
        break
      }
    }

    return streak
  } catch (error) {
    console.error('Error calculating learning streak:', error)
    return 0
  }
}
