// app/api/user/progress/route.ts
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

    // Get user's course progress
    const userProgress = await prisma.enrollment.findMany({
      where: {
        userId: user.id,
        progress: {
          gt: 0, // Only courses with some progress
          lt: 100, // But not completed courses
        },
      },
      include: {
        course: {
          include: {
            videos: {
              select: {
                duration: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc', // Most recently updated first
      },
    })

    // Transform the data to match the expected format
    const formattedProgress = userProgress.map((enrollment) => ({
      courseId: enrollment.courseId,
      progress: enrollment.progress,
      lastWatched: enrollment.updatedAt.toISOString(),
      course: enrollment.course,
    }))

    return NextResponse.json(formattedProgress)
  } catch (error) {
    console.error('Error fetching user progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user progress' },
      { status: 500 }
    )
  }
}