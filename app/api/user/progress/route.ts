// app/api/user/progress/route.ts
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

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            videos: {
              select: { id: true, title: true, duration: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Calculate progress for each enrollment
    const progressData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const totalVideos = enrollment.course.videos.length
        
        if (totalVideos === 0) {
          return {
            courseId: enrollment.courseId,
            progress: 0,
            lastWatched: enrollment.updatedAt.toISOString(),
            course: enrollment.course
          }
        }

        const completedVideos = await prisma.videoProgress.count({
          where: {
            userId: user.id,
            videoId: { in: enrollment.course.videos.map(v => v.id) },
            completed: true
          }
        })

        const progress = Math.round((completedVideos / totalVideos) * 100)

        return {
          courseId: enrollment.courseId,
          progress,
          lastWatched: enrollment.updatedAt.toISOString(),
          course: enrollment.course
        }
      })
    )

    // Filter out completed courses for progress view
    const inProgressCourses = progressData.filter(item => 
      item.progress > 0 && item.progress < 100
    )

    return NextResponse.json(inProgressCourses)
  } catch (error) {
    console.error('Error fetching user progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user progress' },
      { status: 500 }
    )
  }
}
