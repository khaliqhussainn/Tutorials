// app/api/user/activity/route.ts
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

    // Get recent enrollments
    const recentEnrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          select: { id: true, title: true, category: true }
        }
      },
      orderBy: { enrolledAt: 'desc' },
      take: 3
    })

    // Get recent progress updates
    const recentProgress = await prisma.videoProgress.findMany({
      where: { 
        userId: user.id,
        completed: true
      },
      include: {
        video: {
          include: {
            course: {
              select: { id: true, title: true, category: true }
            }
          }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: 3
    })

    // Get recent favorites
    const recentFavorites = await prisma.favoriteCourse.findMany({
      where: { userId: user.id },
      include: {
        course: {
          select: { id: true, title: true, category: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    })

    // Format activities
    const activities = [
      ...recentEnrollments.map(enrollment => ({
        id: enrollment.id,
        type: 'enrolled' as const,
        title: `Enrolled in ${enrollment.course.title}`,
        subtitle: enrollment.course.category,
        timestamp: enrollment.enrolledAt.toISOString(),
        courseId: enrollment.courseId
      })),
      ...recentProgress.map(progress => ({
        id: progress.id,
        type: 'completed' as const,
        title: `Completed ${progress.video.title}`,
        subtitle: `in ${progress.video.course.title}`,
        timestamp: progress.completedAt?.toISOString() || progress.updatedAt.toISOString(),
        courseId: progress.video.course.id
      })),
      ...recentFavorites.map(favorite => ({
        id: favorite.id,
        type: 'favorited' as const,
        title: `Added ${favorite.course.title} to favorites`,
        subtitle: favorite.course.category,
        timestamp: favorite.createdAt.toISOString(),
        courseId: favorite.courseId
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching user activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
