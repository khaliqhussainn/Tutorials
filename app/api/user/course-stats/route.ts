// app/api/user/course-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get comprehensive user stats
    const [
      totalEnrollments,
      completedCourses,
      inProgressCourses,
      totalWatchTime,
      favoriteCount,
    ] = await Promise.all([
      // Total enrolled courses
      prisma.enrollment.count({
        where: { userId: user.id },
      }),
      
      // Completed courses
      prisma.enrollment.count({
        where: {
          userId: user.id,
          progress: 100,
        },
      }),
      
      // In progress courses
      prisma.enrollment.count({
        where: {
          userId: user.id,
          progress: {
            gt: 0,
            lt: 100,
          },
        },
      }),
      
      // Total watch time
      prisma.videoProgress.aggregate({
        where: { userId: user.id },
        _sum: {
          watchTime: true,
        },
      }),
      
      // Favorite courses count
      prisma.favoriteCourse.count({
        where: { userId: user.id },
      }),
    ])

    return NextResponse.json({
      totalEnrollments,
      completedCourses,
      inProgressCourses,
      totalWatchTime: totalWatchTime._sum.watchTime || 0,
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