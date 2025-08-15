// app/api/user/course-stats/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all enrollments with course data
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            videos: {
              select: { id: true, duration: true }
            }
          }
        }
      }
    })

    // Calculate completed courses by checking video progress
    let completedCourses = 0
    let inProgressCourses = 0

    for (const enrollment of enrollments) {
      const totalVideos = enrollment.course.videos.length
      
      if (totalVideos === 0) continue

      const completedVideos = await prisma.videoProgress.count({
        where: {
          userId: user.id,
          videoId: { in: enrollment.course.videos.map(v => v.id) },
          completed: true
        }
      })

      const progress = (completedVideos / totalVideos) * 100

      if (progress === 100) {
        completedCourses++
      } else if (progress > 0) {
        inProgressCourses++
      }
    }

    // Get total watch time
    const watchTimeResult = await prisma.videoProgress.aggregate({
      where: { userId: user.id },
      _sum: { watchTime: true }
    })

    // Get favorite courses count
    const favoriteCount = await prisma.favoriteCourse.count({
      where: { userId: user.id }
    })

    return NextResponse.json({
      totalEnrollments: enrollments.length,
      completedCourses,
      inProgressCourses,
      totalWatchTime: watchTimeResult._sum.watchTime || 0,
      favoriteCount,
    })
  } catch (error) {
    console.error('Error fetching user course stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user course stats' },
      { status: 500 }
    )
  }
}
