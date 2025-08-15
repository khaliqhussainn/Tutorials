// app/api/user/enrollments/route.ts
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
            videos: { select: { id: true, duration: true } },
            _count: { select: { enrollments: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Calculate actual progress for each enrollment
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const totalVideos = enrollment.course.videos.length
        
        if (totalVideos === 0) {
          return { ...enrollment, calculatedProgress: 0 }
        }

        const completedVideos = await prisma.videoProgress.count({
          where: {
            userId: user.id,
            videoId: { in: enrollment.course.videos.map(v => v.id) },
            completed: true
          }
        })

        const calculatedProgress = Math.round((completedVideos / totalVideos) * 100)

        return { ...enrollment, calculatedProgress }
      })
    )

    return NextResponse.json(enrollmentsWithProgress)
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}