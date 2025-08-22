// app/api/videos/[videoId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const video = await prisma.video.findUnique({
      where: { id: params.videoId },
      include: {
        tests: {
          orderBy: { order: 'asc' }
        },
        transcript: true,
        course: {
          select: {
            id: true,
            title: true,
            isPublished: true
          }
        },
        section: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Check if user has access to this video's course
    if (!video.course.isPublished && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Course not published' }, { status: 403 })
    }

    // Check if user is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: video.courseId
        }
      }
    })

    if (!enrollment && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not enrolled in course' }, { status: 403 })
    }

    return NextResponse.json(video)

  } catch (error) {
    console.error('Error fetching video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}